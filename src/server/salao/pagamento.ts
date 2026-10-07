import "server-only";

import { db } from "@/lib/db";

// Receber a mesa.
//
// A conta do salão não tem uma forma de pagamento: tem as formas de quem
// estava sentado. Quatro pessoas dividindo pagam duas no cartão, uma no
// pix e uma em dinheiro, e a mesa só fecha quando a soma cobre o total.
// Por isso cada recebimento é uma linha própria, e não um campo na
// comanda -- um campo guardaria a última forma e apagaria as outras três.
//
// "Anotado" é pagamento como os outros para efeito de liberar a mesa: o
// cliente levantou e foi embora, a mesa está livre. No fechamento da noite
// ele aparece à parte, porque não passou pela gaveta nem pela máquina --
// é dinheiro que a casa ainda vai buscar.

export type FormaNaMesa = "DINHEIRO" | "PIX" | "CARTAO" | "ANOTADO";

export const FORMAS: { chave: FormaNaMesa; nome: string }[] = [
  { chave: "DINHEIRO", nome: "Dinheiro" },
  { chave: "PIX", nome: "Pix" },
  { chave: "CARTAO", nome: "Cartão" },
  { chave: "ANOTADO", nome: "Anotar" },
];

export const NOME_DA_FORMA: Record<FormaNaMesa, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO: "Cartão",
  ANOTADO: "Anotado",
};

export type PagamentoNaMesa = {
  id: string;
  forma: FormaNaMesa;
  nomeDaForma: string;
  centavos: number;
  recebidoPor: string | null;
  createdAt: Date;
};

export type Resultado = { ok: true } | { ok: false; error: string };

/** o que a comanda deve, segundo o que já foi lançado nela */
async function contaDaComanda(restaurantId: string, comandaId: string) {
  const c = await db.comanda.findFirst({
    where: { id: comandaId, restaurantId, fechadaAt: null },
    select: {
      id: true,
      servicoCents: true,
      descontoCents: true,
      orders: { where: { status: { not: "CANCELED" } }, select: { totalCents: true } },
      pagamentos: { select: { centavos: true } },
    },
  });
  if (!c) return null;

  const subtotal = c.orders.reduce((s, o) => s + o.totalCents, 0);
  const total = subtotal + c.servicoCents - c.descontoCents;
  const pago = c.pagamentos.reduce((s, p) => s + p.centavos, 0);
  return { total, pago, falta: Math.max(0, total - pago) };
}

/**
 * Lança um recebimento na mesa.
 *
 * Cobriu o total, a comanda vira PAGO -- não fechada. Fechar é liberar a
 * mesa para a próxima pessoa, e isso é decisão de quem está olhando o
 * salão, não consequência automática de uma soma: mesa paga com gente
 * ainda sentada não está livre.
 */
export async function receberNaMesa(
  restaurantId: string,
  comandaId: string,
  userId: string,
  forma: FormaNaMesa,
  centavos: number,
): Promise<Resultado> {
  if (!Number.isFinite(centavos) || centavos <= 0) return { ok: false, error: "Diga quanto está recebendo." };

  const conta = await contaDaComanda(restaurantId, comandaId);
  if (!conta) return { ok: false, error: "Mesa não encontrada." };
  if (conta.total <= 0) return { ok: false, error: "A mesa não tem nada lançado." };

  // receber mais do que a conta não é troco, é erro de digitação: o troco
  // sai da gaveta, não do sistema
  if (centavos > conta.falta) {
    return { ok: false, error: `Falta ${(conta.falta / 100).toFixed(2).replace(".", ",")} nesta mesa.` };
  }

  await db.$transaction(async (tx) => {
    await tx.pagamentoComanda.create({
      data: { comandaId, forma, centavos, recebidoPorId: userId },
      select: { id: true },
    });
    if (centavos >= conta.falta) {
      await tx.comanda.update({ where: { id: comandaId }, data: { status: "PAGO" }, select: { id: true } });
    }
  });

  return { ok: true };
}

/** desfaz um recebimento digitado errado; a mesa volta a ficar ocupada */
export async function desfazerRecebimento(restaurantId: string, pagamentoId: string): Promise<Resultado> {
  const p = await db.pagamentoComanda.findFirst({
    where: { id: pagamentoId, comanda: { restaurantId, fechadaAt: null } },
    select: { id: true, comandaId: true },
  });
  if (!p) return { ok: false, error: "Recebimento não encontrado." };

  await db.$transaction([
    db.pagamentoComanda.delete({ where: { id: p.id }, select: { id: true } }),
    db.comanda.update({ where: { id: p.comandaId }, data: { status: "OCUPADA" }, select: { id: true } }),
  ]);
  return { ok: true };
}

/**
 * Libera a mesa.
 *
 * Só com a conta coberta. Mesa liberada com saldo devedor é venda perdida
 * sem registro: no fim da noite o caixa não bate e ninguém sabe qual mesa
 * saiu sem pagar.
 */
export async function liberarMesa(restaurantId: string, comandaId: string): Promise<Resultado> {
  const conta = await contaDaComanda(restaurantId, comandaId);
  if (!conta) return { ok: false, error: "Mesa não encontrada." };
  if (conta.falta > 0) {
    return { ok: false, error: `Falta receber ${(conta.falta / 100).toFixed(2).replace(".", ",")} nesta mesa.` };
  }

  await db.comanda.update({ where: { id: comandaId }, data: { fechadaAt: new Date(), status: "PAGO" }, select: { id: true } });
  return { ok: true };
}

/**
 * Apaga um item da comanda.
 *
 * O que já saiu na impressora a cozinha começou a fazer, e apagar da tela
 * não desfaz o prato -- mas é exatamente o caso em que se precisa apagar
 * (cliente desistiu, garçom lançou na mesa errada). Então apaga, e é por
 * isso que a permissão nasce desligada: quem tira item da conta mexe no
 * que entra no caixa.
 *
 * Sobrando nenhum item, o pedido inteiro sai: pedido vazio apareceria na
 * cozinha e no relatório como uma venda de zero real.
 */
export async function apagarItemDaComanda(restaurantId: string, itemId: string, userId: string): Promise<Resultado> {
  const item = await db.orderItem.findFirst({
    where: { id: itemId, order: { restaurantId, origin: "SALAO", comanda: { fechadaAt: null } } },
    select: { id: true, totalCents: true, order: { select: { id: true, subtotalCents: true, totalCents: true, _count: { select: { items: true } } } } },
  });
  if (!item) return { ok: false, error: "Item não encontrado." };

  const pedido = item.order;

  if (pedido._count.items <= 1) {
    await db.order.update({
      where: { id: pedido.id },
      data: {
        status: "CANCELED",
        statusEvents: { create: { status: "CANCELED", note: "Item apagado na mesa", changedByUserId: userId } },
      },
      select: { id: true },
    });
    return { ok: true };
  }

  await db.$transaction([
    db.orderItem.delete({ where: { id: item.id }, select: { id: true } }),
    db.order.update({
      where: { id: pedido.id },
      data: {
        subtotalCents: Math.max(0, pedido.subtotalCents - item.totalCents),
        totalCents: Math.max(0, pedido.totalCents - item.totalCents),
      },
      select: { id: true },
    }),
  ]);
  return { ok: true };
}

/** desconto e acréscimo da mesa, em centavos */
export async function ajustarConta(restaurantId: string, comandaId: string, descontoCents: number, servicoCents: number): Promise<Resultado> {
  if (!Number.isFinite(descontoCents) || descontoCents < 0) return { ok: false, error: "Desconto inválido." };
  if (!Number.isFinite(servicoCents) || servicoCents < 0) return { ok: false, error: "Acréscimo inválido." };

  const c = await db.comanda.findFirst({
    where: { id: comandaId, restaurantId, fechadaAt: null },
    select: { id: true, orders: { where: { status: { not: "CANCELED" } }, select: { totalCents: true } } },
  });
  if (!c) return { ok: false, error: "Mesa não encontrada." };

  const subtotal = c.orders.reduce((s, o) => s + o.totalCents, 0);
  if (descontoCents > subtotal + servicoCents) return { ok: false, error: "O desconto é maior que a conta." };

  await db.comanda.update({ where: { id: c.id }, data: { descontoCents, servicoCents }, select: { id: true } });
  return { ok: true };
}
