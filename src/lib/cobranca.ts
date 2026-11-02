import type { Plan } from "@/generated/prisma/enums";

import { TIME_ZONE } from "./format";

// Mensalidade: em que plano o restaurante está, quanto deve e se está em dia.
//
// Isto é o registro de uma cobrança que acontece fora daqui (Pix, combinado,
// dinheiro). O sistema não cobra ninguém e não corta nada sozinho: ele
// lembra o que foi recebido e avisa quem passou do dia. Cortar restaurante
// aberto por engano de cadastro custaria muito mais do que o atraso.

/**
 * Os dois planos que o MenuFácil vende.
 *
 * O que separa um do outro é a IA: o Delivery é o cardápio, os pedidos e o
 * Pix dentro do aplicativo; o IA é tudo isso com o atendimento automático
 * no WhatsApp. Salão e Totem não são planos -- são módulos sob consulta,
 * combinados caso a caso e ligados pelas chaves do restaurante.
 *
 * O plano manda só na mensalidade. Quem liga recurso são as chaves do
 * restaurante (fullDeliveryEnabled, salaoEnabled, totemEnabled...), e é por
 * isso que trocar de plano não tira nada de ninguém.
 */
export const PLANOS: Record<Plan, { nome: string; centavos: number; resumo: string }> = {
  DELIVERY: {
    nome: "Menu Fácil Delivery",
    centavos: 120_00,
    resumo: "Cardápio digital, pedidos pelo link e Pix pago dentro do próprio aplicativo.",
  },
  IA: {
    nome: "Menu Fácil IA",
    centavos: 199_90,
    resumo: "Tudo do Delivery, com a Menu Fácil IA atendendo o WhatsApp do restaurante.",
  },
};

/** "2026-10": o mês a que uma mensalidade se refere */
export function competenciaDe(date = new Date()) {
  const [{ value: ano }, , { value: mes }] = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  return `${ano}-${mes}`;
}

/** "outubro de 2026", para a tela */
export function competenciaLabel(competencia: string) {
  const [ano, mes] = competencia.split("-").map(Number);
  const nomes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${nomes[mes - 1] ?? "?"} de ${ano}`;
}

export type SituacaoDaCobranca =
  | { estado: "sem-plano" }
  | { estado: "pago"; competencia: string; centavos: number; pagoEm: Date }
  | { estado: "a-vencer"; competencia: string; centavos: number; vence: number; faltam: number }
  | { estado: "vencido"; competencia: string; centavos: number; vence: number; diasEmAtraso: number };

/** o dia de hoje no fuso da plataforma; o vencimento é por dia, não por hora */
function diaDeHoje(now: Date) {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, day: "2-digit" }).format(now));
}

/**
 * Como está a mensalidade deste restaurante neste mês.
 *
 * O dia do vencimento é um número de 1 a 31, e fevereiro existe: um
 * restaurante que vence dia 31 vence no último dia do mês, não no dia 3 do
 * mês seguinte.
 */
export function situacaoDaCobranca(
  restaurante: { plan: Plan | null; billingDay: number | null },
  pagamentoDoMes: { amountCents: number; paidAt: Date } | null,
  now = new Date(),
): SituacaoDaCobranca {
  if (!restaurante.plan || !restaurante.billingDay) return { estado: "sem-plano" };

  const competencia = competenciaDe(now);
  const centavos = PLANOS[restaurante.plan].centavos;
  if (pagamentoDoMes) {
    return { estado: "pago", competencia, centavos: pagamentoDoMes.amountCents, pagoEm: pagamentoDoMes.paidAt };
  }

  const [ano, mes] = competencia.split("-").map(Number);
  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const vence = Math.min(restaurante.billingDay, ultimoDiaDoMes);
  const hoje = diaDeHoje(now);

  // o dia do vencimento ainda é prazo, não atraso: quem vence dia 10 tem o
  // dia 10 inteiro para pagar, e só aparece em vermelho no dia 11
  return hoje <= vence
    ? { estado: "a-vencer", competencia, centavos, vence, faltam: vence - hoje }
    : { estado: "vencido", competencia, centavos, vence, diasEmAtraso: hoje - vence };
}

/** quanto a plataforma espera receber por mês, somando os planos ativos */
export const receitaPrevista = (restaurantes: { plan: Plan | null; billingDay: number | null }[]) =>
  restaurantes.reduce((soma, r) => (r.plan && r.billingDay ? soma + PLANOS[r.plan].centavos : soma), 0);
