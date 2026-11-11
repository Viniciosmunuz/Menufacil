import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";

import { after, NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { atender, type MensagemKapso } from "@/server/ia/atender";

/**
 * O que a Z-API avisa quando chega mensagem no WhatsApp do restaurante.
 *
 * Esta rota é só um tradutor: ela pega o envelope `NEW_MESSAGE` da Z-API,
 * monta o formato que o `atender()` já entende e sai da frente. Todo o
 * resto -- as travas de silêncio, o teto por hora, o histórico, os
 * pedidos -- continua no mesmo lugar, sem saber que o provedor mudou.
 *
 * **Por que a Z-API e não a Kapso:** a conta de negócio está proibida
 * pela Meta de mandar mensagem para números brasileiros (erro 130497).
 * Receber passava, enviar não, e a recusa era calada. A Z-API conecta o
 * número por QR code, sem Meta no meio.
 *
 * O payload desta versão (Omni) é diferente do da Z-API clássica:
 *
 *     { messageEventType: "NEW_MESSAGE",
 *       message: { _id, channel_id, metadata: { from_me }, sender, recipient,
 *                  contents: [{ type: "TEXT", message }] } }
 *
 * Documentação: https://developer.omni.z-api.io/webhooks/payloads
 */

export const runtime = "nodejs";
export const maxDuration = 300;

type Conteudo = { type?: string; "@class"?: string; message?: string };
type AvisoOmni = {
  messageEventType?: string;
  message?: {
    _id?: string;
    channel_id?: string;
    metadata?: { from_me?: boolean; from_api?: boolean; middleware?: string };
    sender?: { identifier?: string; name?: string };
    recipient?: { identifier?: string; name?: string };
    contents?: Conteudo[];
  };
};

/** só dígitos: o identifier vem com DDI, mas às vezes com sinal ou espaço */
const soDigitos = (v: string) => v.replace(/\D/g, "");

/**
 * O identificador é de um grupo, e não de uma pessoa?
 *
 * A Z-API é o WhatsApp Web do aparelho: ela entrega tudo o que chega
 * nele, e grupo chega junto. Sem esta trava, quem fala no grupo vira
 * "cliente novo" -- porque numa mensagem de grupo o `sender` é a pessoa
 * que digitou, e não o grupo -- e a IA abre conversa no privado dela.
 *
 * Aconteceu em 11/11/2026: oito desconhecidos de dois grupos receberam as
 * boas-vindas do restaurante de madrugada, um deles tirou o número do
 * grupo e outro reclamou do incômodo. É assim que um número é banido.
 *
 * O WhatsApp nomeia grupo de três jeitos, e nenhum deles é telefone:
 * `...@g.us`, o formato antigo `5511999999999-1699999999` e o atual
 * `120363043211234567`, de 18 dígitos. Telefone com DDI não passa de 15
 * (E.164), então o comprimento separa os dois sem ambiguidade -- e os 23
 * dígitos do formato antigo caem nessa mesma conta.
 *
 * **Pelo comprimento, e não pelo hífen.** O hífen do formato antigo era
 * tentador e está errado: `+55 21 96412-2088` é um telefone escrito à
 * mão, e calar um cliente de verdade é pior do que o problema que esta
 * função resolve.
 */
const ehGrupo = (v?: string) => {
  if (!v) return false;
  return /@g\.us/i.test(v) || soDigitos(v).length > 15;
};

/** o formato de um identificador sem revelá-lo: os 4 últimos e o comprimento */
const forma = (v?: string) =>
  v ? `…${soDigitos(v).slice(-4)}(${soDigitos(v).length})` : "(vazio)";

/**
 * O corpo da Z-API vem comprimido quando é grande.
 *
 * E vem sem avisar: `content-type: application/json`, texto nenhum de
 * aviso, e os bytes começando em `1f 8b` -- gzip puro. O `request.text()`
 * não descomprime corpo que entra (só o `fetch()` faz isso na resposta que
 * sai), então o JSON.parse quebrava e a mensagem ia para o lixo.
 *
 * **Custou uma semana de "a IA não entende endereço".** Ela comprime pelo
 * tamanho: "Entrega" e "Vai ser no pix" chegavam limpos, e a mensagem com
 * a rua, o número e o bairro -- a única que importava -- era a única que
 * sumia. De fora parecia burrice da IA; era o corpo nunca ter sido lido.
 *
 * Pelos bytes e não pelo cabeçalho: `content-encoding` nem sempre vem, e
 * a assinatura não mente.
 */
function descomprimir(bytes: Buffer, encoding: string | null) {
  if (bytes.length > 1 && bytes[0] === 0x1f && bytes[1] === 0x8b) return gunzipSync(bytes);
  if (bytes.length > 1 && bytes[0] === 0x78) return inflateSync(bytes);
  if (encoding?.includes("gzip")) return gunzipSync(bytes);
  if (encoding?.includes("br")) return brotliDecompressSync(bytes);
  if (encoding?.includes("deflate")) return inflateSync(bytes);
  return bytes;
}

export async function POST(request: NextRequest) {
  // Nada daqui devolve erro para a Z-API.
  //
  // O 400 que estava aqui custou caro: ela conta falha seguida, manda
  // e-mail de "seu webhook continua falhando" e acaba suspendendo a
  // entrega -- e aí mensagem de cliente para de chegar, sem nada no nosso
  // log, porque a chamada nem acontece. Dez falhas seguidas em 10/11/2026.
  //
  // O que não dá para ler vira registro e 200. Entender o corpo é problema
  // nosso; para ela, recebemos.
  let aviso: AvisoOmni;
  const bytes = Buffer.from(await request.arrayBuffer());
  let cru: string;
  try {
    cru = descomprimir(bytes, request.headers.get("content-encoding")).toString("utf8");
  } catch (erro) {
    console.error("[zapi/webhook] falha ao descomprimir o corpo:", erro);
    cru = bytes.toString("utf8");
  }
  try {
    aviso = JSON.parse(cru) as AvisoOmni;
  } catch {
    // o começo em hexadecimal: é o que diz se veio comprimido num formato
    // que ainda não conheço, e aí a assinatura está nos primeiros bytes
    console.warn(
      `[zapi/webhook] corpo que não é JSON (${request.headers.get("content-type") ?? "sem content-type"}, encoding=${request.headers.get("content-encoding") ?? "nenhum"}, ${bytes.length} bytes, começa em ${bytes.subarray(0, 8).toString("hex")}): ${cru.slice(0, 300)}`,
    );
    return NextResponse.json({ ok: true, ignorado: "corpo ilegível" });
  }
  if (!aviso || typeof aviso !== "object") {
    console.warn(`[zapi/webhook] corpo JSON que não é objeto: ${cru.slice(0, 200)}`);
    return NextResponse.json({ ok: true, ignorado: "corpo inesperado" });
  }

  const m = aviso.message;

  // Registra TUDO que chega, antes de qualquer filtro.
  //
  // A primeira versão saía calada quando o envelope não era o esperado, e
  // o resultado no log era idêntico a "a Z-API nunca chamou" -- o mesmo
  // buraco que escondeu o 130497 da Meta por dias. Aqui o que entra
  // aparece, mesmo (principalmente) quando não é o que eu previa.
  const chaves = Object.keys(aviso).join(",");
  console.info(
    `[zapi/webhook] evento=${aviso.messageEventType ?? "(sem messageEventType)"} chaves=${chaves}`,
  );

  // O que manda é ter uma mensagem com canal, e não o nome do evento.
  //
  // A documentação promete um envelope `messageEventType: "NEW_MESSAGE"`.
  // O que a Z-API envia de verdade não tem esse campo -- só `message` --,
  // e exigi-lo fazia o webhook descartar justamente as mensagens dos
  // clientes. Confirmado em 10/11/2026, com o payload no log.
  if (!m?.channel_id) {
    // status de entrega, conexão e afins não interessam à IA -- mas o
    // corpo vai para o log, porque é a única forma de descobrir o formato
    // real de um evento que a documentação não mostra.
    console.info(`[zapi/webhook] ignorado. corpo: ${JSON.stringify(aviso).slice(0, 700)}`);
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const daCasa = Boolean(m.metadata?.from_me);

  // Quem é o cliente: numa mensagem recebida é quem enviou; numa enviada
  // pelo restaurante é quem recebeu. É o mesmo contato dos dois lados da
  // conversa, e é por ele que o histórico se organiza.
  //
  // A documentação não traz exemplo de mensagem recebida -- o payload de
  // exemplo é de uma saída. Por isso o registro cru abaixo: a primeira
  // mensagem de verdade confirma (ou desmente) esta leitura.
  const bruto = daCasa ? m.recipient?.identifier : m.sender?.identifier;
  const telefone = bruto ? soDigitos(bruto) : "";

  // O tipo do conteúdo vem de dois jeitos.
  //
  // A documentação mostra `type: "TEXT"`; o que chega de verdade traz
  // `"@class": ".TextContent"` (e `.ImageContent`, `.AudioContent` e por
  // aí). Ler só um dos dois deixava o texto vazio, e mensagem sem texto a
  // IA não responde -- o erro ficava parecendo "ela não quis responder".
  const conteudo = m.contents?.[0];
  const classe = conteudo?.["@class"]?.replace(/^\.|Content$/g, "").toLowerCase();
  const tipo = (conteudo?.type ?? classe ?? "text").toLowerCase();
  const texto =
    m.contents?.find((c) => typeof c.message === "string" && c.message.trim())?.message ?? "";

  // Recibo de entrega não é mensagem.
  //
  // A Z-API manda `.DeliveryCallback` e `.MessageStatusCallback` pelo
  // mesmo webhook das mensagens, e eles vêm com `from_me: true` -- quer
  // dizer "a sua mensagem foi entregue", não "alguém digitou algo". Sem
  // este filtro, cada resposta da IA gerava dois recibos, o atendimento
  // os lia como o dono respondendo pelo celular e acionava o silêncio de
  // 30 minutos. Resultado: a IA respondia a primeira mensagem e emudecia
  // pela meia hora seguinte.
  //
  // Sai antes do registro, e não depois: cada resposta da IA gera uma
  // dezena deles, e com o payload inteiro no log o que importa -- a
  // mensagem do cliente -- fica soterrado.
  if (tipo.includes("callback") || tipo.includes("status")) {
    return NextResponse.json({ ok: true, ignorado: "recibo" });
  }

  // Grupo não é atendimento.
  //
  // Os dois lados são conferidos porque ainda não sabemos em qual campo a
  // Z-API põe o grupo: a documentação não traz exemplo de mensagem
  // recebida, e o que ela promete já se mostrou diferente do que envia
  // duas vezes -- o `messageEventType` que não existe e o corpo em gzip
  // que ela não anuncia. Ficar calado à toa não custa nada; responder um
  // estranho custa o número.
  const de = m.sender?.identifier;
  const para = m.recipient?.identifier;
  // os nomes são de quem escreve para o restaurante, então ficam cortados:
  // servem para reconhecer um grupo, não para virar agenda
  const corta = (v?: string) => (v ? v.slice(0, 40) : "(sem nome)");
  if (ehGrupo(de) || ehGrupo(para)) {
    // o nome vai junto: é o que confirma que o que a trava barrou era
    // mesmo um grupo, e não um número comprido que eu entendi mal
    console.info(
      `[zapi/webhook] de grupo, ignorado · de=${forma(de)} "${corta(m.sender?.name)}" para=${forma(para)} "${corta(m.recipient?.name)}"`,
    );
    return NextResponse.json({ ok: true, ignorado: "grupo" });
  }

  // De onde veio isto, de verdade.
  //
  // Diagnóstico de 11/11/2026, e temporário: chegam mensagens que o dono
  // reconhece como vindas de um grupo, mas que a Z-API entrega como
  // conversa um a um -- remetente com cara de telefone e o número do
  // restaurante como destinatário. Ou ele está enganado, ou ela entrega
  // grupo de duas formas e a trava só conhece uma.
  //
  // O nome dos dois lados resolve: numa mensagem de grupo o nome do grupo
  // aparece em um deles. O `metadata` vem junto porque é onde caberia uma
  // marca de grupo, e cabe no log inteiro -- ele não tem o que foi dito.
  //
  console.info(
    `[zapi/webhook] de-onde: de="${corta(m.sender?.name)}" para="${corta(m.recipient?.name)}" meta=${JSON.stringify(m.metadata ?? {})}`,
  );

  // o formato dos dois lados, e não o número: é o que diz se a trava
  // acima está vendo o grupo, e dá para ler sem expor a conversa
  console.info(
    `[zapi/webhook] ${daCasa ? "saiu" : "chegou"} em …${telefone.slice(-4)} (${tipo}) · de=${forma(de)} para=${forma(para)}` +
      (telefone ? "" : ` · sem telefone, payload: ${JSON.stringify(m).slice(0, 400)}`),
  );

  if (!telefone) return NextResponse.json({ ok: true, ignorado: true });

  // IA desligada: sai aqui, sem escrever nada.
  //
  // O atendimento já conferia isto, mas depois da trava de repetido logo
  // abaixo -- que é uma **escrita** no banco. Com a IA desligada, toda
  // mensagem que chegasse no celular do dono pagava essa escrita para,
  // logo em seguida, ser descartada. Num número que recebe divulgação o
  // dia todo, são centenas de escritas por nada.
  //
  // Uma leitura pequena no lugar de uma escrita. No caminho em que ela
  // está ligada, esta consulta se repete lá dentro -- é uma ida a mais ao
  // banco quando há trabalho de verdade a fazer, e nenhuma quando não há.
  const ligada = await db.atendenteIa.findUnique({
    where: { zapiChannelId: m.channel_id },
    select: { ativo: true },
  });
  if (!ligada?.ativo) return NextResponse.json({ ok: true, ignorado: "desligada" });

  // Cada aviso é tratado uma vez só.
  //
  // A Z-API reenvia o que ela achar que não foi entregue, e sem isto a
  // mesma mensagem entraria duas vezes no histórico -- e seria respondida
  // duas vezes. A chave é o id da mensagem; sem ele, deixa passar, porque
  // perder uma mensagem é pior do que repetir uma.
  if (m._id) {
    try {
      const { count } = await db.iaEventoProcessado.createMany({
        data: [{ chave: `zapi:${m._id}` }],
        skipDuplicates: true,
      });
      if (count === 0) return NextResponse.json({ ok: true, repetido: true });
    } catch (erro) {
      // Banco fora do ar não pode virar falha de webhook: a Z-API conta e
      // suspende a entrega. Sem a trava, o risco é responder duas vezes à
      // mesma mensagem -- incômodo, e muito menos grave que emudecer.
      console.error("[zapi/webhook] falha ao marcar o evento como visto:", erro);
    }
  }

  // o formato que o atender() já fala; `zapi_channel_id` é o que diz a ele
  // para achar o restaurante pelo canal e responder pela Z-API
  const evento: MensagemKapso = {
    zapi_channel_id: m.channel_id,
    message: {
      id: m._id,
      // o atender distingue texto de mídia por este campo
      type: tipo === "text" ? "text" : tipo,
      from: telefone,
      text: { body: texto },
      kapso: {
        direction: daCasa ? "outbound" : "inbound",
        // Saiu do aparelho do restaurante e não foi a própria IA: é uma
        // pessoa respondendo, e é isso que faz a IA ficar quieta por 30
        // minutos naquela conversa.
        origin: daCasa && !m.metadata?.from_api ? "business_app" : "api",
      },
    },
    conversation: { phone_number: telefone },
  };

  // Responde 200 na hora e pensa depois, como o aviso da Kapso.
  //
  // A Z-API desiste de esperar e reenvia o aviso; a IA leva alguns
  // segundos -- e passou a levar mais desde que pensa antes de responder.
  // Segurar a conexão até ela terminar fazia a mesma mensagem chegar duas
  // vezes, ou a resposta não sair de jeito nenhum.
  after(async () => {
    const comecou = Date.now();
    try {
      await atender(evento);
    } catch (erro) {
      // nada daqui volta para a Z-API: o 200 já foi. Fica no log, e a
      // conversa fica com o dono, que a vê no celular.
      console.error("[zapi/webhook] falha ao atender:", erro);
    }
    // quanto a IA levou: é o número que diz se ela está perto do limite da
    // função, e esse limite some sem erro nenhum no log
    console.info(`[zapi/webhook] atendimento em ${Date.now() - comecou}ms`);
  });

  return NextResponse.json({ ok: true });
}

/**
 * A Z-API às vezes bate aqui só para ver se o endereço responde.
 *
 * Sem este handler o Next devolve 405, que para ela é falha igual às
 * outras: dez seguidas e a entrega é suspensa. Responder "estou aqui" não
 * custa nada e não conta nada.
 */
export async function GET() {
  return NextResponse.json({ ok: true, webhook: "zapi" });
}
