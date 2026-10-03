"use server";

import { refresh } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireRestaurantAccess, type RestaurantAccess } from "@/server/auth/dal";
import { desligarConta, prontoParaCobrar, salvarSegredoDoWebhook } from "@/server/pagamentos/conta";
import { criarState, enderecoDeAutorizacao } from "@/server/pagamentos/oauth";
import { panelAudit } from "@/server/panel";

// Ações da seção Entrega.
//
// Todas conferem duas coisas antes de qualquer outra: quem está mexendo tem
// acesso a este restaurante, e o 100% Delivery está liberado para ele.
// Sumir com o link no menu não basta -- o endereço digitado na mão passaria.

export type EntregaState = { ok?: boolean; error?: string; message?: string; savedAt?: number };

async function acesso(formData: FormData): Promise<RestaurantAccess> {
  const access = await requireRestaurantAccess(String(formData.get("restaurantId") ?? ""));
  if (!access.restaurant.fullDeliveryEnabled) notFound();
  return access;
}

function salvo(message?: string): EntregaState {
  refresh();
  return { ok: true, savedAt: Date.now(), ...(message ? { message } : {}) };
}

/**
 * Pedido pelo WhatsApp ou 100% Delivery.
 *
 * É a chave que muda o que o cliente vê no checkout, então ela não liga o
 * modo no escuro: sem conta do Mercado Pago, o Pix não teria como ser
 * cobrado e o cliente cairia num checkout sem forma de pagar. Nesse caso a
 * escolha é recusada com o motivo.
 */
export async function escolherModo(_prev: EntregaState, formData: FormData): Promise<EntregaState> {
  const access = await acesso(formData);
  const escolha = String(formData.get("modo") ?? "");
  if (escolha !== "WHATSAPP" && escolha !== "FULL_DELIVERY") return { error: "Escolha uma das duas formas." };

  if (escolha === "FULL_DELIVERY" && !(await prontoParaCobrar(access.restaurant.id))) {
    return { error: "Antes de ligar o 100% Delivery, conecte a sua conta do Mercado Pago aqui embaixo." };
  }

  await db.restaurant.update({ where: { id: access.restaurant.id }, data: { deliveryMode: escolha }, select: { id: true } });
  await panelAudit(access, "entrega.modo", { modo: escolha });

  return salvo(
    escolha === "FULL_DELIVERY"
      ? "Pronto: o cliente passa a pagar por Pix aqui dentro e acompanha o pedido na tela."
      : "Voltou para o Pedido pelo WhatsApp. Os pedidos que já estão em pé continuam como estavam.",
  );
}

/**
 * Manda o dono para o Mercado Pago autorizar a conta dele.
 *
 * O MenuFácil não pede senha nem token: quem entra na conta é ele, no site
 * do Mercado Pago, e o que volta para cá é uma autorização que ele pode
 * cortar quando quiser.
 */
export async function conectarMercadoPago(formData: FormData) {
  const access = await acesso(formData);
  const state = criarState(access.restaurant.id, access.user.id);
  const endereco = state ? enderecoDeAutorizacao(state) : null;
  if (!endereco) {
    // sem MP_CLIENT_ID/MP_CLIENT_SECRET no servidor não há para onde mandar;
    // a página já avisa isso antes de mostrar o botão
    redirect(`/painel/${access.restaurant.id}/entrega?mp=sem-aplicativo`);
  }
  await panelAudit(access, "entrega.mercado_pago.conectar");
  redirect(endereco);
}

export async function desconectarMercadoPago(_prev: EntregaState, formData: FormData): Promise<EntregaState> {
  const access = await acesso(formData);

  await desligarConta(access.restaurant.id);
  // sem conta não há como cobrar: deixar o modo ligado faria o cliente
  // chegar no checkout e não achar forma de pagar
  await db.restaurant.update({ where: { id: access.restaurant.id }, data: { deliveryMode: "WHATSAPP" }, select: { id: true } });
  await panelAudit(access, "entrega.mercado_pago.desconectar");

  return salvo("Conta desconectada. O restaurante voltou para o Pedido pelo WhatsApp.");
}

export async function salvarSegredoDoWebhookDaConta(_prev: EntregaState, formData: FormData): Promise<EntregaState> {
  const access = await acesso(formData);
  const segredo = String(formData.get("segredo") ?? "");

  const resultado = await salvarSegredoDoWebhook(access.restaurant.id, segredo);
  if ("erro" in resultado) return { error: resultado.erro };

  await panelAudit(access, "entrega.webhook", { preenchido: Boolean(segredo.trim()) });
  return salvo(segredo.trim() ? "Chave salva." : "Chave removida.");
}
