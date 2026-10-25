"use server";

import { refresh } from "next/cache";

import { noAr } from "@/lib/features";
import { requireDono } from "@/server/auth/dal";
import { desligarExtraDoPc, extrasDoPc, ligarAppDoPc, ligarExtraDoPc } from "@/server/print/devices";

// O painel aberto no Menu Fácil PC se apresenta como impressora do salão.
//
// Só com o salão liberado e nunca pelo admin vendo o painel de alguém: no
// restaurante sem salão nada muda, nem um registro a mais no banco, e a
// comanda de um restaurante não sai na casa do admin.

async function acesso(restaurantId: string) {
  const a = await requireDono(restaurantId);
  if (a.viaAdmin || !noAr("salaoEnabled") || !a.restaurant.salaoEnabled) return null;
  return a.restaurant.id;
}

export async function ligarImpressoraDoApp(restaurantId: string, computador: string, impressora: string | null) {
  const id = await acesso(restaurantId);
  if (!id) return null;
  return ligarAppDoPc(id, String(computador ?? ""), impressora ? String(impressora) : null);
}

/** as impressoras a mais que este computador já tem ligadas no salão */
export async function verImpressorasExtras(restaurantId: string, computador: string) {
  const id = await acesso(restaurantId);
  if (!id) return [];
  return extrasDoPc(id, String(computador ?? ""));
}

export async function ligarImpressoraExtra(restaurantId: string, computador: string, impressora: string) {
  const id = await acesso(restaurantId);
  if (!id || !String(impressora ?? "").trim()) return;
  await ligarExtraDoPc(id, String(computador ?? ""), String(impressora));
  refresh();
}

export async function desligarImpressoraExtra(restaurantId: string, computador: string, deviceId: string) {
  const id = await acesso(restaurantId);
  if (!id) return;
  await desligarExtraDoPc(id, String(computador ?? ""), String(deviceId));
  refresh();
}
