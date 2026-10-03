import "server-only";

import { after } from "next/server";

import { db } from "@/lib/db";
import { avisarMensagemDoCliente } from "@/server/push/avisos";

// Conversa do pedido, no 100% Delivery.
//
// Existe porque o modo tira o WhatsApp do caminho. No fluxo antigo, falar
// com o restaurante era abrir a conversa e escrever; aqui o cliente não sai
// da página do pedido, então a conversa tem de estar nela -- "pode tirar a
// cebola?", "estou na portaria", "o entregador já saiu?".
//
// Uma conversa por pedido, nascida junto com ele e amarrada a ele: nada de
// mensagem solta que ninguém sabe de qual pedido é. Ela nasce na primeira
// mensagem, não antes: pedido em que ninguém falou nada não deixa linha
// vazia no banco.
//
// Quem é quem:
//
// - O cliente escreve com o código do pedido na mão, que é o que o link
//   dele tem. Mesma regra do resto da página do pedido: quem tem o link é
//   o dono do pedido.
// - O restaurante escreve pelo painel, e aí quem escreveu fica gravado --
//   num restaurante com três pessoas no balcão, saber quem respondeu o quê
//   é o que resolve discussão.
//
// Os dois contadores de não lidas ficam na conversa, não calculados a cada
// consulta: o painel mostra esse número em toda lista de pedido, e contar
// mensagem por pedido a cada carregamento de tela sairia caro por nada.

/** mensagem maior que isto não é recado, é outra coisa */
const MAX_LETRAS = 500;
/** freio contra enxurrada: mensagens de um lado, na janela abaixo */
const MAX_NA_JANELA = 20;
const JANELA_MS = 5 * 60 * 1000;

export type MensagemDoChat = {
  id: string;
  autor: "CUSTOMER" | "RESTAURANT";
  autorNome: string | null;
  texto: string;
  em: Date;
  lida: boolean;
};

export type ConversaDoPedido = {
  mensagens: MensagemDoChat[];
  naoLidasDoCliente: number;
  naoLidasDoRestaurante: number;
  ultimaEm: Date | null;
};

const vazia: ConversaDoPedido = { mensagens: [], naoLidasDoCliente: 0, naoLidasDoRestaurante: 0, ultimaEm: null };

/** a conversa de um pedido, do jeito que as duas telas mostram */
export async function conversaDoPedido(orderId: string): Promise<ConversaDoPedido> {
  const conversa = await db.chatConversation.findUnique({
    where: { orderId },
    select: {
      customerUnread: true,
      restaurantUnread: true,
      lastMessageAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true, author: true, authorName: true, body: true, createdAt: true, readAt: true },
      },
    },
  });
  if (!conversa) return vazia;

  return {
    naoLidasDoCliente: conversa.customerUnread,
    naoLidasDoRestaurante: conversa.restaurantUnread,
    ultimaEm: conversa.lastMessageAt,
    mensagens: conversa.messages.map((m) => ({
      id: m.id,
      autor: m.author,
      autorNome: m.authorName,
      texto: m.body,
      em: m.createdAt,
      lida: m.readAt !== null,
    })),
  };
}

function limpar(texto: unknown) {
  return String(texto ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LETRAS);
}

/** freio por pedido e por lado, para ninguém encher a conversa */
async function passouDoLimite(conversationId: string, autor: "CUSTOMER" | "RESTAURANT") {
  const recentes = await db.chatMessage.count({
    where: { conversationId, author: autor, createdAt: { gte: new Date(Date.now() - JANELA_MS) } },
  });
  return recentes >= MAX_NA_JANELA;
}

type Gravada = { ok: true; mensagem: MensagemDoChat } | { erro: string };

/**
 * Grava a mensagem e mexe nos contadores na mesma transação: a conversa
 * nasce aqui se ainda não existia.
 */
async function gravar(params: {
  orderId: string;
  restaurantId: string;
  autor: "CUSTOMER" | "RESTAURANT";
  autorNome: string | null;
  autorUserId: string | null;
  texto: string;
}): Promise<Gravada> {
  const texto = limpar(params.texto);
  if (!texto) return { erro: "Escreva a mensagem antes de enviar." };

  const agora = new Date();
  const conversa = await db.chatConversation.upsert({
    where: { orderId: params.orderId },
    create: { orderId: params.orderId, restaurantId: params.restaurantId },
    update: {},
    select: { id: true },
  });

  if (await passouDoLimite(conversa.id, params.autor)) {
    return { erro: "Muitas mensagens em pouco tempo. Aguarde um instante." };
  }

  const mensagem = await db.$transaction(async (tx) => {
    const criada = await tx.chatMessage.create({
      data: {
        conversationId: conversa.id,
        author: params.autor,
        authorName: params.autorNome,
        authorUserId: params.autorUserId,
        body: texto,
      },
      select: { id: true, author: true, authorName: true, body: true, createdAt: true, readAt: true },
    });
    await tx.chatConversation.update({
      where: { id: conversa.id },
      data: {
        lastMessageAt: agora,
        // a mensagem conta como não lida para o outro lado
        ...(params.autor === "CUSTOMER" ? { restaurantUnread: { increment: 1 } } : { customerUnread: { increment: 1 } }),
      },
      select: { id: true },
    });
    return criada;
  });

  return {
    ok: true,
    mensagem: {
      id: mensagem.id,
      autor: mensagem.author,
      autorNome: mensagem.authorName,
      texto: mensagem.body,
      em: mensagem.createdAt,
      lida: false,
    },
  };
}

/**
 * O cliente escreveu, pela página do pedido dele.
 *
 * Só em pedido do 100% Delivery, e só enquanto o pedido está de pé:
 * conversa de pedido entregue na semana passada não serve para ninguém e
 * viraria caixa de entrada que o balcão nunca lê.
 */
export async function enviarComoCliente(code: string, texto: string): Promise<Gravada> {
  const pedido = await db.order.findUnique({
    where: { code },
    select: { id: true, restaurantId: true, number: true, origin: true, status: true, customerName: true },
  });
  if (!pedido) return { erro: "Pedido não encontrado." };
  if (pedido.origin !== "FULL_DELIVERY") return { erro: "Este pedido não tem conversa aqui." };
  if (pedido.status === "CANCELED") return { erro: "Este pedido foi cancelado." };

  const gravada = await gravar({
    orderId: pedido.id,
    restaurantId: pedido.restaurantId,
    autor: "CUSTOMER",
    autorNome: pedido.customerName,
    autorUserId: null,
    texto,
  });
  if ("erro" in gravada) return gravada;

  // o painel aberto já se atualiza pelo canal de eventos; o aviso no celular
  // é para quem fechou o painel. Depois de responder ao cliente, porque
  // esperar o Google para só então dizer "enviada" atrasaria por nada
  after(async () => {
    try {
      await avisarMensagemDoCliente({
        restaurantId: pedido.restaurantId,
        orderNumber: pedido.number,
        texto: gravada.mensagem.texto,
      });
    } catch (erro) {
      console.error("[chat] não deu para avisar o restaurante:", erro);
    }
  });

  return gravada;
}

/** o restaurante respondeu, pelo painel; quem chama já conferiu o acesso */
export async function enviarComoRestaurante(params: {
  orderId: string;
  restaurantId: string;
  userId: string;
  userName: string;
  texto: string;
}): Promise<Gravada> {
  const pedido = await db.order.findFirst({
    where: { id: params.orderId, restaurantId: params.restaurantId },
    select: { id: true, origin: true, status: true },
  });
  if (!pedido) return { erro: "Pedido não encontrado." };
  if (pedido.origin !== "FULL_DELIVERY") return { erro: "Este pedido não tem conversa aqui." };

  return gravar({
    orderId: pedido.id,
    restaurantId: params.restaurantId,
    autor: "RESTAURANT",
    autorNome: params.userName,
    autorUserId: params.userId,
    texto: params.texto,
  });
}

/** o cliente abriu a página: o que o restaurante escreveu está lido */
export async function marcarLidoPeloCliente(orderId: string) {
  const conversa = await db.chatConversation.findUnique({ where: { orderId }, select: { id: true, customerUnread: true } });
  if (!conversa || conversa.customerUnread === 0) return;
  await db.$transaction([
    db.chatMessage.updateMany({ where: { conversationId: conversa.id, author: "RESTAURANT", readAt: null }, data: { readAt: new Date() } }),
    db.chatConversation.update({ where: { id: conversa.id }, data: { customerUnread: 0 }, select: { id: true } }),
  ]);
}

/** o balcão abriu a conversa: o que o cliente escreveu está lido */
export async function marcarLidoPeloRestaurante(orderId: string, restaurantId: string) {
  const conversa = await db.chatConversation.findFirst({
    where: { orderId, restaurantId },
    select: { id: true, restaurantUnread: true },
  });
  if (!conversa || conversa.restaurantUnread === 0) return;
  await db.$transaction([
    db.chatMessage.updateMany({ where: { conversationId: conversa.id, author: "CUSTOMER", readAt: null }, data: { readAt: new Date() } }),
    db.chatConversation.update({ where: { id: conversa.id }, data: { restaurantUnread: 0 }, select: { id: true } }),
  ]);
}

/**
 * Quantas mensagens de cliente estão esperando resposta, por pedido.
 *
 * A lista de pedidos do painel chama isto uma vez e distribui pelos
 * pedidos da página -- em vez de uma consulta por linha.
 */
export async function naoLidasPorPedido(restaurantId: string, orderIds: string[]): Promise<Map<string, number>> {
  if (orderIds.length === 0) return new Map();
  const conversas = await db.chatConversation.findMany({
    where: { restaurantId, orderId: { in: orderIds }, restaurantUnread: { gt: 0 } },
    select: { orderId: true, restaurantUnread: true },
  });
  return new Map(conversas.map((c) => [c.orderId, c.restaurantUnread]));
}

/** total de mensagens esperando resposta no restaurante; é o aviso do painel */
export async function contarNaoLidasDoRestaurante(restaurantId: string) {
  const r = await db.chatConversation.aggregate({
    where: { restaurantId, restaurantUnread: { gt: 0 }, order: { status: { notIn: ["COMPLETED", "CANCELED"] } } },
    _sum: { restaurantUnread: true },
    _count: { _all: true },
  });
  return { mensagens: r._sum.restaurantUnread ?? 0, conversas: r._count._all };
}
