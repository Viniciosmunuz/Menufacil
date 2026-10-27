"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireDono } from "@/server/auth/dal";
import { iaConfigurada } from "@/server/ia/responder";

export type EstadoDaAcao = { error?: string; message?: string };

/**
 * O dono liga ou desliga a IA do restaurante dele.
 *
 * Só depois que o admin conectou o WhatsApp: antes disso não há o que
 * ligar. O que a IA pode fazer (só dúvidas ou também pedidos) continua com
 * o admin.
 */
export async function ligarIaDoRestaurante(_prev: EstadoDaAcao, formData: FormData): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(String(formData.get("restaurantId") ?? ""));
  const ligar = formData.get("ligar") === "1";

  const atendente = await db.atendenteIa.findUnique({ where: { restaurantId: restaurant.id }, select: { phoneNumberId: true } });
  if (!atendente?.phoneNumberId) return { error: "O WhatsApp ainda não foi conectado. Fale com o suporte do MenuFácil." };
  if (ligar && !iaConfigurada()) return { error: "A IA ainda não está liberada. Fale com o suporte do MenuFácil." };

  await db.atendenteIa.update({ where: { restaurantId: restaurant.id }, data: { ativo: ligar } });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: ligar ? "restaurant.ia.on" : "restaurant.ia.off",
    details: { viaAdmin },
  });
  refresh();
  return { message: ligar ? "IA ligada." : "IA desligada." };
}
