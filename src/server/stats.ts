import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { startOfDaysAgo, startOfToday, todayKey, weekdayShort } from "@/lib/format";

// Números das telas de visão geral.
//
// O agrupamento por dia é feito aqui, em memória, e não no banco: a coluna
// guarda o instante em UTC, e no fuso de Manaus um pedido das 21h de
// sábado cairia no domingo se o banco cortasse o dia sozinho. São poucos
// pedidos numa semana, então buscar e contar aqui sai barato e certo.

/** pedido que conta como venda: cancelado não entra em nada */
const VALE = { status: { not: "CANCELED" } } satisfies Prisma.OrderWhereInput;

export type DiaDaSemana = { key: string; label: string; pedidos: number; centavos: number; hoje: boolean };

export async function semanaDePedidos(escopo: Prisma.OrderWhereInput = {}): Promise<DiaDaSemana[]> {
  const pedidos = await db.order.findMany({
    where: { ...escopo, ...VALE, createdAt: { gte: startOfDaysAgo(6) } },
    select: { createdAt: true, totalCents: true },
  });

  const inicioDeHoje = startOfToday().getTime();
  const dias: DiaDaSemana[] = Array.from({ length: 7 }, (_, i) => {
    const data = new Date(inicioDeHoje - (6 - i) * 24 * 60 * 60 * 1000);
    return { key: todayKey(data), label: weekdayShort(data), pedidos: 0, centavos: 0, hoje: i === 6 };
  });

  const porDia = new Map(dias.map((d) => [d.key, d]));
  for (const p of pedidos) {
    const dia = porDia.get(todayKey(p.createdAt));
    if (!dia) continue;
    dia.pedidos += 1;
    dia.centavos += p.totalCents;
  }
  return dias;
}

export type Comparacao = { hoje: number; ontem: number; centavosHoje: number; centavosOntem: number };

/**
 * Hoje contra ontem **até a mesma hora**.
 *
 * Um número sozinho não diz se o dia está bom. Mas comparar a manhã de
 * hoje com o dia inteiro de ontem também não: às 9h o painel diria "-100%"
 * todo santo dia, o que é verdade e não serve para nada. Cortando ontem no
 * mesmo relógio, "+50%" quer dizer mesmo que hoje está melhor.
 */
export async function hojeContraOntem(escopo: Prisma.OrderWhereInput = {}): Promise<Comparacao> {
  const agora = new Date();
  const inicioDeHoje = startOfToday(agora);
  const inicioDeOntem = startOfDaysAgo(1, agora);
  const mesmaHoraOntem = new Date(inicioDeOntem.getTime() + (agora.getTime() - inicioDeHoje.getTime()));

  const [hoje, ontem] = await Promise.all([
    db.order.aggregate({ _count: { _all: true }, _sum: { totalCents: true }, where: { ...escopo, ...VALE, createdAt: { gte: inicioDeHoje } } }),
    db.order.aggregate({
      _count: { _all: true },
      _sum: { totalCents: true },
      where: { ...escopo, ...VALE, createdAt: { gte: inicioDeOntem, lt: mesmaHoraOntem } },
    }),
  ]);

  return {
    hoje: hoje._count._all,
    ontem: ontem._count._all,
    centavosHoje: hoje._sum.totalCents ?? 0,
    centavosOntem: ontem._sum.totalCents ?? 0,
  };
}

/**
 * De quanto cresceu, em porcento. Devolve null quando não dá para comparar:
 * sem base ontem, "subiu 100%" com um pedido só engana mais do que informa.
 */
export function variacao(hoje: number, ontem: number) {
  if (ontem === 0) return null;
  return Math.round(((hoje - ontem) / ontem) * 100);
}
