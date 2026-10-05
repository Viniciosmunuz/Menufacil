import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { startOfDaysAgo, startOfToday, todayKey, weekdayShort } from "@/lib/format";
import { inicioDaOperacao } from "@/lib/opening-hours";
import { OPEN_ORDER_STATUSES } from "@/lib/labels";
import { EXCLUDE_UNPAID } from "@/lib/order-flow";

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

export type FilaDeEspera = {
  quantos: number;
  /** o que espera há mais tempo, com os minutos já contados */
  maisAntigo: { number: number; minutos: number } | null;
};

/**
 * Os pedidos parados esperando alguém no balcão, e há quanto tempo.
 *
 * Os minutos são contados aqui e não na tela porque ler o relógio durante
 * o desenho de um componente é impuro -- e porque é a mesma razão de
 * `hojeContraOntem` viver neste arquivo: hora é dado, e dado se busca antes
 * de desenhar.
 *
 * O pedido do 100% Delivery que parou na tela do Pix fica de fora, pelo
 * mesmo motivo de sempre: carrinho abandonado não é fila.
 */
export async function filaDeEspera(escopo: Prisma.OrderWhereInput = {}): Promise<FilaDeEspera> {
  const where = { ...escopo, status: { in: [...OPEN_ORDER_STATUSES] }, ...EXCLUDE_UNPAID };
  const [quantos, maisAntigo] = await Promise.all([
    db.order.count({ where }),
    db.order.findFirst({ where, orderBy: { createdAt: "asc" }, select: { number: true, createdAt: true } }),
  ]);

  return {
    quantos,
    maisAntigo: maisAntigo
      ? { number: maisAntigo.number, minutos: Math.max(0, Math.floor((Date.now() - maisAntigo.createdAt.getTime()) / 60000)) }
      : null,
  };
}

export type LinhaDoFechamento = {
  method: PaymentMethod;
  /** onde o dinheiro está: já na conta, em mãos, ou ainda por confirmar */
  onde: "na-conta" | "em-maos" | "a-confirmar";
  pedidos: number;
  centavos: number;
};

export type Fechamento = { linhas: LinhaDoFechamento[]; totalCentavos: number; totalPedidos: number };

/**
 * O caixa da noite, separado por onde o dinheiro está.
 *
 * "Vendido hoje" é um número só, e no fim da noite ele não fecha nada: no
 * 100% Delivery o Pix já caiu na conta do Mercado Pago, o dinheiro voltou
 * na mão do entregador e o cartão passou na maquininha. São três lugares
 * diferentes, e quem vai conferir precisa saber quanto tem em cada um.
 *
 * Pedido cancelado não entra, e o que ainda espera o Pix também não --
 * ninguém fecha caixa com venda que talvez não aconteça.
 *
 * A janela é o turno, não o dia do calendário. O Papaléguas fecha às 00:00,
 * e quem for conferir o caixa às 00:30 -- que é a hora em que se confere
 * caixa -- cairia num "hoje" recém-nascido, com a noite inteira do outro
 * lado da meia-noite e a tela mostrando zero.
 */
export async function fechamentoDoDia(
  escopo: Prisma.OrderWhereInput = {},
  horarios: { weekday: number; opensAt: string; closesAt: string; closed: boolean }[] = [],
): Promise<Fechamento> {
  const pedidos = await db.order.findMany({
    // os dois status num `notIn` só: espalhar VALE aqui e pôr outro `status`
    // ao lado apagaria o primeiro, e o cancelado voltaria para a conta do
    // caixa sem ninguém perceber
    where: { ...escopo, status: { notIn: ["CANCELED", "AWAITING_PAYMENT"] }, createdAt: { gte: inicioDaOperacao(horarios) } },
    select: { totalCents: true, paymentMethod: true, payment: { select: { status: true } } },
  });

  const porChave = new Map<string, LinhaDoFechamento>();
  for (const p of pedidos) {
    // o Pix só está na conta quando alguém confirmou: o Mercado Pago no
    // 100% Delivery, ou o próprio restaurante no fluxo do WhatsApp
    const onde: LinhaDoFechamento["onde"] =
      p.paymentMethod === "PIX" ? (p.payment?.status === "CONFIRMED" ? "na-conta" : "a-confirmar") : "em-maos";
    const chave = `${p.paymentMethod}:${onde}`;
    const linha = porChave.get(chave) ?? { method: p.paymentMethod, onde, pedidos: 0, centavos: 0 };
    linha.pedidos += 1;
    linha.centavos += p.totalCents;
    porChave.set(chave, linha);
  }

  const linhas = [...porChave.values()].sort((a, b) => b.centavos - a.centavos);
  return {
    linhas,
    totalCentavos: linhas.reduce((s, l) => s + l.centavos, 0),
    totalPedidos: linhas.reduce((s, l) => s + l.pedidos, 0),
  };
}

export type ClienteDoMes = {
  id: string;
  nome: string;
  whatsapp: string;
  pedidos: number;
  centavos: number;
  /** já pedia antes deste mês: é o que separa fregês de cliente novo */
  jaPediaAntes: boolean;
};

export type QuemMaisPede = {
  clientes: ClienteDoMes[];
  /** quantos pedidos do mês vieram de quem já tinha pedido antes */
  deQuemVoltou: number;
  totalDePedidos: number;
};

/**
 * Quem sustenta o restaurante neste mês.
 *
 * O painel sabia dizer quais PRATOS mais saem, e não sabia dizer quem os
 * compra. Para um restaurante de bairro essa é a informação que fica de
 * fora de todo sistema e que o dono tem na cabeça pela metade: quem é o
 * cliente de toda semana, quem sumiu, quem acabou de chegar.
 *
 * Vem com o WhatsApp porque é assim que esse dono fala com o cliente dele --
 * agradecer, avisar de uma promoção, perguntar por que sumiu. O número já
 * estava em cada pedido; o que faltava era juntar.
 *
 * "Já pedia antes" é olhado fora da janela do mês: quem fez o primeiro
 * pedido ontem é cliente novo, e isso é uma notícia diferente de um cliente
 * de um ano que voltou.
 */
export async function quemMaisPede(restaurantId: string, desde: Date, limite = 5): Promise<QuemMaisPede> {
  const doMes = await db.order.groupBy({
    by: ["customerId"],
    where: { restaurantId, ...VALE, createdAt: { gte: desde } },
    _count: { _all: true },
    _sum: { totalCents: true },
    orderBy: { _count: { customerId: "desc" } },
  });
  if (doMes.length === 0) return { clientes: [], deQuemVoltou: 0, totalDePedidos: 0 };

  const ids = doMes.map((c) => c.customerId);
  const [pessoas, antigos] = await Promise.all([
    db.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, whatsapp: true } }),
    // quem já havia pedido NESTE restaurante antes da janela
    db.order.groupBy({
      by: ["customerId"],
      where: { restaurantId, ...VALE, customerId: { in: ids }, createdAt: { lt: desde } },
      _count: { _all: true },
    }),
  ]);

  const nomes = new Map(pessoas.map((p) => [p.id, p]));
  const jaPedia = new Set(antigos.map((a) => a.customerId));

  const clientes = doMes
    .map((c) => ({
      id: c.customerId,
      nome: nomes.get(c.customerId)?.name ?? "Cliente",
      whatsapp: nomes.get(c.customerId)?.whatsapp ?? "",
      pedidos: c._count._all,
      centavos: c._sum.totalCents ?? 0,
      jaPediaAntes: jaPedia.has(c.customerId),
    }))
    // empate em pedidos desempata por quanto gastou
    .sort((a, b) => b.pedidos - a.pedidos || b.centavos - a.centavos);

  return {
    clientes: clientes.slice(0, limite),
    deQuemVoltou: clientes.reduce((s, c) => (c.jaPediaAntes ? s + c.pedidos : s), 0),
    totalDePedidos: clientes.reduce((s, c) => s + c.pedidos, 0),
  };
}
