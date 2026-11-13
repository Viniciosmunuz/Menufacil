import "server-only";

import { db } from "@/lib/db";
import { formatPhone } from "@/lib/format";

/**
 * As conversas que a IA teve, para o dono ver no painel.
 *
 * Até aqui o histórico só existia para a IA lembrar do contexto -- o dono
 * via as conversas no WhatsApp dele, e as do chat do cardápio não via em
 * lugar nenhum. Esta consulta é o que abre a gaveta: quem falou, o que foi
 * dito por último, e quantas mensagens.
 *
 * Serve para uma coisa prática além de ler: é desta lista que saem os
 * números das duas listas da IA. Em 11/11/2026 oito desconhecidos de
 * grupos de divulgação escreveram para o número do restaurante e foram
 * respondidos um por um; para calar cada um era preciso copiar o número do
 * WhatsApp e digitar no painel. Daqui é um toque.
 */

/** quanto tempo para trás a gaveta olha */
const DIAS = 30;
/** teto de conversas na lista: é uma gaveta, não um sistema de atendimento */
const CONVERSAS_MAX = 60;
/** teto de mensagens de uma conversa aberta */
const MENSAGENS_MAX = 200;

export type Papel = "CLIENTE" | "IA" | "HUMANO";

export type ResumoDeConversa = {
  /** a chave no histórico: o telefone, ou `web:<sessão>` no cardápio */
  contato: string;
  /** o telefone com DDI, só quando dá para pôr numa lista; vazio no cardápio */
  telefone: string;
  noCardapio: boolean;
  ultima: string;
  papel: Papel;
  quando: Date;
  total: number;
};

/**
 * A conversa veio do chat do cardápio?
 *
 * Lá não há telefone: o contato é a sessão do navegador, gravada com este
 * prefixo em `chat.ts`. É o que separa as duas origens -- e é por isso que
 * uma conversa do cardápio não pode ir para as listas: não há número para
 * pôr nelas.
 */
const doCardapio = (contato: string) => contato.startsWith("web:");

type Linha = { contato: string; texto: string; papel: Papel; createdAt: Date };

export async function conversasDaIa(restaurantId: string): Promise<ResumoDeConversa[]> {
  const desde = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000);

  // `DISTINCT ON` em vez de uma consulta por conversa: são até 60 contatos,
  // e 60 idas ao banco -- que está nos Estados Unidos -- seriam segundos de
  // espera numa gaveta que o dono abre de passagem.
  const [ultimas, contagens] = await Promise.all([
    db.$queryRaw<Linha[]>`
      SELECT DISTINCT ON (m."contato")
             m."contato", m."texto", m."papel"::text AS papel, m."createdAt"
      FROM "IaMensagem" m
      WHERE m."restaurantId" = ${restaurantId} AND m."createdAt" >= ${desde}
      ORDER BY m."contato", m."createdAt" DESC
    `,
    db.iaMensagem.groupBy({
      by: ["contato"],
      where: { restaurantId, createdAt: { gte: desde } },
      _count: { _all: true },
    }),
  ]);

  const quantas = new Map(contagens.map((c) => [c.contato, c._count._all]));

  return ultimas
    .map((l) => ({
      contato: l.contato,
      telefone: doCardapio(l.contato) ? "" : l.contato,
      noCardapio: doCardapio(l.contato),
      ultima: l.texto,
      papel: l.papel,
      quando: l.createdAt,
      total: quantas.get(l.contato) ?? 1,
    }))
    .sort((a, b) => b.quando.getTime() - a.quando.getTime())
    .slice(0, CONVERSAS_MAX);
}

export type Fala = { id: string; papel: Papel; texto: string; quando: Date };

/** o que foi dito numa conversa, da primeira mensagem para a última */
export async function falasDaConversa(restaurantId: string, contato: string): Promise<Fala[]> {
  const falas = await db.iaMensagem.findMany({
    where: { restaurantId, contato },
    orderBy: { createdAt: "desc" },
    take: MENSAGENS_MAX,
    select: { id: true, papel: true, texto: true, createdAt: true },
  });
  // de trás para a frente no banco (para o corte pegar as mais recentes) e
  // invertida aqui, que é como se lê uma conversa
  return falas
    .reverse()
    .map((f) => ({ id: f.id, papel: f.papel, texto: f.texto, quando: f.createdAt }));
}

/** quanto tempo um chamado continua valendo como aviso na tela */
const CHAMADO_VALE_MS = 3 * 60 * 60 * 1000;

export type ChamadoEsperando = {
  /** o que identifica este chamado; dispensado no aparelho, não volta */
  chave: string;
  contato: string;
  quem: string;
  motivo: string;
  quando: Date;
};

/**
 * Quem pediu para falar com uma pessoa e ainda não foi atendido.
 *
 * Três horas de validade, e não "tudo o que existe": o aviso serve para
 * quem está no balcão agora. Abrir o painel de manhã e encontrar no
 * canto o cliente que chamou às onze da noite não ajuda ninguém -- ele
 * já desistiu ou já foi atendido pelo celular.
 *
 * Não há campo de atendido no banco de propósito; quem dispensa é o
 * aparelho que viu, como no recado do chat.
 */
export async function chamadosEsperando(restaurantId: string): Promise<ChamadoEsperando[]> {
  const chamados = await db.iaChamado.findMany({
    where: { restaurantId, createdAt: { gte: new Date(Date.now() - CHAMADO_VALE_MS) } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, contato: true, nome: true, motivo: true, createdAt: true },
  });

  return chamados.map((c) => ({
    chave: c.id,
    contato: c.contato,
    quem: c.nome?.trim() || formatPhone(c.contato),
    motivo: c.motivo,
    quando: c.createdAt,
  }));
}
