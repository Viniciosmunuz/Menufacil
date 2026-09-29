"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";

import { requireRestaurantAccess, type RestaurantAccess } from "@/server/auth/dal";
import { panelAudit } from "@/server/panel";
import { esquecerConta, salvarChaveDoWebhook, salvarMaquininha, salvarToken } from "@/server/totem/config";
import { desligarTotem, novoCodigoDePareamento } from "@/server/totem/dispositivos";

// Ações da seção Totem.
//
// Todas conferem duas coisas antes de qualquer outra: quem está mexendo
// tem acesso a este restaurante, e o totem está liberado para ele. Sumir
// com o link no menu não basta -- o endereço digitado na mão passaria.

export type TotemState = { ok?: boolean; error?: string; message?: string; savedAt?: number };

async function acesso(formData: FormData): Promise<RestaurantAccess> {
  const access = await requireRestaurantAccess(String(formData.get("restaurantId") ?? ""));
  if (!access.restaurant.totemEnabled) notFound();
  return access;
}

function salvo(): TotemState {
  refresh();
  return { ok: true, savedAt: Date.now() };
}

export async function salvarAccessToken(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const token = String(formData.get("accessToken") ?? "");
  if (!token.trim()) return { error: "Cole o Access Token da sua conta do Mercado Pago." };

  const resultado = await salvarToken(access.restaurant.id, token);
  if ("erro" in resultado) return { error: resultado.erro };

  // o token em si nunca entra no histórico: só o fato de ter sido trocado
  await panelAudit(access, "totem.mercado_pago", { producao: resultado.producao });
  return salvo();
}

export async function salvarDeviceId(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const deviceId = String(formData.get("deviceId") ?? "").trim();
  if (deviceId && !/^[A-Za-z0-9_-]{4,60}$/.test(deviceId)) {
    return { error: "O número da maquininha tem só letras, números, hífen e sublinhado." };
  }

  await salvarMaquininha(access.restaurant.id, deviceId);
  await panelAudit(access, "totem.maquininha", { preenchido: Boolean(deviceId) });
  return salvo();
}

export async function salvarWebhook(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const chave = String(formData.get("webhookKey") ?? "");

  const resultado = await salvarChaveDoWebhook(access.restaurant.id, chave);
  if ("erro" in resultado) return { error: resultado.erro };

  await panelAudit(access, "totem.webhook", { preenchido: Boolean(chave.trim()) });
  return salvo();
}

export async function desconectarMercadoPago(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  await esquecerConta(access.restaurant.id);
  await panelAudit(access, "totem.desconectado");
  refresh();
  return { ok: true, message: "Conta do Mercado Pago removida deste restaurante." };
}

export async function gerarCodigoDoTotem(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const { pairingCode } = await novoCodigoDePareamento(access.restaurant.id);
  await panelAudit(access, "totem.codigo");
  refresh();
  return { ok: true, message: `Código do novo totem: ${pairingCode}` };
}

export async function removerTotem(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const deviceId = String(formData.get("deviceId") ?? "");
  const { count } = await desligarTotem(deviceId, access.restaurant.id);
  if (count === 0) return { error: "Esse totem já não está ligado a este restaurante." };

  await panelAudit(access, "totem.removido");
  refresh();
  return { ok: true, message: "Totem desligado. Ele vai pedir o código de novo ao abrir." };
}
