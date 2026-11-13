import { after, NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { atender, type MensagemKapso } from "@/server/ia/atender";
import { faxinaDaIa } from "@/server/ia/faxina";
import { transcrever, transcricaoLigada } from "@/server/ia/transcrever";
import { baixarMidia } from "@/server/ia/uazapi";

/**
 * O que a uazapi avisa quando chega mensagem no WhatsApp do restaurante.
 *
 * Esta rota é só um tradutor: pega o evento `messages` da uazapi, monta o
 * formato que o `atender()` já entende e sai da frente. As travas de
 * silêncio, o teto por hora, o histórico e os pedidos continuam num lugar
 * só, sem saber que o provedor mudou.
 *
 * **Por que existe um terceiro provedor.** A Kapso é o caminho oficial,
 * pela Meta, que recusa o envio desta conta para números brasileiros
 * (erro 130497). A Z-API resolveu isso por QR code, mas cobra por canal
 * -- cerca de R$ 100, o preço do plano Essencial inteiro. A uazapi cobra
 * por servidor: até 100 números por R$ 138. Além do preço, há a lição de
 * 11/11/2026: o trial da Z-API expirou e a Lia ficou um dia muda, porque
 * não havia para onde ir.
 *
 * O payload é mais limpo que o da Z-API, e isso importa mais do que
 * parece. Lá, descobrir se uma mensagem vinha de grupo custou três
 * correções erradas: o campo não era documentado, morava dentro de
 * `external_information` e às vezes não vinha de jeito nenhum. Aqui
 * `isGroup` é um booleano no lugar óbvio, e a uazapi ainda descarta
 * mensagem de grupo antes de entregar, pelo filtro que `apontarWebhook`
 * configura.
 *
 *     { EventType: "messages", token, owner, instanceName,
 *       message: { id, messageid, chatid, sender, senderName, fromMe,
 *                  wasSentByApi, isGroup, messageType, text,
 *                  messageTimestamp } }
 *
 * Documentação: https://docs.uazapi.com/webhook/messages
 */

/**
 * Idade máxima de uma mensagem para a IA ainda responder, em minutos.
 *
 * O canal é WhatsApp Web. Quando ele cai e volta -- e ele cai --, a
 * sessão ressincroniza e o provedor entrega mensagens que já estavam
 * lá. Para esta rota cada uma parece ter acabado de chegar, e a IA
 * responderia todas de uma vez: do lado de quem recebe, ela escreveu do
 * nada, horas depois do assunto. Num número que também é pessoal, isso
 * é a IA puxando conversa com quem nunca foi cliente -- que é
 * exatamente o que faz o WhatsApp derrubar um número.
 *
 * A trava de evento repetido não pega isto: na ressincronização os ids
 * vêm novos.
 *
 * A janela é generosa de propósito. Mensagem legítima também atrasa, e
 * responder cinco minutos depois ainda serve ao cliente. Meia hora
 * depois, não serve a ninguém.
 */
const IDADE_MAXIMA_MIN = 30;

export const runtime = "nodejs";
export const maxDuration = 300;

type MensagemUazapi = {
  id?: string;
  messageid?: string;
  chatid?: string;
  sender?: string;
  senderName?: string;
  fromMe?: boolean;
  wasSentByApi?: boolean;
  isGroup?: boolean;
  messageType?: string;
  text?: string;
  messageTimestamp?: number;
};

type AvisoUazapi = {
  EventType?: string;
  /** o token da instância: é a credencial e é quem diz de qual restaurante é */
  token?: string;
  owner?: string;
  instanceName?: string;
  message?: MensagemUazapi;
};

/** só dígitos */
const soDigitos = (v: string) => v.replace(/\D/g, "");

/** a parte de antes do @ num JID: `5592999999999@s.whatsapp.net` */
const antesDoArroba = (v: string) => v.split("@")[0] ?? "";

/**
 * Isto é telefone, ou é outra coisa com cara de número?
 *
 * E.164 não passa de 15 dígitos. Os identificadores de grupo do WhatsApp
 * têm 18 (`120363043211234567`) ou 23 (o formato antigo, com hífen), e os
 * `@lid` são ainda maiores. O comprimento separa os dois sem ambiguidade.
 *
 * A faixa de baixo começa em 10 porque telefone com DDI mais curto que
 * isso não existe no uso real deste sistema.
 */
const ehTelefone = (v: string) => v.length >= 10 && v.length <= 15;

/**
 * O telefone de quem escreveu.
 *
 * O WhatsApp vem trocando o remetente por um `@lid` -- um identificador
 * que **não é o telefone**. Quando isso acontece, o `sender` não serve
 * para responder nem para achar os pedidos daquele cliente, e a conversa
 * se parte em duas chaves diferentes no banco: foi o que fez a IA
 * responder por cima do dono em 11/11/2026.
 *
 * Numa conversa individual o `chatid` é o JID do contato, e ele continua
 * trazendo o número. Por isso ele vem primeiro, com o `sender` atrás
 * para o caso de a conversa vir identificada só de um lado.
 */
function telefoneDe(m: MensagemUazapi) {
  const doChat = soDigitos(antesDoArroba(m.chatid ?? ""));
  if (ehTelefone(doChat)) return doChat;
  const doRemetente = soDigitos(antesDoArroba(m.sender ?? ""));
  if (ehTelefone(doRemetente)) return doRemetente;
  return null;
}

/** o formato do identificador, sem expor o número, para o log */
const forma = (v?: string) => {
  if (!v) return "(vazio)";
  const sufixo = v.includes("@") ? v.slice(v.indexOf("@")) : "";
  return `${soDigitos(antesDoArroba(v)).length}d${sufixo}`;
};

export async function POST(req: NextRequest) {
  let aviso: AvisoUazapi;
  try {
    aviso = (await req.json()) as AvisoUazapi;
  } catch (erro) {
    console.error("[uazapi/webhook] corpo ilegível:", erro);
    // 200 de propósito: um erro aqui faz a uazapi contar falha e, depois
    // de algumas, suspender a entrega da instância inteira.
    return NextResponse.json({ ok: true, ignorado: "ilegivel" });
  }

  const evento = aviso.EventType ?? "(sem tipo)";

  // Mudou o estado da conexão: não é mensagem, mas é o que o dono
  // precisa ver quando a Lia "parou do nada". Fica no log e sai.
  if (evento === "connection") {
    console.info(`[uazapi/webhook] conexão: instância="${aviso.instanceName ?? "?"}"`);
    return NextResponse.json({ ok: true });
  }

  if (evento !== "messages") {
    return NextResponse.json({ ok: true, ignorado: evento });
  }

  const m = aviso.message;
  const token = aviso.token?.trim();

  // Sem token não há como saber de quem é a mensagem -- nem como provar
  // que o aviso é legítimo. Esta rota é pública: qualquer um pode mandar
  // um JSON para ela, e o token é o que separa um aviso da uazapi de um
  // que alguém inventou.
  if (!token || !m) {
    console.warn(
      `[uazapi/webhook] aviso sem token ou sem mensagem · token=${token ? "sim" : "NÃO"}` +
        ` mensagem=${m ? "sim" : "não"}`,
    );
    return NextResponse.json({ ok: true, ignorado: "incompleto" });
  }

  // Grupo não é atendimento.
  //
  // A uazapi já descarta isto antes de entregar, pelo `excludeMessages`
  // que `apontarWebhook` configura. A trava fica aqui mesmo assim:
  // configuração no provedor some sem aviso -- basta alguém recriar a
  // instância pelo painel --, e o preço do erro é alto. Em 11/11/2026,
  // na Z-API, oito desconhecidos de dois grupos receberam as boas-vindas
  // do restaurante de madrugada; um tirou o número do grupo e outro
  // reclamou. É assim que um número é banido.
  //
  // Três marcas, e qualquer uma basta: o booleano, o sufixo do JID e o
  // comprimento do identificador.
  const chat = m.chatid ?? "";
  const deGrupo =
    m.isGroup === true ||
    chat.endsWith("@g.us") ||
    chat.endsWith("@newsletter") ||
    chat.endsWith("@broadcast") ||
    !ehTelefone(soDigitos(antesDoArroba(chat)));
  if (deGrupo) {
    console.info(
      `[uazapi/webhook] de grupo, ignorado · chat=${forma(m.chatid)} isGroup=${m.isGroup ?? "?"}`,
    );
    return NextResponse.json({ ok: true, ignorado: "grupo" });
  }

  const telefone = telefoneDe(m);
  const daCasa = m.fromMe === true;
  const tipo = (m.messageType ?? "").toLowerCase();
  const texto = m.text ?? "";

  console.info(
    `[uazapi/webhook] ${daCasa ? "saiu" : "chegou"} em …${telefone?.slice(-4) ?? "????"}` +
      ` (${tipo || "sem tipo"}) · chat=${forma(m.chatid)} de=${forma(m.sender)}` +
      ` api=${m.wasSentByApi ? "sim" : "não"}`,
  );

  if (!telefone) {
    // O payload inteiro vai junto só neste caso: sem telefone não há o
    // que fazer, e é o único jeito de descobrir por que não veio.
    console.warn(`[uazapi/webhook] sem telefone · ${JSON.stringify(m).slice(0, 400)}`);
    return NextResponse.json({ ok: true, ignorado: "sem-telefone" });
  }

  // A própria Lia falando.
  //
  // O filtro `wasSentByApi` no provedor já tira isto, e a trava fica
  // pelo mesmo motivo da de grupo. Sem ela, a IA lê a própria resposta
  // como se fosse uma pessoa do restaurante respondendo pelo celular e
  // se cala por 30 minutos -- ou, pior, responde a si mesma.
  if (daCasa && m.wasSentByApi === true) {
    return NextResponse.json({ ok: true, ignorado: "proprio-envio" });
  }

  // Mensagem velha não é respondida. O porquê está na constante.
  const quando = m.messageTimestamp;
  if (typeof quando === "number" && quando > 0) {
    const ms = quando < 1e12 ? quando * 1000 : quando;
    const minutos = (Date.now() - ms) / 60_000;
    if (minutos > IDADE_MAXIMA_MIN) {
      console.info(
        `[uazapi/webhook] mensagem de ${Math.round(minutos)} min atrás, ignorada · …${telefone.slice(-4)}`,
      );
      return NextResponse.json({ ok: true, ignorado: "antiga" });
    }
  }

  // IA desligada: sai aqui, sem escrever nada.
  //
  // O atendimento confere isto de novo lá dentro, mas só depois da trava
  // de repetido logo abaixo -- que é uma **escrita** no banco. Num número
  // que recebe divulgação o dia todo, com a IA desligada, seriam centenas
  // de escritas por nada. Uma leitura pequena no lugar de uma escrita.
  //
  // Serve também de autenticação: token que não existe não acha ninguém.
  const ligada = await db.atendenteIa.findUnique({
    where: { uazapiToken: token },
    select: { ativo: true },
  });
  if (!ligada) {
    console.warn("[uazapi/webhook] token não confere com nenhum restaurante");
    return NextResponse.json({ ok: true, ignorado: "desconhecido" });
  }
  if (!ligada.ativo) return NextResponse.json({ ok: true, ignorado: "desligada" });

  // Cada aviso é tratado uma vez só.
  //
  // O provedor reenvia o que achar que não foi entregue, e sem isto a
  // mesma mensagem entraria duas vezes no histórico -- e seria respondida
  // duas vezes. Sem id, deixa passar: perder uma mensagem é pior do que
  // repetir uma.
  const chave = m.messageid ?? m.id;
  if (chave) {
    try {
      const { count } = await db.iaEventoProcessado.createMany({
        data: [{ chave: `uazapi:${chave}` }],
        skipDuplicates: true,
      });
      if (count === 0) return NextResponse.json({ ok: true, repetido: true });
    } catch (erro) {
      // Banco fora do ar não pode virar falha de webhook: o provedor
      // conta e suspende a entrega. O risco de pular a trava é responder
      // duas vezes -- incômodo, e muito menos grave que emudecer.
      console.error("[uazapi/webhook] falha ao marcar o evento como visto:", erro);
    }
  }

  // o formato que o atender() já fala; `uazapi_token` é o que diz a ele
  // para achar o restaurante e responder por este mesmo caminho
  const paraAtender: MensagemKapso = {
    uazapi_token: token,
    // Só de quem escreve de fora: numa mensagem que sai, este nome é o do
    // próprio restaurante, e passá-lo adiante faria a IA chamar o cliente
    // pelo nome da loja.
    push_name: daCasa ? undefined : m.senderName?.trim() || undefined,
    message: {
      id: chave,
      // o atender distingue texto de mídia por este campo
      type: tipo === "conversation" || tipo === "extendedtextmessage" || tipo === "text"
        ? "text"
        : tipo,
      from: telefone,
      text: { body: texto },
      kapso: {
        direction: daCasa ? "outbound" : "inbound",
        // Saiu do aparelho do restaurante e não foi a própria IA: é uma
        // pessoa respondendo, e é isso que faz a IA ficar quieta por 30
        // minutos naquela conversa.
        origin: daCasa && !m.wasSentByApi ? "business_app" : "api",
      },
    },
    conversation: { phone_number: telefone },
  };

  // Responde 200 na hora e pensa depois.
  //
  // A documentação da uazapi é explícita: webhook lento ocupa a fila de
  // entrega da instância e atrasa os próximos eventos, que podem acabar
  // descartados. A IA leva alguns segundos -- mais desde que pensa antes
  // de responder --, e segurar a conexão até ela terminar faria a mesma
  // mensagem chegar duas vezes.
  after(async () => {
    const comecou = Date.now();
    try {
      await ouvirOAudio(paraAtender, token, chave, tipo);
      await atender(paraAtender);
    } catch (erro) {
      // nada daqui volta para a uazapi: o 200 já foi. Fica no log, e a
      // conversa fica com o dono, que a vê no celular.
      console.error("[uazapi/webhook] falha ao atender:", erro);
    }
    console.info(`[uazapi/webhook] atendimento em ${Date.now() - comecou}ms`);
    // depois de responder, e só de vez em quando: ver o arquivo
    await faxinaDaIa();
  });

  return NextResponse.json({ ok: true });
}

/**
 * A uazapi às vezes bate aqui só para ver se o endereço responde.
 *
 * Sem este handler o Next devolve 405, que para ela é falha igual às
 * outras -- e falha repetida faz a entrega da instância ser suspensa.
 */
export async function GET() {
  return NextResponse.json({ ok: true, webhook: "uazapi" });
}

/** os tipos que a uazapi usa para mensagem de voz */
const EH_AUDIO = new Set(["audio", "voice", "ptt", "audiomessage", "pttmessage"]);

/**
 * O áudio do cliente, virado texto antes de a IA ler.
 *
 * Muda o `paraAtender` no lugar: dali para a frente o atendimento trata
 * aquilo como uma mensagem escrita comum, e nada mais no caminho precisa
 * saber que veio de um áudio.
 *
 * **O prefixo 🎤 fica no texto de propósito.** Ele diz duas coisas: ao
 * dono, lendo a conversa no painel depois, que aquilo foi falado e não
 * digitado; e à própria IA, que está lendo uma transcrição -- e
 * transcrição erra nome de prato, troca número e perde pontuação, então
 * é melhor ela perguntar do que adivinhar.
 *
 * Falhou? Não faz nada, e o atendimento segue para o caminho de sempre:
 * ela pede por escrito. Um áudio sem transcrição é o que já era antes.
 */
async function ouvirOAudio(
  paraAtender: MensagemKapso,
  token: string,
  messageId: string | undefined,
  tipo: string,
) {
  if (!EH_AUDIO.has(tipo) || !messageId || !transcricaoLigada()) return;

  const atendente = await db.atendenteIa.findUnique({
    where: { uazapiToken: token },
    select: { uazapiBaseUrl: true, uazapiToken: true },
  });
  if (!atendente?.uazapiBaseUrl || !atendente.uazapiToken) return;

  const midia = await baixarMidia(
    { baseUrl: atendente.uazapiBaseUrl, token: atendente.uazapiToken },
    messageId,
  );
  if (!midia) return;

  const texto = await transcrever(midia.url);
  if (!texto) return;

  paraAtender.message!.type = "text";
  paraAtender.message!.text = { body: `🎤 ${texto}` };
}
