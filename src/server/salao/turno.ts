import "server-only";

import { db } from "@/lib/db";

// O turno do salão: aberto por alguém, fechado por alguém.
//
// Enquanto não há caixa aberto, o salão não opera. Não é burocracia: o
// garçom lançando pedido num turno que ninguém abriu produz uma noite de
// vendas sem dono, que no fim não bate com a gaveta e não dá para auditar.
// Fechado, ele entra e vê que está fechado -- e sabe que a conversa é com
// o balcão, não com o aplicativo.

export type TurnoAberto = {
  id: string;
  abertoAt: Date;
  aberturaCents: number;
  abertoPor: string | null;
};

/** o caixa aberto agora, ou nada */
export async function turnoAberto(restaurantId: string): Promise<TurnoAberto | null> {
  const c = await db.caixaSalao.findFirst({
    where: { restaurantId, fechadoAt: null },
    orderBy: { abertoAt: "desc" },
    select: { id: true, abertoAt: true, aberturaCents: true, abertoPor: { select: { name: true } } },
  });
  return c ? { id: c.id, abertoAt: c.abertoAt, aberturaCents: c.aberturaCents, abertoPor: c.abertoPor?.name ?? null } : null;
}

export type ResultadoDoTurno = { ok: true } | { ok: false; error: string };

/**
 * Abre o caixa com o dinheiro que já está na gaveta.
 *
 * O valor inicial não é detalhe: sem ele, a conferência do fim da noite
 * não fecha, porque o que está na gaveta é o troco do começo mais o que
 * entrou. Pode ser zero -- há casa que começa sem troco --, mas é uma
 * resposta, não um campo pulado.
 */
export async function abrirTurno(restaurantId: string, userId: string, aberturaCents: number): Promise<ResultadoDoTurno> {
  if (!Number.isFinite(aberturaCents) || aberturaCents < 0) return { ok: false, error: "Diga quanto tem de dinheiro na gaveta." };

  const jaAberto = await db.caixaSalao.findFirst({ where: { restaurantId, fechadoAt: null }, select: { id: true } });
  if (jaAberto) return { ok: false, error: "O caixa já está aberto." };

  await db.caixaSalao.create({
    data: { restaurantId, abertoPorId: userId, aberturaCents },
    select: { id: true },
  });
  return { ok: true };
}

/**
 * Fecha o caixa da noite.
 *
 * Mesa aberta impede: fechar o turno com conta em aberto deixaria a venda
 * fora do fechamento e a mesa pendurada para o dia seguinte.
 */
export async function fecharTurno(restaurantId: string, userId: string, fechamentoCents: number): Promise<ResultadoDoTurno> {
  const abertas = await db.comanda.count({ where: { restaurantId, fechadaAt: null, status: "OCUPADA" } });
  if (abertas > 0) {
    return { ok: false, error: `Ainda há ${abertas} ${abertas === 1 ? "mesa aberta" : "mesas abertas"}. Receba antes de fechar o caixa.` };
  }

  const aberto = await db.caixaSalao.findFirst({ where: { restaurantId, fechadoAt: null }, select: { id: true } });
  if (!aberto) return { ok: false, error: "O caixa não está aberto." };

  await db.$transaction([
    db.caixaSalao.update({
      where: { id: aberto.id },
      data: { fechadoAt: new Date(), fechadoPorId: userId, fechamentoCents },
      select: { id: true },
    }),
    // as mesas pagas voltam a ficar livres: o turno acabou
    db.comanda.updateMany({ where: { restaurantId, fechadaAt: null }, data: { fechadaAt: new Date() } }),
  ]);
  return { ok: true };
}
