import "server-only";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus, PaymentStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/labels";
import { fieldErrors, formObject, optionalText, phone, text, type FieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { WhatsAppService } from "@/server/whatsapp/service";

// Mudanças num pedido feitas pela equipe (admin ou restaurante). Quem chama
// já conferiu o acesso e passa o restaurante permitido; as regras daqui
// valem igual para os dois painéis.

export type OrderFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

/** quem mexeu e o texto que fica no histórico do pedido */
export type OrderActor = { userId: string; note: string };

const statusSchema = z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]], { error: "Escolha um status." });

const detailsSchema = z.object({
  orderId: z.string().min(1),
  status: statusSchema,
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

const orderSelect = {
  id: true,
  restaurantId: true,
  number: true,
  type: true,
  status: true,
  payment: { select: { status: true, confirmedAt: true, proofSentAt: true } },
} satisfies Prisma.OrderSelect;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

function findOrder(orderId: string, restaurantId: string | null) {
  return db.order.findFirst({ where: { id: orderId, ...(restaurantId ? { restaurantId } : {}) }, select: orderSelect });
}

/** histórico e pagamento acompanham a troca de status (dentro da transação) */
async function recordStatus(tx: Prisma.TransactionClient, order: OrderRow, status: OrderStatus, actor: OrderActor) {
  await tx.orderStatusEvent.create({ data: { orderId: order.id, status, note: actor.note, changedByUserId: actor.userId } });
  const payment = order.payment;
  if (!payment || payment.status === "REFUNDED") return;
  const next = paymentStatusFor(status);
  if (next === payment.status) return;
  await tx.payment.update({
    where: { orderId: order.id },
    data: {
      status: next,
      ...(next === "CONFIRMED" && !payment.confirmedAt ? { confirmedAt: new Date() } : {}),
      ...(next === "PROOF_SENT" && !payment.proofSentAt ? { proofSentAt: new Date() } : {}),
    },
  });
}

/** depois de gravar: avisa o cliente da mudança de status e registra quem fez */
async function finish(order: OrderRow, newStatus: OrderStatus | null, actor: OrderActor) {
  if (newStatus) await WhatsAppService.sendOrderStatus(order.id, newStatus);
  await audit({
    actorUserId: actor.userId,
    action: "order.update",
    restaurantId: order.restaurantId,
    details: { number: order.number, ...(newStatus ? { from: order.status, to: newStatus } : {}) },
  });
}

const CHANGED_MEANWHILE = "O pedido mudou enquanto você olhava. Atualize a página.";

/** formulário "Editar": status, cliente, endereço e observações */
export async function updateOrderDetails(formData: FormData, actor: OrderActor, restaurantId: string | null): Promise<OrderFormState> {
  const values = formObject(formData);
  const parsed = detailsSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const data = parsed.data;

  const order = await findOrder(data.orderId, restaurantId);
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
    if (statusChanged) await recordStatus(tx, order, data.status, actor);
    return true;
  });
  if (!saved) return { error: CHANGED_MEANWHILE, values };

  await finish(order, statusChanged ? data.status : null, actor);
  return { ok: true };
}

/** botões de próximo passo (confirmar pagamento, em preparo...) e cancelar */
export async function setOrderStatus(params: {
  orderId: string;
  /** status que a tela mostrava: se mudou nesse meio-tempo, não mexe */
  from: string;
  to: string;
  actor: OrderActor;
  restaurantId: string | null;
}): Promise<{ error?: string }> {
  const to = statusSchema.safeParse(params.to);
  if (!to.success) return { error: "Status inválido." };
  const order = await findOrder(params.orderId, params.restaurantId);
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status !== params.from) return { error: CHANGED_MEANWHILE };
  if (order.status === to.data) return {};

  const saved = await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: to.data } });
    if (!count) return false;
    await recordStatus(tx, order, to.data, params.actor);
    return true;
  });
  if (!saved) return { error: CHANGED_MEANWHILE };

  await finish(order, to.data, params.actor);
  return {};
}
