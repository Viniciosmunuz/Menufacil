"use server";

import { refresh } from "next/cache";

import type { EstadoDaConversa } from "@/components/chat/conversa";
import { db } from "@/lib/db";
import { PAPER_WIDTHS } from "@/lib/ticket";
import { audit } from "@/server/audit";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { enviarComoRestaurante, marcarLidoPeloRestaurante } from "@/server/chat/chat";
import { setOrderStatus, updateOrderDetails, type OrderFormState } from "@/server/orders/update-order";
import { pairDevice, setDeviceRole, unpairDevice } from "@/server/print/devices";
import { avisarTeste, esquecerAparelho, guardarAparelho } from "@/server/push/avisos";

// Atendimento dos pedidos pelo painel do restaurante. Cada ação confere o
// acesso ao restaurante e só mexe em pedido dele.

async function access(formData: FormData) {
  const { user, restaurant, viaAdmin } = await requireRestaurantAccess(String(formData.get("restaurantId") ?? ""));
  return {
    restaurantId: restaurant.id,
    user,
    actor: { userId: user.id, note: viaAdmin ? "Alterado pelo administrador" : "Alterado pelo restaurante" },
  };
}

/**
 * Resposta do balcão na conversa do pedido (só no 100% Delivery).
 *
 * Quem escreveu fica gravado junto com a mensagem: num restaurante com três
 * pessoas no balcão, saber quem respondeu o quê é o que resolve discussão.
 */
export async function responderNoChat(_prev: EstadoDaConversa, formData: FormData): Promise<EstadoDaConversa> {
  const { restaurantId, user } = await access(formData);
  const texto = String(formData.get("texto") ?? "");
  if (!texto.trim()) return { error: "Escreva a mensagem antes de enviar." };

  const resultado = await enviarComoRestaurante({
    orderId: String(formData.get("orderId") ?? ""),
    restaurantId,
    userId: user.id,
    userName: user.name,
    texto,
  });
  if ("erro" in resultado) return { error: resultado.erro };

  refresh();
  return { enviadaEm: Date.now() };
}

/** o balcão abriu a conversa: o que o cliente escreveu está lido */
export async function lerConversa(formData: FormData) {
  const { restaurantId } = await access(formData);
  await marcarLidoPeloRestaurante(String(formData.get("orderId") ?? ""), restaurantId);
  refresh();
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

/**
 * Qual papel sai em cada impressora.
 *
 * Pedido de totem rende dois: a comanda da cozinha, que sai na impressora
 * do computador do balcão, e o recibo do cliente com a senha, que sai na
 * impressora do tablet. Quem não tem totem nunca vê esta escolha, e toda
 * impressora continua nascendo como comanda.
 */
export async function setPrintDeviceRole(formData: FormData) {
  const { restaurantId, actor } = await access(formData);
  const papel = String(formData.get("papel") ?? "");
  if (papel !== "COMANDA" && papel !== "SENHA") return;

  const dispositivoId = String(formData.get("dispositivoId") ?? "");
  await setDeviceRole(dispositivoId, restaurantId, papel);
  await audit({ actorUserId: actor.userId, restaurantId, action: "restaurant.print.role", details: { dispositivoId, papel } });
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

/** a via não saiu ou saiu rasgada: destrava o pedido para o Print Fácil tirar de novo */
export async function reprintOrder(formData: FormData) {
  const { restaurantId, actor } = await access(formData);
  const orderId = String(formData.get("orderId") ?? "");

  const { count } = await db.order.updateMany({
    where: { id: orderId, restaurantId },
    data: { printedAt: null, printRuns: { increment: 1 } },
  });
  if (count === 0) return;

  await audit({ actorUserId: actor.userId, restaurantId, action: "order.print.again", details: { orderId } });
  refresh();
}

/** o aplicativo do computador imprimiu: marca a via como saída */
export async function markPrinted(formData: FormData) {
  const { restaurantId } = await access(formData);
  const orderId = String(formData.get("orderId") ?? "");
  await db.order.updateMany({ where: { id: orderId, restaurantId, printedAt: null }, data: { printedAt: new Date() } });
}

// Avisos de pedido novo no celular. O navegador se cadastra no serviço de
// push e manda para cá o endereço dele; o servidor só guarda, sempre
// conferindo que quem pediu tem acesso a este restaurante.
export async function ligarAvisos(entrada: {
  restaurantId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  label?: string;
}) {
  const { user, restaurant } = await requireRestaurantAccess(entrada.restaurantId);
  await guardarAparelho({
    restaurantId: restaurant.id,
    userId: user.id,
    endpoint: entrada.endpoint,
    p256dh: entrada.p256dh,
    auth: entrada.auth,
    label: entrada.label?.slice(0, 60) ?? null,
  });
}

export async function desligarAvisos(entrada: { restaurantId: string; endpoint: string }) {
  const { restaurant } = await requireRestaurantAccess(entrada.restaurantId);
  await esquecerAparelho(entrada.endpoint, restaurant.id);
}

/** manda um aviso de mentira pelo mesmo caminho de um pedido de verdade */
export async function testarAvisos(restaurantId: string) {
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  const enviados = await avisarTeste(restaurant.id);
  return { enviados };
}
