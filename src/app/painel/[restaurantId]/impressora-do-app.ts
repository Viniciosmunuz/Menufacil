"use server";

import { noAr } from "@/lib/features";
import { requireDono } from "@/server/auth/dal";
import { ligarAppDoPc } from "@/server/print/devices";

/**
 * O painel aberto no Menu Fácil PC se apresenta como impressora do salão.
 *
 * Só com o salão liberado: no restaurante que não tem salão nada muda, nem
 * um registro a mais no banco.
 */
export async function ligarImpressoraDoApp(restaurantId: string, computador: string, impressora: string | null) {
  const { restaurant } = await requireDono(restaurantId);
  if (!noAr("salaoEnabled") || !restaurant.salaoEnabled) return null;
  return ligarAppDoPc(restaurant.id, String(computador ?? ""), impressora ? String(impressora) : null);
}
