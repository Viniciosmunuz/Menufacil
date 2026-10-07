import "server-only";

import type { LugarTipo, MesaStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

// O salão visto de cima: cada lugar com o que está acontecendo nele agora.
//
// O valor de uma mesa não fica guardado na comanda. Ele é a soma dos
// pedidos que o garçom já mandou para a cozinha -- e esses pedidos são os
// mesmos Order do delivery, só que com origem SALAO e apontando para a
// comanda. Somar na hora evita o pior defeito que um sistema de mesa pode
// ter: um total guardado que discorda dos itens, descoberto na hora de
// fechar a conta, com o cliente de pé esperando.
//
// Três estados, e não cinco: livre, ocupada e paga. "Pediu a conta" e
// "pagando" eram passos que o sistema inventava e alguém tinha de manter em
// dia na tela, em troca de nada -- a cor já diz o que importa.

export type LugarNoMapa = {
  id: string;
  tipo: LugarTipo;
  numero: number;
  nome: string | null;
  lugares: number;
  status: MesaStatus;
  /** o que já foi lançado, em centavos; zero no lugar livre */
  centavos: number;
  itens: number;
  /** há quantos minutos está ocupado */
  minutos: number | null;
  garcom: string | null;
  comandaId: string | null;
};

export type ResumoDoSalao = {
  mesas: LugarNoMapa[];
  balcoes: LugarNoMapa[];
  ocupados: number;
  livres: number;
  pagos: number;
  /** o que está aberto nas mesas agora, em centavos */
  abertoCents: number;
};

export async function mapaDoSalao(restaurantId: string, agora = new Date()): Promise<ResumoDoSalao> {
  const lugares = await db.mesa.findMany({
    where: { restaurantId, ativa: true },
    orderBy: [{ tipo: "asc" }, { sortOrder: "asc" }, { numero: "asc" }],
    select: {
      id: true,
      tipo: true,
      numero: true,
      nome: true,
      lugares: true,
      // a comanda aberta, quando há: é ela que diz se o lugar está ocupado
      comandas: {
        where: { fechadaAt: null },
        orderBy: { abertaAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          abertaAt: true,
          garcom: { select: { name: true } },
          orders: {
            where: { status: { not: "CANCELED" } },
            select: { totalCents: true, items: { select: { quantity: true } } },
          },
        },
      },
    },
  });

  const noMapa: LugarNoMapa[] = lugares.map((m) => {
    const comanda = m.comandas[0];
    const base = { id: m.id, tipo: m.tipo, numero: m.numero, nome: m.nome, lugares: m.lugares };

    if (!comanda) {
      return { ...base, status: "LIVRE" as const, centavos: 0, itens: 0, minutos: null, garcom: null, comandaId: null };
    }

    return {
      ...base,
      status: comanda.status,
      centavos: comanda.orders.reduce((s, o) => s + o.totalCents, 0),
      itens: comanda.orders.reduce((s, o) => s + o.items.reduce((q, i) => q + i.quantity, 0), 0),
      minutos: Math.max(0, Math.floor((agora.getTime() - comanda.abertaAt.getTime()) / 60000)),
      garcom: comanda.garcom?.name ?? null,
      comandaId: comanda.id,
    };
  });

  return {
    mesas: noMapa.filter((m) => m.tipo === "MESA"),
    balcoes: noMapa.filter((m) => m.tipo === "BALCAO"),
    livres: noMapa.filter((m) => m.status === "LIVRE").length,
    ocupados: noMapa.filter((m) => m.status === "OCUPADA").length,
    pagos: noMapa.filter((m) => m.status === "PAGO").length,
    abertoCents: noMapa.reduce((s, m) => s + m.centavos, 0),
  };
}
