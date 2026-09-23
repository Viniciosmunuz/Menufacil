"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { PAPER_WIDTHS } from "@/lib/ticket";
import { audit } from "@/server/audit";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { setOrderStatus, updateOrderDetails, type OrderFormState } from "@/server/orders/update-order";
import { pairDevice, unpairDevice } from "@/server/print/devices";

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

// Print Fácil: ligar e desligar o computador do restaurante. O programa
// costuma entrar pelo login do dono; o código serve para quem instalou a
// máquina antes de ter a conta em mãos.
export type PairState = { error?: string; ok?: boolean };

export async function pairPrintDevice(_prev: PairState, formData: FormData): Promise<PairState> {
  const { restaurantId } = await access(formData);
  const result = await pairDevice(String(formData.get("codigo") ?? ""), restaurantId);
  if ("error" in result) return { error: result.error };
  refresh();
  return { ok: true };
}

export async function unpairPrintDevice(formData: FormData) {
  const { restaurantId } = await access(formData);
  await unpairDevice(String(formData.get("dispositivoId") ?? ""), restaurantId);
  refresh();
}

/** largura da bobina da térmica: vale para os três jeitos de imprimir */
export async function setReceiptWidth(formData: FormData) {
  const { restaurantId, actor } = await access(formData);
  const largura = Number(formData.get("largura"));
  if (!PAPER_WIDTHS.includes(largura as (typeof PAPER_WIDTHS)[number])) return;

  await db.restaurant.update({ where: { id: restaurantId }, data: { receiptWidth: largura }, select: { id: true } });
  await audit({ actorUserId: actor.userId, restaurantId, action: "restaurant.print.width", details: { largura } });
  refresh();
}
