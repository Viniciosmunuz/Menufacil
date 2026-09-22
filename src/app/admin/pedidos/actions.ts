"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireAdmin } from "@/server/auth/dal";
import { setOrderStatus, updateOrderDetails, type OrderFormState } from "@/server/orders/update-order";

// Ações do admin sobre os pedidos. Server actions são endpoints públicos:
// cada uma confere de novo que quem chama é admin.

const NOTE = "Alterado pelo administrador";

export async function updateOrder(_prev: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const admin = await requireAdmin();
  const result = await updateOrderDetails(formData, { userId: admin.id, note: NOTE }, null);
  if (result.ok) refresh();
  return result;
}

export async function stepOrder(formData: FormData) {
  const admin = await requireAdmin();
  await setOrderStatus({
    orderId: String(formData.get("orderId") ?? ""),
    from: String(formData.get("from") ?? ""),
    to: String(formData.get("to") ?? ""),
    actor: { userId: admin.id, note: NOTE },
    restaurantId: null,
  });
  refresh();
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
