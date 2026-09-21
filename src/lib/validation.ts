import { z } from "zod";

import { normalizePhone } from "./format";
import { SLUG_PATTERN } from "./slug";

// Peças de validação dos formulários. O FormData chega como texto: campo
// vazio vira null, checkbox marcado chega como "on".

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** FormData -> objeto simples; campo repetido (caixas de marcar) vira "a,b,c" */
export function formObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value !== "string" || key.startsWith("$ACTION")) continue;
    out[key] = key in out ? `${out[key]},${value}` : value;
  }
  return out;
}

export const text = (message: string, max = 120) =>
  z
    .string({ error: message })
    .trim()
    .min(1, message)
    .max(max, `Use no máximo ${max} caracteres.`);

export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .optional()
    .transform((v) => v || null);

export const email = (message = "Informe um e-mail válido.") =>
  z.string({ error: message }).trim().toLowerCase().pipe(z.email(message));

export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

const phoneMessage = "Informe o número com DDD, por exemplo (92) 99999-0000.";

export const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normalizePhone(v) : null))
  .refine((v) => v === null || /^55\d{10,11}$/.test(v), phoneMessage);

export const phone = z
  .string({ error: phoneMessage })
  .trim()
  .transform((v) => normalizePhone(v))
  .refine((v) => /^55\d{10,11}$/.test(v), phoneMessage);

export const optionalState = z
  .string()
  .trim()
  .toUpperCase()
  .optional()
  .transform((v) => v || null)
  .refine((v) => v === null || /^[A-Z]{2}$/.test(v), "Use a sigla do estado, por exemplo AM.");

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "O endereço precisa ter pelo menos 3 caracteres.")
  .max(60, "Use no máximo 60 caracteres.")
  .regex(SLUG_PATTERN, "Use só letras minúsculas, números e hífens, sem espaços nem acentos.");

/** "12,50" | "12.50" | "R$ 1.234,56" -> centavos; vazio -> null */
export function parseMoneyToCents(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return NaN;
  return Math.round(value * 100);
}
