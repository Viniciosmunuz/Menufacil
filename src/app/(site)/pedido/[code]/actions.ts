"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import type { EstadoDaConversa } from "@/components/chat/conversa";
import { enviarComoCliente, marcarLidoPeloCliente } from "@/server/chat/chat";
import { credenciaisDePagamento } from "@/server/pagamentos/conta";
import { pixDoPedido } from "@/server/pagamentos/pix";
import { cancelarPagamento } from "@/server/mercado-pago/api";

// Ações da página do pedido, do lado do cliente.
//
// Quem pode usá-las é quem tem o código do pedido, que é o que o link dele
// tem -- a mesma regra que já valia para o "já paguei". Nada aqui mostra ou
// muda dado de outro pedido, e nada aqui marca pagamento: isso é só do
// Mercado Pago.

// "Já paguei": o cliente avisa que fez o Pix e vai mandar o comprovante.
// Quem tem o código do pedido (o link) pode avisar; nada além disso muda.
export async function markPaymentSent(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const order = await db.order.findUnique({ where: { code }, select: { id: true, status: true, origin: true } });
  if (!order || order.status !== "AWAITING_PAYMENT") return;
  // no 100% Delivery não existe comprovante para mandar: quem confirma é o
  // Mercado Pago. O botão nem aparece lá, e barrar aqui também é de regra
  if (order.origin === "FULL_DELIVERY") return;

  await db.$transaction([
    db.order.update({ where: { id: order.id }, data: { status: "PAYMENT_SENT" } }),
    db.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "PROOF_SENT", proofSentAt: new Date() } }),
    db.orderStatusEvent.create({ data: { orderId: order.id, status: "PAYMENT_SENT", note: "Cliente avisou que pagou" } }),
  ]);
  refresh();
}

/** o QR venceu sem ninguém pagar: cria outro para o mesmo pedido */
export async function gerarOutroPix(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const order = await db.order.findUnique({
    where: { code },
    select: { id: true, status: true, origin: true, payment: { select: { status: true } } },
  });
  if (!order || order.origin !== "FULL_DELIVERY") return;
  if (order.status !== "AWAITING_PAYMENT" || order.payment?.status === "CONFIRMED") return;

  // o pagamento vencido precisa voltar a esperar, senão o novo QR nasceria
  // numa linha que já foi dada por encerrada
  if (order.payment?.status === "EXPIRED" || order.payment?.status === "CANCELED") {
    await db.payment.updateMany({ where: { orderId: order.id, status: { in: ["EXPIRED", "CANCELED"] } }, data: { status: "PENDING" } });
  }
  await pixDoPedido(order.id, { renovar: true });
  refresh();
}

/**
 * O cliente desistiu na tela do Pix.
 *
 * Sem isto, quem abre o QR e muda de ideia deixa um pedido pendurado em
 * "aguardando pagamento" para sempre, e o balcão fica olhando um pedido
 * que nunca vai chegar.
 *
 * A ordem importa: primeiro vira a linha do pagamento, com o status
 * antigo no where. Se nesse instante o Pix tiver caído, o update não
 * acha nada e a desistência é recusada -- ninguém cancela um pedido que
 * acabou de ser pago. Só depois disso o Mercado Pago é avisado.
 */
export async function desistirDoPedido(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const pedido = await db.order.findUnique({
    where: { code },
    select: {
      id: true,
      restaurantId: true,
      status: true,
      origin: true,
      restaurant: { select: { slug: true } },
      payment: { select: { id: true, status: true, mpPaymentId: true } },
    },
  });
  if (!pedido || pedido.origin !== "FULL_DELIVERY") return;
  const destino = `/restaurante/${pedido.restaurant.slug}`;
  if (pedido.status !== "AWAITING_PAYMENT" || !pedido.payment) redirect(destino);

  const { count } = await db.payment.updateMany({
    where: { id: pedido.payment.id, status: { in: ["PENDING", "EXPIRED"] } },
    data: { status: "CANCELED" },
  });
  // o pagamento saiu de "esperando" no meio do caminho: a tela recarregada
  // mostra o que aconteceu de verdade, e nada é cancelado por cima
  if (count === 0) {
    refresh();
    return;
  }

  await db.$transaction([
    db.order.updateMany({ where: { id: pedido.id, status: "AWAITING_PAYMENT" }, data: { status: "CANCELED" } }),
    db.orderStatusEvent.create({ data: { orderId: pedido.id, status: "CANCELED", note: "Cliente desistiu na tela do Pix" } }),
  ]);

  // tira a cobrança da conta do restaurante; se falhar, ela vence sozinha
  if (pedido.payment.mpPaymentId) {
    try {
      const contas = await credenciaisDePagamento(pedido.restaurantId);
      if (contas) await cancelarPagamento(contas.accessToken, pedido.payment.mpPaymentId);
    } catch {
      // o QR vence em dez minutos de qualquer jeito
    }
  }

  redirect(destino);
}

/** o cliente abriu a conversa: o que o restaurante escreveu está lido */
export async function lerConversaDoPedido(code: string) {
  const pedido = await db.order.findUnique({ where: { code }, select: { id: true, origin: true } });
  if (!pedido || pedido.origin !== "FULL_DELIVERY") return;
  await marcarLidoPeloCliente(pedido.id);
  refresh();
}

/** o cliente escreveu na conversa do pedido */
export async function enviarMensagem(_prev: EstadoDaConversa, formData: FormData): Promise<EstadoDaConversa> {
  const code = String(formData.get("code") ?? "");
  const texto = String(formData.get("texto") ?? "");
  if (!texto.trim()) return { error: "Escreva a mensagem antes de enviar." };

  const resultado = await enviarComoCliente(code, texto);
  if ("erro" in resultado) return { error: resultado.erro };

  refresh();
  return { enviadaEm: Date.now() };
}
