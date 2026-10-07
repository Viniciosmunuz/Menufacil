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
export type FechamentoDaNoite = {
  abertoAt: Date;
  fechadoAt: Date;
  aberturaCents: number;
  porForma: { forma: string; pedidos: number; centavos: number }[];
  recebidoCents: number;
  naGavetaCents: number;
  mesas: number;
  ticketCents: number;
  garcom: { nome: string; mesas: number } | null;
  prato: { nome: string; quantidade: number } | null;
};

const NOME_DA_FORMA: Record<string, string> = { CASH: "Dinheiro", PIX: "Pix", CARD: "Cartao" };

/**
 * Os números da noite, para o papel do fechamento.
 *
 * Tudo sai do que já está gravado: o sistema sabe quanto entrou em cada
 * forma, quantas mesas passaram e qual prato mais saiu. Pedir ao dono que
 * digitasse o valor contado seria pedir que ele repetisse uma conta que o
 * papel traz pronta.
 */
export async function numerosDaNoite(restaurantId: string, caixaId: string): Promise<FechamentoDaNoite | null> {
  const caixa = await db.caixaSalao.findFirst({
    where: { id: caixaId, restaurantId },
    select: { abertoAt: true, fechadoAt: true, aberturaCents: true },
  });
  if (!caixa) return null;

  const comandas = await db.comanda.findMany({
    where: { restaurantId, abertaAt: { gte: caixa.abertoAt }, status: "PAGO" },
    select: {
      garcom: { select: { name: true } },
      orders: {
        where: { status: { not: "CANCELED" } },
        select: { totalCents: true, paymentMethod: true, items: { select: { productName: true, quantity: true } } },
      },
    },
  });

  const porForma = new Map<string, { forma: string; pedidos: number; centavos: number }>();
  const porGarcom = new Map<string, number>();
  const porPrato = new Map<string, number>();

  for (const c of comandas) {
    const nome = c.garcom?.name ?? "Sem garçom";
    porGarcom.set(nome, (porGarcom.get(nome) ?? 0) + 1);
    for (const o of c.orders) {
      const chave = NOME_DA_FORMA[o.paymentMethod] ?? o.paymentMethod;
      const linha = porForma.get(chave) ?? { forma: chave, pedidos: 0, centavos: 0 };
      linha.pedidos += 1;
      linha.centavos += o.totalCents;
      porForma.set(chave, linha);
      for (const i of o.items) porPrato.set(i.productName, (porPrato.get(i.productName) ?? 0) + i.quantity);
    }
  }

  const linhas = [...porForma.values()].sort((a, b) => b.centavos - a.centavos);
  const recebido = linhas.reduce((s, l) => s + l.centavos, 0);
  const dinheiro = porForma.get("Dinheiro")?.centavos ?? 0;

  const topGarcom = [...porGarcom.entries()].sort((a, b) => b[1] - a[1])[0];
  const topPrato = [...porPrato.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    abertoAt: caixa.abertoAt,
    fechadoAt: caixa.fechadoAt ?? new Date(),
    aberturaCents: caixa.aberturaCents,
    porForma: linhas,
    recebidoCents: recebido,
    // só o dinheiro soma com o troco inicial: Pix e cartão não passam pela gaveta
    naGavetaCents: caixa.aberturaCents + dinheiro,
    mesas: comandas.length,
    ticketCents: comandas.length > 0 ? Math.round(recebido / comandas.length) : 0,
    garcom: topGarcom ? { nome: topGarcom[0], mesas: topGarcom[1] } : null,
    prato: topPrato ? { nome: topPrato[0], quantidade: topPrato[1] } : null,
  };
}

export async function fecharTurno(restaurantId: string, userId: string): Promise<ResultadoDoTurno & { caixaId?: string }> {
  const abertas = await db.comanda.count({ where: { restaurantId, fechadaAt: null, status: "OCUPADA" } });
  if (abertas > 0) {
    return { ok: false, error: `Ainda há ${abertas} ${abertas === 1 ? "mesa aberta" : "mesas abertas"}. Receba antes de fechar o caixa.` };
  }

  const aberto = await db.caixaSalao.findFirst({ where: { restaurantId, fechadoAt: null }, select: { id: true } });
  if (!aberto) return { ok: false, error: "O caixa não está aberto." };

  await db.$transaction([
    db.caixaSalao.update({ where: { id: aberto.id }, data: { fechadoAt: new Date(), fechadoPorId: userId }, select: { id: true } }),
    // as mesas pagas voltam a ficar livres: o turno acabou
    db.comanda.updateMany({ where: { restaurantId, fechadaAt: null }, data: { fechadaAt: new Date() } }),
  ]);
  return { ok: true, caixaId: aberto.id };
}
