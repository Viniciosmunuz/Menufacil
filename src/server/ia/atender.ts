import "server-only";

import { db } from "@/lib/db";

import { formatPhone } from "@/lib/format";
import { avisarClienteChamou } from "@/server/push/avisos";

import { conhecimentoDoRestaurante } from "./conhecimento";
import { enviarTexto as enviarPelaKapso } from "./kapso";
import { pixEmAberto } from "./pedido";
import { responder, type Turno } from "./responder";
import { enviarTexto as enviarPelaZapi } from "./zapi";

// O atendimento de uma mensagem que chegou pelo WhatsApp do restaurante.
//
// Quem chama é o webhook, depois de conferir a assinatura e de já ter
// respondido 200 para a Kapso. Aqui nada pode derrubar nada: qualquer falha
// vira um "a IA não respondeu" -- e a conversa, em coexistência, já está no
// WhatsApp do dono.
//
// As travas, em ordem:
//
// 1. Atendente desligado: não responde e não guarda nada.
// 2. Alguém do restaurante respondeu pelo celular há pouco: a IA não se mete
//    na conversa de uma pessoa.
// 3. Muitas respostas da IA para o mesmo cliente em pouco tempo: para. Evita
//    conversa em laço e conta alta por um cliente só.
// 4. Restaurante fechado (fora do horário ou fechado no botão): fica quieta.
//    Com a entrega pausada ele continua aberto, e ela responde.
// 5. A própria IA passou a conversa para uma pessoa (o cliente pediu o
//    dono, um atendente...): conta como se alguém do restaurante tivesse
//    assumido, e ela fica quieta pelo mesmo tempo.
// 6. Mensagem que não é texto (áudio, foto, figurinha): fica para o dono. A
//    IA não ouve áudio, e responder "não entendi" a um áudio irrita mais do
//    que ficar quieta. A exceção é a foto de quem tem Pix em aberto, que é
//    quase sempre o comprovante: ela avisa que recebeu e que o restaurante
//    vai conferir, e só.

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
/** quanto da conversa a IA lê para ter contexto */
const HISTORICO = 12;
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
const TEXTO_MAX = 1500;

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
  const enviar = async (texto: string) => {
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
  if (!conhecimento || !conhecimento.aberto) return;

  /** manda e registra; só se ninguém do restaurante entrou na conversa enquanto isso */
  const mandar = async (mensagens: string[]) => {
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

  const resposta = await responder({
    conhecimento,
    conversa,
    pedidos: atendente.fazPedidos
      ? { restaurantId, slug: conhecimento.slug, contato, telefone }
      : undefined,
  });
  if (!resposta) return;

  const mandou = await mandar([resposta.texto, ...resposta.anexos]);

  // o registro de "humano" é o que faz a IA ficar quieta daqui em diante
  if (mandou && resposta.chamouPessoa) await passarParaUmaPessoa();

  // só números, para acompanhar o custo: nada do conteúdo da conversa
  console.info(
    `[ia] respondeu (${resposta.modelo}): ${resposta.tokens.entrada} entrada, ${resposta.tokens.cache} do cache, ${resposta.tokens.saida} saída`,
  );
}
