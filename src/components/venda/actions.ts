"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { fieldErrors, formObject, optionalText, phone, text, type FieldErrors } from "@/lib/validation";

export type LeadState = { ok?: boolean; error?: string; fieldErrors?: FieldErrors; values?: Record<string, string> };

const schema = z.object({
  contactName: text("Informe seu nome.", 80),
  restaurantName: text("Informe o nome do restaurante.", 80),
  whatsapp: phone,
  city: optionalText(80),
  message: optionalText(500),
});

// "Quero cadastrar meu restaurante": vira um contato para o admin, não um
// restaurante. Endpoint público, com armadilha para robôs e limite por número.
export async function createLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const values = formObject(formData);
  if (values.website) return { ok: true }; // robô: finge que deu certo
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const recent = await db.restaurantLead.count({
    where: { whatsapp: parsed.data.whatsapp, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (recent >= 3) return { ok: true }; // já recebemos: não duplica

  await db.restaurantLead.create({ data: parsed.data });
  return { ok: true };
}
