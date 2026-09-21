"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { OpenMode } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { TIME_PATTERN } from "@/lib/opening-hours";
import { isPixKeyType, normalizePixKey } from "@/lib/pix";
import {
  checkbox,
  fieldErrors,
  formObject,
  optionalPhone,
  optionalState,
  optionalText,
  parseMoneyToCents,
  text,
  type FieldErrors,
} from "@/lib/validation";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { panelAudit } from "@/server/panel";
import { activationChecklist } from "@/server/restaurants/checklist";
import { ImageError, deleteImage, hasFile, saveImage } from "@/server/storage";

// "Meu restaurante": cada bloco da tela salva separado. Todas as ações
// conferem o acesso ao restaurante (dono dele ou admin) antes de tudo.

export type SectionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
  savedAt?: number;
};

type Parsed<T> = { data: T } | { state: SectionState };

function parse<T extends z.ZodType>(schema: T, formData: FormData): Parsed<z.infer<T>> {
  const values = formObject(formData);
  const result = schema.safeParse(values);
  if (!result.success) return { state: { fieldErrors: fieldErrors(result.error), values } };
  return { data: result.data };
}

async function access(formData: FormData) {
  return requireRestaurantAccess(String(formData.get("restaurantId") ?? ""));
}

function saved(): SectionState {
  refresh();
  return { ok: true, savedAt: Date.now() };
}

// ---- Informações e fotos ------------------------------------------------

const infoSchema = z.object({
  name: text("Informe o nome do restaurante.", 80),
  description: optionalText(300),
  removeLogo: checkbox,
  removeCover: checkbox,
});

export async function saveInfo(_prev: SectionState, formData: FormData): Promise<SectionState> {
  const acc = await access(formData);
  const parsed = parse(infoSchema, formData);
  if ("state" in parsed) return parsed.state;
  const { name, description, removeLogo, removeCover } = parsed.data;

  const current = await db.restaurant.findUniqueOrThrow({
    where: { id: acc.restaurant.id },
    select: { logoUrl: true, coverUrl: true },
  });

  const logo = formData.get("logo");
  const cover = formData.get("cover");
  let logoUrl = removeLogo ? null : current.logoUrl;
  let coverUrl = removeCover ? null : current.coverUrl;
  try {
    if (hasFile(logo)) logoUrl = await saveImage({ restaurantId: acc.restaurant.id, kind: "logo", file: logo });
    if (hasFile(cover)) coverUrl = await saveImage({ restaurantId: acc.restaurant.id, kind: "cover", file: cover });
  } catch (error) {
    if (error instanceof ImageError) return { error: error.message, values: formObject(formData) };
    throw error;
  }

  await db.restaurant.update({ where: { id: acc.restaurant.id }, data: { name, description, logoUrl, coverUrl } });
  if (logoUrl !== current.logoUrl) await deleteImage(current.logoUrl);
  if (coverUrl !== current.coverUrl) await deleteImage(current.coverUrl);

  await panelAudit(acc, "restaurant.info", { name });
  return saved();
}

// ---- Contato ------------------------------------------------------------

const contactSchema = z.object({
  whatsapp: optionalPhone,
  phone: optionalPhone,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || z.email().safeParse(v).success, "E-mail inválido."),
  instagram: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "") : null))
    .refine((v) => v === null || /^[A-Za-z0-9._]{1,30}$/.test(v), "Use só o nome do perfil, por exemplo @meurestaurante."),
});

export async function saveContact(_prev: SectionState, formData: FormData): Promise<SectionState> {
  const acc = await access(formData);
  const parsed = parse(contactSchema, formData);
  if ("state" in parsed) return parsed.state;

  await db.restaurant.update({ where: { id: acc.restaurant.id }, data: parsed.data });
  await panelAudit(acc, "restaurant.contact");
  return saved();
}

// ---- Endereço -----------------------------------------------------------

const addressSchema = z.object({
  street: optionalText(120),
  number: optionalText(20),
  complement: optionalText(80),
  neighborhood: optionalText(80),
  city: text("Informe a cidade.", 80),
  state: optionalState,
  zipCode: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, "") : null))
    .refine((v) => v === null || /^\d{8}$/.test(v), "CEP com 8 números."),
});

export async function saveAddress(_prev: SectionState, formData: FormData): Promise<SectionState> {
  const acc = await access(formData);
  const parsed = parse(addressSchema, formData);
  if ("state" in parsed) return parsed.state;

  await db.restaurant.update({ where: { id: acc.restaurant.id }, data: parsed.data });
  await panelAudit(acc, "restaurant.address");
  return saved();
}

// ---- Horários -----------------------------------------------------------

const OPEN_MODES: OpenMode[] = ["AUTO", "OPEN", "CLOSED"];

export async function saveHours(_prev: SectionState, formData: FormData): Promise<SectionState> {
  const acc = await access(formData);
  const values = formObject(formData);
  const errors: FieldErrors = {};

  const openMode = String(formData.get("openMode") ?? "AUTO") as OpenMode;
  if (!OPEN_MODES.includes(openMode)) errors.openMode = "Escolha uma opção.";

  const days = [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const open = formData.get(`day${weekday}_open`) === "on";
    const opensAt = String(formData.get(`day${weekday}_opensAt`) ?? "");
    const closesAt = String(formData.get(`day${weekday}_closesAt`) ?? "");
    if (open) {
      if (!TIME_PATTERN.test(opensAt) || !TIME_PATTERN.test(closesAt)) {
        errors[`day${weekday}`] = "Informe a hora de abrir e de fechar.";
      } else if (opensAt === closesAt) {
        errors[`day${weekday}`] = "A hora de abrir e de fechar não podem ser iguais.";
      }
    }
    return {
      weekday,
      closed: !open,
      opensAt: TIME_PATTERN.test(opensAt) ? opensAt : "18:00",
      closesAt: TIME_PATTERN.test(closesAt) ? closesAt : "23:00",
    };
  });
  if (Object.keys(errors).length) return { fieldErrors: errors, values };

  const restaurantId = acc.restaurant.id;
  await db.$transaction([
    db.restaurant.update({ where: { id: restaurantId }, data: { openMode } }),
    ...days.map((d) =>
      db.openingHour.upsert({
        where: { restaurantId_weekday: { restaurantId, weekday: d.weekday } },
        update: { opensAt: d.opensAt, closesAt: d.closesAt, closed: d.closed },
        create: { restaurantId, ...d },
      }),
    ),
  ]);
  await panelAudit(acc, "restaurant.hours", { openMode });
  return saved();
}

/** botão rápido do início do painel: abrir/fechar agora ou voltar ao automático */
export async function setOpenMode(formData: FormData) {
  const acc = await access(formData);
  const openMode = String(formData.get("openMode") ?? "") as OpenMode;
  if (!OPEN_MODES.includes(openMode)) return;
  await db.restaurant.update({ where: { id: acc.restaurant.id }, data: { openMode } });
  await panelAudit(acc, "restaurant.open_mode", { openMode });
  refresh();
}

// ---- Entrega e retirada -------------------------------------------------

const minutes = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v) : null))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 600), "Use minutos, de 0 a 600.");

const deliverySchema = z
  .object({
    deliveryEnabled: checkbox,
    pickupEnabled: checkbox,
    deliveryFee: z.string().optional(),
    minOrder: z.string().optional(),
    deliveryTimeMin: minutes,
    deliveryTimeMax: minutes,
  })
  .superRefine((v, ctx) => {
    if (!v.deliveryEnabled && !v.pickupEnabled) {
      ctx.addIssue({ code: "custom", path: ["pickupEnabled"], message: "Deixe pelo menos entrega ou retirada ligada." });
    }
    for (const key of ["deliveryFee", "minOrder"] as const) {
      const cents = parseMoneyToCents(v[key]);
      if (cents !== null && (Number.isNaN(cents) || cents > 100_000_00)) {
        ctx.addIssue({ code: "custom", path: [key], message: "Valor inválido. Exemplo: 5,00" });
      }
    }
    if (v.deliveryTimeMin !== null && v.deliveryTimeMax !== null && v.deliveryTimeMin > v.deliveryTimeMax) {
      ctx.addIssue({ code: "custom", path: ["deliveryTimeMax"], message: "O tempo máximo precisa ser maior que o mínimo." });
    }
  });

export async function saveDelivery(_prev: SectionState, formData: FormData): Promise<SectionState> {
  const acc = await access(formData);
  const parsed = parse(deliverySchema, formData);
  if ("state" in parsed) return parsed.state;
  const d = parsed.data;

  await db.restaurant.update({
    where: { id: acc.restaurant.id },
    data: {
      deliveryEnabled: d.deliveryEnabled,
      pickupEnabled: d.pickupEnabled,
      deliveryFeeCents: parseMoneyToCents(d.deliveryFee) ?? 0,
      minOrderCents: parseMoneyToCents(d.minOrder) ?? 0,
      deliveryTimeMin: d.deliveryTimeMin,
      deliveryTimeMax: d.deliveryTimeMax,
    },
  });
  await panelAudit(acc, "restaurant.delivery");
  return saved();
}

// ---- Pagamento (Pix) ----------------------------------------------------

const paymentSchema = z.object({
  pixKeyType: z.string().refine(isPixKeyType, "Escolha o tipo da chave."),
  pixKey: text("Informe a chave Pix.", 120),
  pixHolderName: text("Informe o nome de quem recebe.", 80),
  paymentInstructions: optionalText(300),
});

export async function savePayment(_prev: SectionState, formData: FormData): Promise<SectionState> {
  const acc = await access(formData);
  const parsed = parse(paymentSchema, formData);
  if ("state" in parsed) return parsed.state;
  const { pixKeyType, pixKey, pixHolderName, paymentInstructions } = parsed.data;
  if (!isPixKeyType(pixKeyType)) return { fieldErrors: { pixKeyType: "Escolha o tipo da chave." } };

  const key = normalizePixKey(pixKeyType, pixKey);
  if ("error" in key) return { fieldErrors: { pixKey: key.error }, values: formObject(formData) };

  await db.restaurant.update({
    where: { id: acc.restaurant.id },
    data: { pixKeyType, pixKey: key.value, pixHolderName, paymentInstructions },
  });
  await panelAudit(acc, "restaurant.payment", { pixKeyType });
  return saved();
}

// ---- Pedir publicação ---------------------------------------------------

export async function requestReview(formData: FormData) {
  const acc = await access(formData);
  if (!(await activationChecklist(acc.restaurant.id)).ready) return;
  const { count } = await db.restaurant.updateMany({
    where: { id: acc.restaurant.id, status: "DRAFT" },
    data: { status: "PENDING_REVIEW" },
  });
  if (count) await panelAudit(acc, "restaurant.status", { from: "DRAFT", to: "PENDING_REVIEW" });
  refresh();
}
