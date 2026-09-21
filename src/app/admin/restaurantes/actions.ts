"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { STATUS_TRANSITIONS, isStatusTransition } from "@/lib/restaurant-status";
import {
  checkbox,
  email,
  fieldErrors,
  formObject,
  optionalPhone,
  optionalState,
  optionalText,
  slug,
  text,
  type FieldErrors,
} from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireAdmin } from "@/server/auth/dal";
import { linkOwner, prepareTemporaryPassword, resetOwnerPassword, type NewCredentials } from "@/server/owners";
import { activationChecklist } from "@/server/restaurants/checklist";
import { availableSlug, isSlugTaken } from "@/server/restaurants/slug";

// Ações do admin sobre os restaurantes. Server actions são endpoints
// públicos: cada uma confere de novo que quem chama é admin.

export type AdminFormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
  credentials?: NewCredentials;
  restaurantId?: string;
};

/** erro esperado dentro de uma transação: desfaz tudo e vira mensagem */
class ActionError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

async function existingCategoryIds(raw: FormDataEntryValue[]) {
  const ids = raw.filter((v): v is string => typeof v === "string" && v.length > 0);
  if (ids.length === 0) return [];
  const found = await db.platformCategory.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return found.map((c) => c.id);
}

// ---- Cadastro ----------------------------------------------------------

const createSchema = z
  .object({
    name: text("Informe o nome do restaurante.", 80),
    city: text("Informe a cidade.", 80),
    state: optionalState,
    whatsapp: optionalPhone,
    leadId: optionalText(40),
    ownerMode: z.enum(["new", "later"], { error: "Escolha como fica o acesso do dono." }),
    ownerName: optionalText(80),
    ownerEmail: optionalText(120),
    ownerPhone: optionalPhone,
  })
  .superRefine((v, ctx) => {
    if (v.ownerMode !== "new") return;
    if (!v.ownerName) ctx.addIssue({ code: "custom", path: ["ownerName"], message: "Informe o nome do dono." });
    if (!v.ownerEmail || !email().safeParse(v.ownerEmail).success) {
      ctx.addIssue({ code: "custom", path: ["ownerEmail"], message: "Informe um e-mail válido." });
    }
  });

export async function createRestaurant(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const values = formObject(formData);
  const parsed = createSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const data = parsed.data;
  const categoryIds = await existingCategoryIds(formData.getAll("categoryIds"));
  const ownerEmail = data.ownerEmail?.toLowerCase() ?? null;
  const temp = data.ownerMode === "new" ? await prepareTemporaryPassword() : null;
  const newSlug = await availableSlug(data.name);

  let result: { restaurantId: string; credentials: NewCredentials | null; ownerLinked: boolean };
  try {
    result = await db.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: data.name,
          slug: newSlug,
          city: data.city,
          state: data.state,
          whatsapp: data.whatsapp,
          categories: { connect: categoryIds.map((id) => ({ id })) },
        },
      });

      let credentials: NewCredentials | null = null;
      if (data.ownerMode === "new" && ownerEmail && temp) {
        const owner = await linkOwner(tx, {
          restaurantId: restaurant.id,
          name: data.ownerName!,
          email: ownerEmail,
          phone: data.ownerPhone,
          ...temp,
        });
        if (!owner.ok) throw new ActionError(owner.error, "ownerEmail");
        credentials = owner.credentials;
      }

      if (data.leadId) {
        await tx.restaurantLead.updateMany({ where: { id: data.leadId }, data: { handled: true } });
      }
      return { restaurantId: restaurant.id, credentials, ownerLinked: data.ownerMode === "new" };
    });
  } catch (error) {
    if (error instanceof ActionError) {
      return { fieldErrors: error.field ? { [error.field]: error.message } : undefined, error: error.field ? undefined : error.message, values };
    }
    throw error;
  }

  await audit({
    actorUserId: admin.id,
    action: "restaurant.create",
    restaurantId: result.restaurantId,
    details: { name: data.name, slug: newSlug, ownerEmail, newOwnerAccount: !!result.credentials },
  });

  // conta nova: a senha provisória aparece uma vez nesta tela
  if (result.credentials) {
    return { ok: true, credentials: result.credentials, restaurantId: result.restaurantId };
  }
  redirect(`/admin/restaurantes/${result.restaurantId}${result.ownerLinked ? "?dono=existente" : ""}`);
}

// ---- Dados básicos -----------------------------------------------------

const basicsSchema = z.object({
  restaurantId: z.string().min(1),
  name: text("Informe o nome do restaurante.", 80),
  slug,
  city: text("Informe a cidade.", 80),
  state: optionalState,
  featured: checkbox,
});

export async function updateRestaurantBasics(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const values = formObject(formData);
  const parsed = basicsSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const data = parsed.data;

  const before = await db.restaurant.findUnique({
    where: { id: data.restaurantId },
    select: { name: true, slug: true, city: true, state: true, featured: true },
  });
  if (!before) return { error: "Restaurante não encontrado." };
  if (await isSlugTaken(data.slug, data.restaurantId)) {
    return { fieldErrors: { slug: "Esse endereço já é de outro restaurante." }, values };
  }

  const categoryIds = await existingCategoryIds(formData.getAll("categoryIds"));
  await db.restaurant.update({
    where: { id: data.restaurantId },
    data: {
      name: data.name,
      slug: data.slug,
      city: data.city,
      state: data.state,
      featured: data.featured,
      categories: { set: categoryIds.map((id) => ({ id })) },
    },
  });

  const after = { name: data.name, slug: data.slug, city: data.city, state: data.state, featured: data.featured };
  const changes = Object.fromEntries(
    (Object.keys(after) as (keyof typeof after)[])
      .filter((k) => before[k] !== after[k])
      .map((k) => [k, [before[k], after[k]]]),
  );
  await audit({
    actorUserId: admin.id,
    action: "restaurant.update",
    restaurantId: data.restaurantId,
    details: { changes, categories: categoryIds.length },
  });

  refresh();
  return { ok: true, message: "Dados salvos." };
}

// ---- Status ------------------------------------------------------------

export async function changeRestaurantStatus(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const transition = formData.get("transition");
  if (!isStatusTransition(transition)) return { error: "Ação inválida." };
  const rule = STATUS_TRANSITIONS[transition];

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { status: true, activatedAt: true },
  });
  if (!restaurant) return { error: "Restaurante não encontrado." };

  if (rule.needsChecklist && !(await activationChecklist(restaurantId)).ready) {
    return { error: "Complete os itens obrigatórios da lista antes de publicar." };
  }

  // a condição de status no where evita duas mudanças ao mesmo tempo
  const { count } = await db.restaurant.updateMany({
    where: { id: restaurantId, status: { in: rule.from } },
    data: {
      status: rule.to,
      ...(rule.to === "ACTIVE" && !restaurant.activatedAt ? { activatedAt: new Date() } : {}),
    },
  });
  if (count === 0) return { error: "O status mudou enquanto você olhava. Atualize a página." };

  await audit({
    actorUserId: admin.id,
    action: "restaurant.status",
    restaurantId,
    details: { from: restaurant.status, to: rule.to },
  });

  refresh();
  return { ok: true };
}

// ---- Donos -------------------------------------------------------------

const ownerSchema = z.object({
  restaurantId: z.string().min(1),
  name: text("Informe o nome do dono.", 80),
  email: email(),
  phone: optionalPhone,
});

export async function addOwner(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const values = formObject(formData);
  const parsed = ownerSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const data = parsed.data;

  const restaurant = await db.restaurant.findUnique({ where: { id: data.restaurantId }, select: { id: true } });
  if (!restaurant) return { error: "Restaurante não encontrado." };

  const temp = await prepareTemporaryPassword();
  const result = await db.$transaction((tx) =>
    linkOwner(tx, { restaurantId: data.restaurantId, name: data.name, email: data.email, phone: data.phone, ...temp }),
  );
  if (!result.ok) return { fieldErrors: { email: result.error }, values };

  await audit({
    actorUserId: admin.id,
    action: "owner.add",
    restaurantId: data.restaurantId,
    details: { email: data.email, newAccount: !!result.credentials },
  });

  refresh();
  if (result.credentials) return { ok: true, credentials: result.credentials };
  return { ok: true, message: `${data.email} já tinha conta e agora também gerencia este restaurante, com a senha que já usa.` };
}

const ownerRefSchema = z.object({ restaurantId: z.string().min(1), userId: z.string().min(1) });

/** o usuário precisa ser dono deste restaurante: nunca mexe em conta de admin */
async function findOwnership(restaurantId: string, userId: string) {
  return db.restaurantOwner.findFirst({
    where: { restaurantId, userId, user: { role: "RESTAURANT_OWNER" } },
    select: { id: true, user: { select: { email: true } } },
  });
}

export async function resetOwnerPasswordAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const parsed = ownerRefSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Dono inválido." };
  const { restaurantId, userId } = parsed.data;

  const ownership = await findOwnership(restaurantId, userId);
  if (!ownership) return { error: "Esse dono não está ligado a este restaurante." };

  const credentials = await resetOwnerPassword(userId);
  await audit({
    actorUserId: admin.id,
    action: "owner.password_reset",
    restaurantId,
    details: { email: ownership.user.email },
  });

  refresh();
  return { ok: true, credentials };
}

export async function removeOwner(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const parsed = ownerRefSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: "Dono inválido." };
  const { restaurantId, userId } = parsed.data;

  const ownership = await findOwnership(restaurantId, userId);
  if (!ownership) return { error: "Esse dono não está ligado a este restaurante." };

  await db.restaurantOwner.delete({ where: { id: ownership.id } });
  await audit({ actorUserId: admin.id, action: "owner.remove", restaurantId, details: { email: ownership.user.email } });

  refresh();
  return { ok: true };
}
