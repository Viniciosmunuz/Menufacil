"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { WhatsAppService } from "@/server/whatsapp/service";

// Quem tem o código do pedido (o link) pode chamar estas ações. O aviso ao
// restaurante sai uma vez só por pedido, então repetir não faz mal.

/** o cliente copiou a chave Pix: o pedido vai direto para o WhatsApp do restaurante */
export async function sendOrderToRestaurant(code: string) {
  const order = await db.order.findUnique({ where: { code }, select: { id: true, status: true } });
  if (!order || order.status === "CANCELED") return;
  await WhatsAppService.sendOrderMessage(order.id);
}

// "Já paguei": o cliente avisa que fez o Pix e vai mandar o comprovante.
export async function markPaymentSent(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const order = await db.order.findUnique({ where: { code }, select: { id: true, status: true } });
  if (!order || order.status !== "AWAITING_PAYMENT") return;

  await db.$transaction([
    db.order.update({ where: { id: order.id }, data: { status: "PAYMENT_SENT" } }),
    db.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "PROOF_SENT", proofSentAt: new Date() } }),
    db.orderStatusEvent.create({ data: { orderId: order.id, status: "PAYMENT_SENT", note: "Cliente avisou que pagou" } }),
  ]);
  // quem digitou a chave em vez de copiar também precisa chegar ao restaurante
  await WhatsAppService.sendOrderMessage(order.id);
  refresh();
}
