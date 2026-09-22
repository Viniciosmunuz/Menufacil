"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/labels";
import { fieldErrors, formObject, optionalText, phone, text, type FieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireAdmin } from "@/server/auth/dal";
import { WhatsAppService } from "@/server/whatsapp/service";

// Ações do admin sobre os pedidos. Server actions são endpoints públicos:
// cada uma confere de novo que quem chama é admin.

export type OrderFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

const orderSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]], { error: "Escolha um status." }),
  customerName: text("Informe o nome do cliente.", 80),
  customerWhatsapp: phone,
  street: optionalText(120),
  number: optionalText(20),
  complement: optionalText(80),
  neighborhood: optionalText(80),
  reference: optionalText(120),
  notes: optionalText(300),
});

const PAID: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED"];

/** o pagamento acompanha o status do pedido */
function paymentStatusFor(status: OrderStatus): PaymentStatus {
  if (status === "CANCELED") return "CANCELED";
  if (PAID.includes(status)) return "CONFIRMED";
  if (status === "PAYMENT_SENT") return "PROOF_SENT";
  return "PENDING";
}

export async function updateOrder(_prev: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const admin = await requireAdmin();
  const values = formObject(formData);
  const parsed = orderSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const data = parsed.data;

  const order = await db.order.findUnique({
    where: { id: data.orderId },
    select: { id: true, restaurantId: true, number: true, type: true, status: true, payment: { select: { status: true, confirmedAt: true, proofSentAt: true } } },
  });
  if (!order) return { error: "Pedido não encontrado. Talvez tenha sido excluído." };

  const delivery = order.type === "DELIVERY";
  if (delivery) {
    const missing: FieldErrors = {};
    if (!data.street) missing.street = "Informe a rua.";
    if (!data.number) missing.number = "Informe o número (ou s/n).";
    if (!data.neighborhood) missing.neighborhood = "Informe o bairro.";
    if (Object.keys(missing).length) return { fieldErrors: missing, values };
  }

  const statusChanged = data.status !== order.status;
  const payment = order.payment;
  const nextPayment = statusChanged && payment && payment.status !== "REFUNDED" ? paymentStatusFor(data.status) : null;

  const saved = await db.$transaction(async (tx) => {
    // a condição de status no where evita sobrescrever uma mudança feita ao mesmo tempo
    const { count } = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: {
        status: data.status,
        customerName: data.customerName,
        customerWhatsapp: data.customerWhatsapp,
        notes: data.notes,
        ...(delivery
          ? {
              deliveryStreet: data.street,
              deliveryNumber: data.number,
              deliveryComplement: data.complement,
              deliveryNeighborhood: data.neighborhood,
              deliveryReference: data.reference,
            }
          : {}),
      },
    });
    if (!count) return false;

    if (statusChanged) {
      await tx.orderStatusEvent.create({
        data: { orderId: order.id, status: data.status, note: "Alterado pelo administrador", changedByUserId: admin.id },
      });
    }
    if (payment && nextPayment && nextPayment !== payment.status) {
      await tx.payment.update({
        where: { orderId: order.id },
        data: {
          status: nextPayment,
          ...(nextPayment === "CONFIRMED" && !payment.confirmedAt ? { confirmedAt: new Date() } : {}),
          ...(nextPayment === "PROOF_SENT" && !payment.proofSentAt ? { proofSentAt: new Date() } : {}),
        },
      });
    }
    return true;
  });
  if (!saved) return { error: "O pedido mudou enquanto você editava. Atualize a página.", values };

  if (statusChanged) await WhatsAppService.sendOrderStatus(order.id, data.status);
  await audit({
    actorUserId: admin.id,
    action: "order.update",
    restaurantId: order.restaurantId,
    details: { number: order.number, ...(statusChanged ? { from: order.status, to: data.status } : {}) },
  });

  refresh();
  return { ok: true };
}

export async function deleteOrder(formData: FormData) {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, restaurantId: true, number: true, customerName: true, totalCents: true, status: true },
  });
  if (!order) return;

  // itens, histórico e pagamento saem junto; as mensagens de WhatsApp ficam no registro
  await db.order.delete({ where: { id: order.id } });
  await audit({
    actorUserId: admin.id,
    action: "order.delete",
    restaurantId: order.restaurantId,
    details: { number: order.number, customerName: order.customerName, totalCents: order.totalCents, status: order.status },
  });
  refresh();
}
