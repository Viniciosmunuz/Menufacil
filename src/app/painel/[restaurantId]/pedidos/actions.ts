"use server";

import { refresh } from "next/cache";

import { requireRestaurantAccess } from "@/server/auth/dal";
import { setOrderStatus, updateOrderDetails, type OrderFormState } from "@/server/orders/update-order";

// Atendimento dos pedidos pelo painel do restaurante. Cada ação confere o
// acesso ao restaurante e só mexe em pedido dele.

async function access(formData: FormData) {
  const { user, restaurant, viaAdmin } = await requireRestaurantAccess(String(formData.get("restaurantId") ?? ""));
  return {
    restaurantId: restaurant.id,
    actor: { userId: user.id, note: viaAdmin ? "Alterado pelo administrador" : "Alterado pelo restaurante" },
  };
}

export async function updateRestaurantOrder(_prev: OrderFormState, formData: FormData): Promise<OrderFormState> {
  const { restaurantId, actor } = await access(formData);
  const result = await updateOrderDetails(formData, actor, restaurantId);
  if (result.ok) refresh();
  return result;
}

export async function stepRestaurantOrder(formData: FormData) {
  const { restaurantId, actor } = await access(formData);
  await setOrderStatus({
    orderId: String(formData.get("orderId") ?? ""),
    from: String(formData.get("from") ?? ""),
    to: String(formData.get("to") ?? ""),
    actor,
    restaurantId,
  });
  // se o pedido mudou nesse meio-tempo, a tela atualizada mostra como ficou
  refresh();
}
