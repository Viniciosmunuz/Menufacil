import "server-only";

import { db } from "@/lib/db";

import { criarPedidoDoTotem, TotemError, type ItemDoTotem } from "./pedido";

// Pagamento que entrou e pedido que não entrou.
//
// É o pior caso do totem, e ele existe: a maquininha aprova, e entre a
// aprovação e a gravação do pedido alguma coisa dá errado -- o produto
// esgotou naquele segundo, o banco piscou, o restaurante foi fechado no
// painel. O dinheiro do cliente já saiu.
//
// O servidor não perde isso: a linha fica APPROVED, sem orderId, com o
// motivo guardado. O que faltava era o balcão enxergar. Enquanto ninguém
// der baixa, o pagamento aparece no painel pedindo conta.
//
// Há dois jeitos de resolver, e os dois estão aqui:
//
// - **Gravar o pedido**: tenta de novo, com o mesmo carrinho que o cliente
//   montou. Resolve o caso comum (o item voltou, o banco voltou) e é o que
//   o balcão quer na maioria das vezes -- o cliente está ali esperando.
// - **Dar baixa**: o balcão resolveu por fora (devolveu o dinheiro, ou
//   entregou a comida na mão e anotou). Fica registrado quem resolveu e
//   como, para a conta do dia fechar.

export type PagamentoSemPedido = {
  id: string;
  metodo: "CARD" | "PIX";
  valorCents: number;
  pagoEm: Date | null;
  criadoEm: Date;
  /** o que o Mercado Pago chama este pagamento; serve para achar no extrato */
  mpPaymentId: string | null;
  /** por que o pedido não entrou, do jeito que ficou gravado */
  motivo: string | null;
  cliente: string;
  comerAqui: boolean;
  observacao: string | null;
  itens: { nome: string; quantidade: number }[];
};

type Carrinho = {
  nome?: string;
  observacao?: string | null;
  comerAqui?: boolean;
  itens?: ItemDoTotem[];
};

/** quantos pagamentos estão esperando conta; é o aviso na aba Pedidos */
export function contarPagamentosSemPedido(restaurantId: string) {
  return db.totemPayment.count({
    where: { restaurantId, status: "APPROVED", orderId: null, resolvedAt: null },
  });
}

/**
 * Os pagamentos que ficaram sem pedido, com o carrinho já traduzido para
 * nome de produto -- no banco ele é guardado por id, que não diz nada a
 * quem está no balcão.
 */
export async function pagamentosSemPedido(restaurantId: string): Promise<PagamentoSemPedido[]> {
  const linhas = await db.totemPayment.findMany({
    where: { restaurantId, status: "APPROVED", orderId: null, resolvedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      method: true,
      amountCents: true,
      paidAt: true,
      createdAt: true,
      mpPaymentId: true,
      cart: true,
      lastEvent: true,
    },
  });
  if (linhas.length === 0) return [];

  const carrinhos = linhas.map((l) => (l.cart ?? {}) as Carrinho);
  const ids = [...new Set(carrinhos.flatMap((c) => (c.itens ?? []).map((i) => i.productId)).filter(Boolean))];
  const produtos = ids.length
    ? await db.product.findMany({ where: { id: { in: ids }, restaurantId }, select: { id: true, name: true } })
    : [];
  const nomePorId = new Map(produtos.map((p) => [p.id, p.name]));

  return linhas.map((linha, i) => {
    const carrinho = carrinhos[i];
    const evento = (linha.lastEvent ?? {}) as { motivo?: unknown };
    return {
      id: linha.id,
      metodo: linha.method,
      valorCents: linha.amountCents,
      pagoEm: linha.paidAt,
      criadoEm: linha.createdAt,
      mpPaymentId: linha.mpPaymentId,
      motivo: typeof evento.motivo === "string" ? evento.motivo : null,
      cliente: (carrinho.nome ?? "").trim() || "Cliente do totem",
      comerAqui: carrinho.comerAqui === true,
      observacao: carrinho.observacao ?? null,
      itens: (carrinho.itens ?? []).map((item) => ({
        // produto apagado do cardápio depois do pagamento: o balcão ainda
        // precisa ver que havia uma linha ali
        nome: nomePorId.get(item.productId) ?? "Item que saiu do cardápio",
        quantidade: item.quantity,
      })),
    };
  });
}

/**
 * Tenta gravar o pedido de novo, com o carrinho que o cliente montou.
 *
 * Pode falhar pelo mesmo motivo de antes (o item continua esgotado), e aí
 * o balcão lê o recado e decide: libera o item e tenta outra vez, ou dá
 * baixa devolvendo o dinheiro.
 */
export async function gravarPedidoDoPagamento(restaurantId: string, pagamentoId: string) {
  const linha = await db.totemPayment.findFirst({
    where: { id: pagamentoId, restaurantId, status: "APPROVED", orderId: null, resolvedAt: null },
    select: { id: true, method: true, cart: true },
  });
  if (!linha) return { erro: "Esse pagamento não está mais esperando. Atualize a tela." };

  const carrinho = (linha.cart ?? {}) as Carrinho;
  if (!carrinho.itens?.length) {
    return { erro: "Este pagamento não guardou o que foi pedido. Dê baixa na mão." };
  }

  try {
    const pedido = await criarPedidoDoTotem({
      restaurantId,
      nome: carrinho.nome ?? "",
      itens: carrinho.itens,
      observacao: carrinho.observacao ?? null,
      forma: linha.method,
      comerAqui: carrinho.comerAqui === true,
    });
    // ligar o pagamento ao pedido é o que o tira desta lista; a baixa fica
    // junto para o histórico mostrar quando o balcão resolveu
    await db.totemPayment.update({
      where: { id: linha.id },
      data: { orderId: pedido.id, resolvedAt: new Date(), resolvedNote: "Pedido gravado pelo painel" },
      select: { id: true },
    });
    return { ok: true as const, numero: pedido.number };
  } catch (erro) {
    return { erro: erro instanceof TotemError ? erro.message : "Não consegui gravar o pedido. Tente de novo." };
  }
}

/** o balcão resolveu por fora: sai da lista, com o que ele escreveu junto */
export async function darBaixaNoPagamento(restaurantId: string, pagamentoId: string, nota: string) {
  const { count } = await db.totemPayment.updateMany({
    where: { id: pagamentoId, restaurantId, status: "APPROVED", orderId: null, resolvedAt: null },
    data: { resolvedAt: new Date(), resolvedNote: nota.trim().slice(0, 200) || "Resolvido no balcão" },
  });
  return count > 0 ? { ok: true as const } : { erro: "Esse pagamento não está mais esperando. Atualize a tela." };
}
