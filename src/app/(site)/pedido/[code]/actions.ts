"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import type { EstadoDaConversa } from "@/components/chat/conversa";
import { enviarComoCliente } from "@/server/chat/chat";
import { pixDoPedido } from "@/server/pagamentos/pix";

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
  await pixDoPedido(order.id);
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
