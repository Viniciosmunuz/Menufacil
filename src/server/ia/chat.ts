import "server-only";

import { db } from "@/lib/db";
import { conhecimentoDoRestaurante } from "./conhecimento";
import { responder, type Turno } from "./responder";

/**
 * A IA no chat do cardápio.
 *
 * O mesmo cérebro do WhatsApp (`conhecimento` + `responder`), falando pelo
 * link que o cliente já abre. Nasceu porque a Meta recusa o envio desta
 * conta para números brasileiros (erro 130497) e a IA inteira ficou refém
 * de um bloqueio que não é nosso -- aqui não há Meta, não há número, não há
 * provedor: o cliente escreve na página e a resposta volta na mesma
 * requisição.
 *
 * **Não usa o `atender()` do WhatsApp de propósito.** Metade das regras de
 * lá existe por causa do telefone: a lista de quem a IA ignora, o silêncio
 * de 30 minutos quando alguém responde pelo celular do restaurante, o
 * desconto do "9" do DDD. Nada disso faz sentido numa aba do navegador, e
 * forçar os dois no mesmo caminho deixaria os dois piores.
 *
 * O que vale aqui:
 * - só responde se o dono ligou a chave `noChat` daquele restaurante;
 * - fechado é silêncio, igual ao WhatsApp;
 * - teto de respostas por sessão, para uma aba aberta não virar torneira;
 * - **não cria pedido** por enquanto: conversa, tira dúvida e empurra para
 *   o cardápio. Criar pedido pelo chat é decisão de outra rodada.
 */

/** o teto por sessão, na janela de uma hora */
const RESPOSTAS_POR_HORA = 20;
/** quanto da conversa anterior vai junto para o modelo */
const HISTORICO = 16;
/** o tamanho máximo de uma mensagem do cliente */
const TEXTO_MAX = 1200;

export type RespostaDoChat =
  | { ok: true; texto: string; anexos: string[] }
  | { ok: false; motivo: "desligada" | "fechado" | "teto" | "vazio" | "falha" };

/**
 * O contato no histórico. A sessão vem do navegador e serve só para a IA
 * lembrar do que já foi dito naquela aba -- não identifica ninguém, e o
 * prefixo deixa claro no banco que aquela linha veio da web, não do
 * WhatsApp.
 */
const contatoDaSessao = (sessao: string) => `web:${sessao.slice(0, 60)}`;

export async function conversarNoCardapio(params: {
  restaurantId: string;
  sessao: string;
  texto: string;
}): Promise<RespostaDoChat> {
  const texto = params.texto.slice(0, TEXTO_MAX).trim();
  if (!texto) return { ok: false, motivo: "vazio" };

  const atendente = await db.atendenteIa.findUnique({
    where: { restaurantId: params.restaurantId },
    select: { noChat: true },
  });
  if (!atendente?.noChat) return { ok: false, motivo: "desligada" };

  const contato = contatoDaSessao(params.sessao);
  const agora = Date.now();

  const respostasNaHora = await db.iaMensagem.count({
    where: {
      restaurantId: params.restaurantId,
      contato,
      papel: "IA",
      createdAt: { gte: new Date(agora - 60 * 60_000) },
    },
  });
  if (respostasNaHora >= RESPOSTAS_POR_HORA) return { ok: false, motivo: "teto" };

  // Fechado é silêncio, como no WhatsApp: a IA não inventa horário nem
  // promete entrega que a cozinha não vai fazer.
  const conhecimento = await conhecimentoDoRestaurante(params.restaurantId, {
    comIds: false,
  });
  if (!conhecimento) return { ok: false, motivo: "falha" };
  if (!conhecimento.aberto) return { ok: false, motivo: "fechado" };

  await db.iaMensagem.create({
    data: { restaurantId: params.restaurantId, contato, papel: "CLIENTE", texto },
  });

  const recentes = await db.iaMensagem.findMany({
    where: {
      restaurantId: params.restaurantId,
      contato,
      createdAt: { gte: new Date(agora - 24 * 60 * 60_000) },
    },
    orderBy: { createdAt: "desc" },
    take: HISTORICO,
    select: { papel: true, texto: true },
  });
  const conversa: Turno[] = recentes
    .reverse()
    .map((r) => ({
      papel: r.papel === "CLIENTE" ? "cliente" : "atendente",
      texto: r.texto,
    }));

  const resposta = await responder({ conhecimento, conversa, canal: "cardapio" });
  if (!resposta) return { ok: false, motivo: "falha" };

  await db.iaMensagem.create({
    data: {
      restaurantId: params.restaurantId,
      contato,
      papel: "IA",
      texto: resposta.texto,
    },
  });

  // só números, para acompanhar o custo: nada do conteúdo da conversa
  console.info(
    `[ia/chat] respondeu (${resposta.modelo}): ${resposta.tokens.entrada} entrada, ${resposta.tokens.cache} do cache, ${resposta.tokens.saida} saída`,
  );

  return { ok: true, texto: resposta.texto, anexos: resposta.anexos };
}

/** O dono ligou a IA no cardápio deste restaurante? */
export async function iaNoCardapioLigada(restaurantId: string) {
  const a = await db.atendenteIa.findUnique({
    where: { restaurantId },
    select: { noChat: true },
  });
  return a?.noChat ?? false;
}
