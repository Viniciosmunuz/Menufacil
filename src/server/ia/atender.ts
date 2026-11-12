import "server-only";

import { db } from "@/lib/db";

import { formatPhone } from "@/lib/format";
import { isOpenNow } from "@/lib/opening-hours";
import { avisarClienteChamou } from "@/server/push/avisos";

import { conhecimentoDoRestaurante } from "./conhecimento";
import { enviarTexto as enviarPelaKapso } from "./kapso";
import { oQueSabemosDoCliente, pixEmAberto } from "./pedido";
import { responder, type Turno } from "./responder";
import { enviarImagem as enviarImagemPelaZapi, enviarTexto as enviarPelaZapi } from "./zapi";

// O atendimento de uma mensagem que chegou pelo WhatsApp do restaurante.
//
// Quem chama é o webhook, depois de conferir a assinatura e de já ter
// respondido 200 para a Kapso. Aqui nada pode derrubar nada: qualquer falha
// vira um "a IA não respondeu" -- e a conversa, em coexistência, já está no
// WhatsApp do dono.
//
// As travas, em ordem:
//
// As três primeiras saem antes de guardar a mensagem do cliente. Não é
// detalhe de ordem: o que elas barram some sem deixar rastro no banco nem
// na gaveta de conversas do painel.
//
// 1. Atendente desligado: não responde e não guarda nada.
// 2. Número da lista do dono (a família, os amigos, os fornecedores).
// 3. Restaurante fechado (fora do horário ou fechado no botão): fica
//    quieta. Com a entrega pausada ele continua aberto, e ela responde.
//    O que sai do celular do dono é registrado mesmo fechado -- ver a
//    trava 4, que depende disso.
// 4. Alguém do restaurante respondeu pelo celular há pouco: a IA não se mete
//    na conversa de uma pessoa.
// 5. Muitas respostas da IA para o mesmo cliente em pouco tempo: para. Evita
//    conversa em laço e conta alta por um cliente só.
// 6. A própria IA passou a conversa para uma pessoa (o cliente pediu o
//    dono, um atendente...): conta como se alguém do restaurante tivesse
//    assumido, e ela fica quieta pelo mesmo tempo.
// 7. Mensagem que não é texto (foto, figurinha, vídeo): fica para o dono.
//    Duas exceções, e as duas existem para o cliente não ficar no vácuo:
//    a foto de quem tem Pix em aberto, que é quase sempre o comprovante
//    (ela avisa que recebeu, e quem confere é o restaurante); e o áudio,
//    que ela não ouve e por isso pede por escrito, uma vez por hora
//    naquela conversa. Transcrever está no plano e depende de um serviço
//    à parte -- o modelo recebe texto, não som.

/** depois que um humano responde, a IA espera este tempo antes de voltar */
const HUMANO_ASSUMIU_MIN = 30;
/** teto de respostas da IA por cliente por hora */
const RESPOSTAS_POR_HORA = 15;
/**
 * O mesmo teto para um número da lista de teste.
 *
 * Quinze mensagens é uma conversa de cliente; num teste de meia hora,
 * acaba antes do meio. Mas sem teto nenhum uma conversa em laço rodaria
 * para sempre, e quem paga a conta é o dono -- então é mais folga, não
 * passe livre.
 */
const RESPOSTAS_POR_HORA_TESTE = 60;
/**
 * Quanto da conversa a IA lê para ter contexto.
 *
 * **Eram 12, e 12 não dá para anotar um pedido.** Conte uma conversa
 * comum: "oi" (1), ela responde (2), o cliente diz o item (3), ela
 * pergunta o tamanho (4), ele responde (5), ela oferece bebida (6), ele
 * responde (7), entrega ou retirada (8), ele responde (9), o endereço
 * (10), ela confere (11), a forma de pagamento (12). O item que ele
 * pediu já saiu da janela antes de o pedido fechar -- e ela pergunta de
 * novo o que ele acabou de dizer, ou pior, monta o pedido sem ele.
 *
 * Aconteceu em 11/11/2026, e o log mostrava sem margem para dúvida: a
 * conversa crescia 1, 3, 5, 7, 9, 11, 12, 12, 12, 12 -- parada no teto
 * enquanto o cliente continuava falando.
 *
 * Quarenta cobre um pedido inteiro com folga, inclusive os que mudam de
 * ideia no meio. O custo é pequeno perto do que já vai em cada chamada:
 * mensagem de WhatsApp tem poucas dezenas de tokens, e o cardápio, que é
 * o grosso do pedido, viaja no bloco em cache.
 *
 * O teto continua existindo, e a pausa abaixo também: conversa de
 * ontem não entra na de hoje.
 */
const HISTORICO = 40;
/** parada maior que isto na conversa e a próxima mensagem começa outra */
const PAUSA_NOVA_CONVERSA_H = 4;
/**
 * O registro interno de que a IA passou a conversa para uma pessoa.
 *
 * É gravado como HUMANO porque é isso que a faz ficar quieta, mas não é
 * fala de ninguém: fica de fora do histórico que vai para o modelo. Dentro
 * dele, a IA lia "[a IA chamou alguém do restaurante]" como se ela mesma
 * tivesse dito, e passava a repetir "já avisei o dono" a cada "oi".
 */
const MARCA_CHAMOU = "[a IA chamou alguém do restaurante]";
/** o que fica no histórico no lugar de uma imagem: o endereço dela não diz nada à IA */
const MARCA_IMAGEM = "[a IA mandou o QR Code do Pix]";

/** o que sai para o cliente: um texto, ou uma imagem por endereço */
type Saida = string | { imagem: string };
const TEXTO_MAX = 1500;

/**
 * O que ela responde a um áudio.
 *
 * Ela não ouve: o modelo recebe texto, e transcrever exigiria um serviço
 * à parte -- está no plano, mas não hoje. Até aqui a escolha era ficar
 * calada, porque "não entendi" irrita mais do que o silêncio. Só que para
 * o cliente o silêncio é o restaurante ignorando ele, e num delivery
 * brasileiro áudio é o normal, não a exceção.
 *
 * Diz o que ela não consegue e o que fazer, sem pedir desculpa nem
 * prometer o que não vai cumprir.
 */
const SO_TEXTO = "Oi! Ainda não consigo ouvir áudio 😅 Me escreve o que você precisa que eu te ajudo na hora!";

/**
 * Por quanto tempo o aviso de áudio não se repete naquela conversa.
 *
 * Três áudios seguidos não viram três avisos -- isso seria a irritação
 * que o silêncio evitava. Mas também não é para sempre: quem manda áudio
 * de novo horas depois não lembra do aviso, e merece a resposta outra vez.
 */
const AVISO_AUDIO_MIN = 60;

/** os nomes que o áudio recebe pelo caminho: gravação do WhatsApp é "ptt" */
const EH_AUDIO = new Set(["audio", "voice", "ptt"]);

const COMPROVANTE_MANUAL =
  "Recebi o comprovante! O restaurante vai conferir e confirmar o seu pedido. 😊";
const COMPROVANTE_MERCADO_PAGO =
  "Recebi! Assim que o Pix cair, o pedido é confirmado sozinho e o restaurante já começa. 😊";

/** só os dígitos, e com o 9 do celular tirado, para comparar os dois jeitos */
const semNove = (t: string) => {
  const d = t.replace(/\D/g, "");
  // 55 + DDD + 9 + 8 dígitos: o mesmo número aparece das duas formas por aí
  return d.length === 13 && d.startsWith("55") && d[4] === "9"
    ? d.slice(0, 4) + d.slice(5)
    : d;
};

/** o número está na lista de quem a IA não responde? */
export function estaNaLista(lista: string[], telefone: string) {
  const alvo = semNove(telefone);
  return lista.some((n) => semNove(n) === alvo);
}

/**
 * O pedaço do aviso que o atendimento usa (formato v2 da Kapso).
 *
 * A Z-API fala outro idioma, e por isso o webhook dela traduz para este
 * formato antes de chamar o `atender()` -- assim as travas, o histórico e
 * os pedidos continuam num lugar só, sem saber qual provedor trouxe a
 * mensagem. O que diz quem é quem são os dois campos de canal:
 * `phone_number_id` para a Kapso, `zapi_channel_id` para a Z-API.
 */
export type MensagemKapso = {
  phone_number_id?: string;
  /** o canal da Z-API; quando vem, é por ele que a resposta sai */
  zapi_channel_id?: string;
  message?: {
    id?: string;
    type?: string;
    from?: string;
    from_user_id?: string;
    text?: { body?: string };
    kapso?: {
      direction?: string;
      origin?: string;
      /** o histórico cru da Meta; quando a entrega falha, o motivo vem aqui */
      statuses?: { errors?: { code?: number; title?: string; message?: string }[] }[];
    };
  };
  conversation?: { phone_number?: string; business_scoped_user_id?: string };
};

export async function atender(evento: MensagemKapso) {
  const phoneNumberId = evento.phone_number_id;
  const zapiChannelId = evento.zapi_channel_id;
  const m = evento.message;
  if ((!phoneNumberId && !zapiChannelId) || !m) return;

  // O restaurante é achado pelo canal por onde a mensagem entrou, e é o
  // mesmo canal que responde: misturar os dois seria mandar a resposta de
  // um restaurante pelo WhatsApp de outro.
  const atendente = await db.atendenteIa.findUnique({
    where: zapiChannelId ? { zapiChannelId } : { phoneNumberId },
    select: {
      restaurantId: true,
      ativo: true,
      fazPedidos: true,
      ignorados: true,
      semEspera: true,
    },
  });
  if (!atendente) return;
  const { restaurantId } = atendente;

  // Quem está do outro lado. O telefone é o que serve para responder; os
  // avisos novos da Meta podem vir só com o id do usuário.
  const telefone =
    evento.conversation?.phone_number ||
    (m.kapso?.direction === "inbound" ? m.from : null) ||
    null;
  const usuario =
    evento.conversation?.business_scoped_user_id || m.from_user_id || null;
  const contato = telefone ?? usuario;
  if (!contato) return;

  // Desligada: nada é respondido e nada é guardado. A conversa é do
  // restaurante com o cliente dele, e sem a IA no ar não há o que fazer
  // com ela.
  if (!atendente.ativo) return;

  // Número da lista do dono (a família, os amigos): a IA não existe para
  // eles. Nem responde, nem guarda.
  if (telefone && estaNaLista(atendente.ignorados, telefone)) return;

  /**
   * O restaurante está aberto agora?
   *
   * Consulta própria, pequena, em vez de reaproveitar o conhecimento do
   * restaurante: o que ela lê é o status, o modo e os horários, e não o
   * cardápio inteiro.
   */
  async function abertoAgora() {
    const r = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        status: true,
        openMode: true,
        openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
      },
    });
    return Boolean(r && r.status === "ACTIVE" && isOpenNow(r.openMode, r.openingHours));
  }

  const texto = (m.text?.body ?? "").slice(0, TEXTO_MAX).trim();
  const direcao = m.kapso?.direction;

  // ─── saiu do número do restaurante ─────────────────────────────────
  if (direcao === "outbound") {
    // Pelo app do celular é uma pessoa do restaurante: fica registrado, e
    // é isso que faz a IA ficar quieta nos próximos minutos. O que a própria
    // IA mandou pela API também volta como aviso, e esse se ignora.
    if (m.kapso?.origin === "business_app") {
      await db.iaMensagem.create({
        data: {
          restaurantId,
          contato,
          papel: "HUMANO",
          texto: texto || "[mídia]",
        },
      });
    }
    return;
  }
  if (direcao !== "inbound") return;

  // Restaurante fechado: sai aqui, antes de guardar.
  //
  // Esta trava já existia, mas lá embaixo -- depois de gravar a mensagem e
  // depois de montar o conhecimento do restaurante, que carrega o cardápio
  // inteiro. Com o restaurante fechado a noite toda, era uma escrita no
  // banco e uma consulta pesada por mensagem que nunca seria respondida:
  // num número que também é o celular do dono, com grupo e divulgação
  // chegando, são centenas por dia. O efeito visível era a gaveta de
  // conversas do painel encher de gente que a IA nunca atendeu -- foi
  // assim que ele notou.
  //
  // **Só no que chega do cliente, e por isso depois do bloco de cima.** O
  // que sai do celular do dono continua sendo registrado mesmo fechado: é
  // esse registro que faz a IA ficar quieta por 30 minutos naquela
  // conversa, e a meia hora atravessa a hora de abrir. Sem isso, ele
  // responderia alguém 17h50 e ela falaria por cima dele às 18h.
  if (!(await abertoAgora())) return;

  // ─── o cliente escreveu ────────────────────────────────────────────
  const recebida = await db.iaMensagem.create({
    data: {
      restaurantId,
      contato,
      papel: "CLIENTE",
      texto: texto || `[${m.type ?? "mídia"}]`,
    },
    select: { createdAt: true },
  });

  const agora = Date.now();
  // Número de teste: o dono está conversando dos dois lados de propósito,
  // e o freio só atrapalharia.
  const eTeste = telefone ? estaNaLista(atendente.semEspera, telefone) : false;
  const humanoRecente = eTeste
    ? 0
    : await db.iaMensagem.count({
        where: {
          restaurantId,
          contato,
          papel: "HUMANO",
          createdAt: { gte: new Date(agora - HUMANO_ASSUMIU_MIN * 60_000) },
        },
      });
  if (humanoRecente > 0) return;

  /** manda pelo canal por onde a conversa chegou e guarda no histórico */
  const enviar = async (saida: Saida) => {
    if (typeof saida !== "string") {
      // Imagem só pela Z-API: é o canal em uso, e é o único com endpoint de
      // imagem montado aqui. Pela Kapso o cliente continua recebendo o
      // código copia e cola, que resolve sozinho -- melhor do que falhar.
      if (!zapiChannelId || !telefone) return true;
      try {
        await enviarImagemPelaZapi({ telefone, url: saida.imagem });
      } catch (erro) {
        // Imagem que não sobe não pode derrubar o Pix: o código de texto
        // vem logo atrás e é ele que o cliente precisa.
        console.error("[ia] falha ao mandar a imagem:", erro);
        return true;
      }
      await db.iaMensagem.create({ data: { restaurantId, contato, papel: "IA", texto: MARCA_IMAGEM } });
      return true;
    }
    const texto = saida;
    if (zapiChannelId) {
      if (!telefone) return false;
      await enviarPelaZapi({ telefone, texto });
    } else {
      await enviarPelaKapso({ phoneNumberId: phoneNumberId!, telefone, usuario, texto });
    }
    await db.iaMensagem.create({ data: { restaurantId, contato, papel: "IA", texto } });
    return true;
  };

  /** registra que uma pessoa assumiu: cala a IA e avisa o dono no celular */
  const passarParaUmaPessoa = async () => {
    await db.iaMensagem.create({ data: { restaurantId, contato, papel: "HUMANO", texto: MARCA_CHAMOU } });
    await avisarClienteChamou({
      restaurantId,
      quem: telefone ? formatPhone(telefone) : "Um cliente",
    }).catch((erro) => console.error("[ia] falha ao avisar o dono:", erro));
  };

  // O teto de respostas para um cliente só.
  //
  // Existe contra conversa em laço e conta alta, e continua existindo. O
  // que mudou é o que acontece ao bater nele: antes a IA simplesmente
  // emudecia, e nem o cliente nem o dono ficavam sabendo. Agora ela avisa
  // que vai chamar alguém, e chama -- que é o que uma pessoa cansada
  // faria, em vez de desligar o telefone na cara.
  const teto = eTeste ? RESPOSTAS_POR_HORA_TESTE : RESPOSTAS_POR_HORA;
  const respostasNaHora = await db.iaMensagem.count({
    where: {
      restaurantId,
      contato,
      papel: "IA",
      createdAt: { gte: new Date(agora - 60 * 60_000) },
    },
  });
  if (respostasNaHora >= teto) {
    console.warn(`[ia] teto de ${teto} respostas por hora atingido no restaurante ${restaurantId}`);
    try {
      await enviar("Vou chamar alguém do restaurante para continuar com você, só um instante! 😊");
      await passarParaUmaPessoa();
    } catch (erro) {
      console.error("[ia] falha ao avisar que passou para uma pessoa:", erro);
    }
    return;
  }

  /**
   * Chegou outra mensagem do cliente depois desta?
   *
   * Quem escreve no WhatsApp escreve em rajada: o endereço numa mensagem e
   * "anoto aí?" na seguinte. Cada uma entra aqui por conta própria, e as
   * duas pensam ao mesmo tempo -- a que terminar primeiro responde lendo
   * metade da conversa, e o cliente vê a pergunta que ele acabou de
   * responder.
   *
   * Então quem foi ultrapassado sai de cena. A última sempre lê tudo o que
   * veio antes, porque só começa depois de todas estarem gravadas.
   */
  const ultrapassada = async () =>
    (await db.iaMensagem.count({
      where: { restaurantId, contato, papel: "CLIENTE", createdAt: { gt: recebida.createdAt } },
    })) > 0;

  if (await ultrapassada()) return;

  const conhecimento = await conhecimentoDoRestaurante(restaurantId, {
    comIds: atendente.fazPedidos,
  });
  // Fechado já foi conferido lá em cima, antes de guardar a mensagem.
  // Aqui fica como segunda guarda, e ela não é à toa: entre uma conferida
  // e outra a IA pensa alguns segundos, e o restaurante pode ter fechado
  // no meio -- no botão ou no horário.
  if (!conhecimento || !conhecimento.aberto) return;

  /** manda e registra; só se ninguém do restaurante entrou na conversa enquanto isso */
  const mandar = async (mensagens: Saida[]) => {
    // Enquanto a IA pensava, alguém do restaurante pode ter respondido pelo
    // celular. Aí a resposta dela chega atrasada e atravessa a pessoa: melhor
    // não mandar.
    const humanoNoMeio = eTeste
      ? 0
      : await db.iaMensagem.count({
          where: {
            restaurantId,
            contato,
            papel: "HUMANO",
            createdAt: { gte: recebida.createdAt },
          },
        });
    if (humanoNoMeio > 0) return false;
    // e o cliente pode ter escrito de novo enquanto ela pensava: a
    // mensagem dela chegaria atrasada, respondendo o que já ficou para trás
    if (await ultrapassada()) return false;
    for (const msg of mensagens) if (!(await enviar(msg))) return false;
    return true;
  };

  if (m.type !== "text" || !texto) {
    // Áudio: ela diz que não ouve, e pede por escrito.
    //
    // Vale mesmo quando ela só tira dúvidas (sem anotar pedido): quem
    // mandou áudio está esperando resposta de qualquer jeito.
    if (m.type && EH_AUDIO.has(m.type)) {
      const jaPediu = await db.iaMensagem.count({
        where: {
          restaurantId,
          contato,
          papel: "IA",
          texto: SO_TEXTO,
          createdAt: { gte: new Date(agora - AVISO_AUDIO_MIN * 60_000) },
        },
      });
      if (jaPediu === 0) await mandar([SO_TEXTO]);
      return;
    }

    // Foto ou PDF de quem tem Pix em aberto: é o comprovante. A IA só
    // avisa que chegou -- quem confere é o restaurante (ou o Mercado Pago),
    // e o arquivo já está no WhatsApp do dono.
    if (
      !atendente.fazPedidos ||
      !telefone ||
      (m.type !== "image" && m.type !== "document")
    )
      return;
    const pedido = await pixEmAberto(restaurantId, telefone);
    if (!pedido) return;
    const aviso =
      pedido.origin === "FULL_DELIVERY"
        ? COMPROVANTE_MERCADO_PAGO
        : COMPROVANTE_MANUAL;
    // uma vez só: três fotos seguidas não viram três avisos
    const jaAvisou = await db.iaMensagem.count({
      where: {
        restaurantId,
        contato,
        papel: "IA",
        texto: aviso,
        createdAt: { gte: new Date(agora - 30 * 60_000) },
      },
    });
    if (jaAvisou === 0) await mandar([aviso]);
    return;
  }

  const recentes = await db.iaMensagem.findMany({
    where: {
      restaurantId,
      contato,
      // Cada expediente é uma conversa nova.
      //
      // Fechou e abriu de novo, é outro dia de trabalho: quem manda "oi" na
      // noite seguinte não quer continuar de onde parou. Sem este corte, a
      // IA lia a véspera inteira e repetia o que tinha dito lá -- "o vini
      // já foi avisado" a cada mensagem nova, um dia depois do chamado.
      createdAt: { gte: new Date(Math.max(agora - 24 * 60 * 60_000, conhecimento.inicioDoTurno.getTime())) },
      texto: { not: MARCA_CHAMOU },
    },
    orderBy: { createdAt: "desc" },
    take: HISTORICO,
    select: { papel: true, texto: true, createdAt: true },
  });
  recentes.reverse();

  // Dentro do mesmo expediente, uma parada longa também recomeça a
  // conversa: vale para quem fecha e abre no botão, que não mexe no horário
  // cadastrado, e para o restaurante sem horário nenhum.
  let comeco = 0;
  for (let i = 1; i < recentes.length; i++) {
    const salto = recentes[i].createdAt.getTime() - recentes[i - 1].createdAt.getTime();
    if (salto > PAUSA_NOVA_CONVERSA_H * 60 * 60_000) comeco = i;
  }

  // Mensagens seguidas do mesmo lado viram um bloco só.
  //
  // Quem escreve no WhatsApp quebra a frase em várias mensagens: o
  // endereço numa, "anoto aí?" na outra. Entregues como turnos separados,
  // a IA lia a última e respondia pedindo o que já estava na anterior.
  // Juntas, é uma fala só -- que é como a pessoa a escreveu.
  const conversa: Turno[] = [];
  for (const r of recentes.slice(comeco)) {
    const papel = r.papel === "CLIENTE" ? "cliente" : "atendente";
    const anterior = conversa[conversa.length - 1];
    if (anterior?.papel === papel) anterior.texto += `\n${r.texto}`;
    else conversa.push({ papel, texto: r.texto });
  }

  // sem o conteúdo da conversa: só o tamanho, que é o que diz se ela está
  // lendo a mensagem inteira ou só o fim dela
  console.info(
    `[ia] vai responder com ${conversa.length} turnos (${recentes.length} mensagens, ${conversa.at(-1)?.texto.length ?? 0} letras na última)`,
  );

  // Só quando ela anota pedido: num atendente que só tira dúvidas, o
  // endereço do cliente não serve para nada e não tem por que estar no
  // contexto.
  const cliente = atendente.fazPedidos ? await oQueSabemosDoCliente(restaurantId, telefone) : null;

  const resposta = await responder({
    conhecimento,
    conversa,
    cliente,
    pedidos: atendente.fazPedidos
      ? { restaurantId, slug: conhecimento.slug, contato, telefone }
      : undefined,
  });
  if (!resposta) return;

  // A ordem importa: a explicação, depois o QR, depois o código. Quem lê
  // de cima para baixo encontra o quadradinho já sabendo o que é, e o
  // código fica por último, que é o que se copia com um toque longo.
  const mandou = await mandar([
    resposta.texto,
    ...resposta.imagens.map((imagem) => ({ imagem })),
    ...resposta.anexos,
  ]);

  // o registro de "humano" é o que faz a IA ficar quieta daqui em diante
  if (mandou && resposta.chamouPessoa) await passarParaUmaPessoa();

  // só números, para acompanhar o custo: nada do conteúdo da conversa
  console.info(
    `[ia] respondeu (${resposta.modelo}): ${resposta.tokens.entrada} entrada, ${resposta.tokens.cache} do cache, ${resposta.tokens.saida} saída`,
  );
}
