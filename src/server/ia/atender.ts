import "server-only";

import { db } from "@/lib/db";

import { conhecimentoDoRestaurante } from "./conhecimento";
import { enviarTexto } from "./kapso";
import { pixEmAberto } from "./pedido";
import { responder, type Turno } from "./responder";

// O atendimento de uma mensagem que chegou pelo WhatsApp do restaurante.
//
// Quem chama é o webhook, depois de conferir a assinatura e de já ter
// respondido 200 para a Kapso. Aqui nada pode derrubar nada: qualquer falha
// vira um "a IA não respondeu" -- e a conversa, em coexistência, já está no
// WhatsApp do dono.
//
// As travas, em ordem:
//
// 1. Atendente desligado: só registra, não responde.
// 2. Alguém do restaurante respondeu pelo celular há pouco: a IA não se mete
//    na conversa de uma pessoa.
// 3. Muitas respostas da IA para o mesmo cliente em pouco tempo: para. Evita
//    conversa em laço e conta alta por um cliente só.
// 4. Restaurante fechado (fora do horário ou fechado no botão): fica quieta.
//    Com a entrega pausada ele continua aberto, e ela responde.
// 5. Mensagem que não é texto (áudio, foto, figurinha): fica para o dono. A
//    IA não ouve áudio, e responder "não entendi" a um áudio irrita mais do
//    que ficar quieta. A exceção é a foto de quem tem Pix em aberto, que é
//    quase sempre o comprovante: ela avisa que recebeu e que o restaurante
//    vai conferir, e só.

/** depois que um humano responde, a IA espera este tempo antes de voltar */
const HUMANO_ASSUMIU_MIN = 30;
/** teto de respostas da IA por cliente por hora */
const RESPOSTAS_POR_HORA = 15;
/** quanto da conversa a IA lê para ter contexto */
const HISTORICO = 12;
const TEXTO_MAX = 1500;

const COMPROVANTE_MANUAL = "Recebi o comprovante! O restaurante vai conferir e confirmar o seu pedido. 😊";
const COMPROVANTE_MERCADO_PAGO = "Recebi! Assim que o Pix cair, o pedido é confirmado sozinho e o restaurante já começa. 😊";

/** o pedaço do aviso da Kapso que o atendimento usa (formato v2) */
export type MensagemKapso = {
  phone_number_id?: string;
  message?: {
    id?: string;
    type?: string;
    from?: string;
    from_user_id?: string;
    text?: { body?: string };
    kapso?: { direction?: string; origin?: string };
  };
  conversation?: { phone_number?: string; business_scoped_user_id?: string };
};

export async function atender(evento: MensagemKapso) {
  const phoneNumberId = evento.phone_number_id;
  const m = evento.message;
  if (!phoneNumberId || !m) return;

  const atendente = await db.atendenteIa.findUnique({
    where: { phoneNumberId },
    select: { restaurantId: true, ativo: true, fazPedidos: true },
  });
  if (!atendente) return;
  const { restaurantId } = atendente;

  // Quem está do outro lado. O telefone é o que serve para responder; os
  // avisos novos da Meta podem vir só com o id do usuário.
  const telefone = evento.conversation?.phone_number || (m.kapso?.direction === "inbound" ? m.from : null) || null;
  const usuario = evento.conversation?.business_scoped_user_id || m.from_user_id || null;
  const contato = telefone ?? usuario;
  if (!contato) return;

  const texto = (m.text?.body ?? "").slice(0, TEXTO_MAX).trim();
  const direcao = m.kapso?.direction;

  // ─── saiu do número do restaurante ─────────────────────────────────
  if (direcao === "outbound") {
    // Pelo app do celular é uma pessoa do restaurante: fica registrado, e
    // é isso que faz a IA ficar quieta nos próximos minutos. O que a própria
    // IA mandou pela API também volta como aviso, e esse se ignora.
    if (m.kapso?.origin === "business_app") {
      await db.iaMensagem.create({
        data: { restaurantId, contato, papel: "HUMANO", texto: texto || "[mídia]" },
      });
    }
    return;
  }
  if (direcao !== "inbound") return;

  // ─── o cliente escreveu ────────────────────────────────────────────
  const recebida = await db.iaMensagem.create({
    data: { restaurantId, contato, papel: "CLIENTE", texto: texto || `[${m.type ?? "mídia"}]` },
    select: { createdAt: true },
  });

  if (!atendente.ativo) return;

  const agora = Date.now();
  const humanoRecente = await db.iaMensagem.count({
    where: {
      restaurantId,
      contato,
      papel: "HUMANO",
      createdAt: { gte: new Date(agora - HUMANO_ASSUMIU_MIN * 60_000) },
    },
  });
  if (humanoRecente > 0) return;

  const respostasNaHora = await db.iaMensagem.count({
    where: { restaurantId, contato, papel: "IA", createdAt: { gte: new Date(agora - 60 * 60_000) } },
  });
  if (respostasNaHora >= RESPOSTAS_POR_HORA) {
    console.warn(`[ia] teto de respostas atingido para um cliente do restaurante ${restaurantId}`);
    return;
  }

  const conhecimento = await conhecimentoDoRestaurante(restaurantId, { comIds: atendente.fazPedidos });
  if (!conhecimento || !conhecimento.aberto) return;

  /** manda e registra; só se ninguém do restaurante entrou na conversa enquanto isso */
  const mandar = async (mensagens: string[]) => {
    // Enquanto a IA pensava, alguém do restaurante pode ter respondido pelo
    // celular. Aí a resposta dela chega atrasada e atravessa a pessoa: melhor
    // não mandar.
    const humanoNoMeio = await db.iaMensagem.count({
      where: { restaurantId, contato, papel: "HUMANO", createdAt: { gte: recebida.createdAt } },
    });
    if (humanoNoMeio > 0) return false;
    for (const msg of mensagens) {
      await enviarTexto({ phoneNumberId, telefone, usuario, texto: msg });
      await db.iaMensagem.create({ data: { restaurantId, contato, papel: "IA", texto: msg } });
    }
    return true;
  };

  if (m.type !== "text" || !texto) {
    // Foto ou PDF de quem tem Pix em aberto: é o comprovante. A IA só
    // avisa que chegou -- quem confere é o restaurante (ou o Mercado Pago),
    // e o arquivo já está no WhatsApp do dono.
    if (!atendente.fazPedidos || !telefone || (m.type !== "image" && m.type !== "document")) return;
    const pedido = await pixEmAberto(restaurantId, telefone);
    if (!pedido) return;
    const aviso = pedido.origin === "FULL_DELIVERY" ? COMPROVANTE_MERCADO_PAGO : COMPROVANTE_MANUAL;
    // uma vez só: três fotos seguidas não viram três avisos
    const jaAvisou = await db.iaMensagem.count({
      where: { restaurantId, contato, papel: "IA", texto: aviso, createdAt: { gte: new Date(agora - 30 * 60_000) } },
    });
    if (jaAvisou === 0) await mandar([aviso]);
    return;
  }

  const recentes = await db.iaMensagem.findMany({
    where: { restaurantId, contato, createdAt: { gte: new Date(agora - 24 * 60 * 60_000) } },
    orderBy: { createdAt: "desc" },
    take: HISTORICO,
    select: { papel: true, texto: true },
  });
  const conversa: Turno[] = recentes.reverse().map((r) => ({
    papel: r.papel === "CLIENTE" ? "cliente" : "atendente",
    texto: r.texto,
  }));

  const resposta = await responder({
    conhecimento,
    conversa,
    pedidos: atendente.fazPedidos ? { restaurantId, slug: conhecimento.slug, contato, telefone } : undefined,
  });
  if (!resposta) return;

  await mandar([resposta.texto, ...resposta.anexos]);

  // só números, para acompanhar o custo: nada do conteúdo da conversa
  console.info(
    `[ia] respondeu (${resposta.modelo}): ${resposta.tokens.entrada} entrada, ${resposta.tokens.cache} do cache, ${resposta.tokens.saida} saída`,
  );
}
