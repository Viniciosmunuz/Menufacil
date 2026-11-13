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
/**
 * O teto do restaurante inteiro no chat do cardápio, por hora.
 *
 * O teto por sessão sozinho não segura ninguém mal-intencionado: a
 * sessão é um texto que o navegador inventa, então um script que troque
 * de sessão a cada chamada conversa sem limite -- e cada resposta é
 * crédito da Anthropic saindo da conta do MenuFácil.
 *
 * Trezentas respostas por hora é muito mais do que um restaurante cheio
 * usa (são cinco por minuto, a hora inteira), e é um prejuízo com fim
 * para o pior caso. Quem bate aqui ouve o mesmo recado do teto por
 * sessão, e o WhatsApp não é afetado: a conta olha só as conversas da
 * web.
 */
const RESPOSTAS_POR_HORA_DO_RESTAURANTE = 300;
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

  const doRestauranteNaHora = await db.iaMensagem.count({
    where: {
      restaurantId: params.restaurantId,
      contato: { startsWith: "web:" },
      papel: "IA",
      createdAt: { gte: new Date(agora - 60 * 60_000) },
    },
  });
  if (doRestauranteNaHora >= RESPOSTAS_POR_HORA_DO_RESTAURANTE) {
    console.warn(`[ia/chat] teto do restaurante ${params.restaurantId} atingido: ${doRestauranteNaHora} respostas na hora`);
    return { ok: false, motivo: "teto" };
  }

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
