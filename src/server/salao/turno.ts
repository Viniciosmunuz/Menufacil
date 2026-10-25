import "server-only";

import { db } from "@/lib/db";
import { NOME_DA_FORMA, type FormaNaMesa } from "@/server/salao/pagamento";

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
  /** anotado: saiu sem pagar, a casa cobra depois -- fora do que entrou */
  anotadoCents: number;
  naGavetaCents: number;
  mesas: number;
  ticketCents: number;
  garcom: { nome: string; mesas: number } | null;
  prato: { nome: string; quantidade: number } | null;
};

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
      // a forma sai daqui, não do pedido: o pedido do salão nasce antes de
      // alguém saber como a mesa vai pagar, e uma conta dividida tem três
      pagamentos: { select: { forma: true, centavos: true } },
      orders: {
        where: { status: { not: "CANCELED" } },
        select: { items: { select: { productName: true, quantity: true } } },
      },
    },
  });

  const porForma = new Map<FormaNaMesa, { forma: string; pedidos: number; centavos: number }>();
  const porGarcom = new Map<string, number>();
  const porPrato = new Map<string, number>();

  for (const c of comandas) {
    const nome = c.garcom?.name ?? "Sem garçom";
    porGarcom.set(nome, (porGarcom.get(nome) ?? 0) + 1);
    for (const p of c.pagamentos) {
      const forma = p.forma as FormaNaMesa;
      const linha = porForma.get(forma) ?? { forma: NOME_DA_FORMA[forma], pedidos: 0, centavos: 0 };
      linha.pedidos += 1;
      linha.centavos += p.centavos;
      porForma.set(forma, linha);
    }
    for (const o of c.orders) {
      for (const i of o.items) porPrato.set(i.productName, (porPrato.get(i.productName) ?? 0) + i.quantity);
    }
  }

  const pagas = [...porForma.entries()].filter(([f]) => f !== "ANOTADO");
  const linhas = pagas.map(([, l]) => l).sort((a, b) => b.centavos - a.centavos);
  const recebido = linhas.reduce((s, l) => s + l.centavos, 0);
  const anotado = porForma.get("ANOTADO")?.centavos ?? 0;
  const dinheiro = porForma.get("DINHEIRO")?.centavos ?? 0;

  const topGarcom = [...porGarcom.entries()].sort((a, b) => b[1] - a[1])[0];
  const topPrato = [...porPrato.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    abertoAt: caixa.abertoAt,
    fechadoAt: caixa.fechadoAt ?? new Date(),
    aberturaCents: caixa.aberturaCents,
    porForma: linhas,
    recebidoCents: recebido,
    anotadoCents: anotado,
    // só o dinheiro soma com o troco inicial: Pix e cartão não passam pela gaveta
    naGavetaCents: caixa.aberturaCents + dinheiro,
    mesas: comandas.length,
    // o ticket é por mesa, e o que ficou anotado também foi consumido:
    // tirá-lo da conta faria a noite parecer mais magra do que foi
    ticketCents: comandas.length > 0 ? Math.round((recebido + anotado) / comandas.length) : 0,
    garcom: topGarcom ? { nome: topGarcom[0], mesas: topGarcom[1] } : null,
    prato: topPrato ? { nome: topPrato[0], quantidade: topPrato[1] } : null,
  };
}

/**
 * Fecha o caixa da noite.
 *
 * Com `contado`, o dono conferiu a gaveta: o valor e a diferença ficam
 * gravados na linha do caixa, porque recalcular isso amanhã daria outro
 * número -- a noite seguinte já mexeu no dinheiro. Sem ele, fecha como
 * sempre fechou, e a diferença fica nula.
 *
 * A diferença é sempre contado menos esperado: negativa falta dinheiro,
 * positiva sobra. Ela não impede o fechamento -- quem decide o que fazer
 * com uma sobra de dois reais é o dono, não o sistema --, mas fica
 * registrada para a conversa do dia seguinte.
 */
export async function fecharTurno(
  restaurantId: string,
  userId: string,
  contado?: { dinheiroCents: number; esperadoCents: number; contagem?: Record<string, number> | null },
): Promise<ResultadoDoTurno & { caixaId?: string }> {
  const abertas = await db.comanda.count({ where: { restaurantId, fechadaAt: null, status: "OCUPADA" } });
  if (abertas > 0) {
    return { ok: false, error: `Ainda há ${abertas} ${abertas === 1 ? "mesa aberta" : "mesas abertas"}. Receba antes de fechar o caixa.` };
  }

  const aberto = await db.caixaSalao.findFirst({ where: { restaurantId, fechadoAt: null }, select: { id: true } });
  if (!aberto) return { ok: false, error: "O caixa não está aberto." };

  const conferencia = contado
    ? {
        fechamentoDinheiroCents: contado.dinheiroCents,
        fechamentoDiferencaCents: contado.dinheiroCents - contado.esperadoCents,
        fechamentoContagem: contado.contagem ?? undefined,
      }
    : {};

  await db.$transaction([
    db.caixaSalao.update({
      where: { id: aberto.id },
      data: { fechadoAt: new Date(), fechadoPorId: userId, ...conferencia },
      select: { id: true },
    }),
    // as mesas pagas voltam a ficar livres: o turno acabou
    db.comanda.updateMany({ where: { restaurantId, fechadaAt: null }, data: { fechadaAt: new Date() } }),
  ]);
  return { ok: true, caixaId: aberto.id };
}

export type ResultadoDoMovimento = { ok: true } | { ok: false; error: string };

/**
 * Dinheiro que entrou ou saiu da gaveta fora da venda.
 *
 * Sangria para o cofre, troco trazido de casa, a conta do gás paga na hora:
 * tudo isso mexe no que há na gaveta e não é venda nenhuma. Sem registrar,
 * o caixa fecha com uma diferença que ninguém sabe explicar -- e a diferença
 * sem explicação é o que faz o dono desconfiar da equipe inteira.
 */
export async function lancarMovimento(
  restaurantId: string,
  userId: string,
  tipo: "ENTRADA" | "SAIDA",
  centavos: number,
  motivo: string,
): Promise<ResultadoDoMovimento> {
  if (!Number.isInteger(centavos) || centavos <= 0) return { ok: false, error: "Diga um valor maior que zero." };
  const texto = motivo.trim().slice(0, 120);
  if (!texto) return { ok: false, error: "Diga o motivo: quem confere o caixa depois precisa saber." };

  const aberto = await db.caixaSalao.findFirst({ where: { restaurantId, fechadoAt: null }, select: { id: true } });
  if (!aberto) return { ok: false, error: "O caixa não está aberto." };

  await db.movimentoCaixa.create({
    data: { restaurantId, caixaId: aberto.id, tipo, centavos, motivo: texto, criadoPorId: userId },
    select: { id: true },
  });
  return { ok: true };
}

/** desfaz um lançamento digitado errado, enquanto o caixa está aberto */
export async function apagarMovimento(restaurantId: string, movimentoId: string): Promise<ResultadoDoMovimento> {
  const { count } = await db.movimentoCaixa.deleteMany({
    where: { id: movimentoId, restaurantId, caixa: { fechadoAt: null } },
  });
  if (count === 0) return { ok: false, error: "Lançamento não encontrado, ou o caixa já foi fechado." };
  return { ok: true };
}
