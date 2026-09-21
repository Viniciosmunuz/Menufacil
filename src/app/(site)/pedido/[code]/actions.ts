"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";

// "Já paguei": o cliente avisa que fez o Pix e vai mandar o comprovante.
// Quem tem o código do pedido (o link) pode avisar; nada além disso muda.
export async function markPaymentSent(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const order = await db.order.findUnique({ where: { code }, select: { id: true, status: true } });
  if (!order || order.status !== "AWAITING_PAYMENT") return;

  await db.$transaction([
    db.order.update({ where: { id: order.id }, data: { status: "PAYMENT_SENT" } }),
    db.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "PROOF_SENT", proofSentAt: new Date() } }),
    db.orderStatusEvent.create({ data: { orderId: order.id, status: "PAYMENT_SENT", note: "Cliente avisou que pagou" } }),
  ]);
  refresh();
}
