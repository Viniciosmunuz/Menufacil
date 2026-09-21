"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { CATEGORY_ICONS } from "@/lib/category-icons";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { checkbox, fieldErrors, formObject, text, type FieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireAdmin } from "@/server/auth/dal";

export type CategoryFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

const schema = z.object({
  id: z.string().optional(),
  name: text("Informe o nome da categoria.", 40),
  icon: z
    .string()
    .optional()
    .refine((v) => !v || v in CATEGORY_ICONS, "Ícone inválido."),
  active: checkbox,
});

async function freeSlug(name: string) {
  const root = slugify(name) || "categoria";
  for (let i = 1; ; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    if (!(await db.platformCategory.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
  }
}

export async function saveCategory(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const admin = await requireAdmin();
  const values = formObject(formData);
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { id, name, icon, active } = parsed.data;

  if (id) {
    const updated = await db.platformCategory.updateMany({ where: { id }, data: { name, icon: icon || null, active } });
    if (updated.count === 0) return { error: "Categoria não encontrada." };
    await audit({ actorUserId: admin.id, action: "category.update", details: { id, name, active } });
  } else {
    const last = await db.platformCategory.aggregate({ _max: { sortOrder: true } });
    await db.platformCategory.create({
      data: { name, icon: icon || null, active: true, slug: await freeSlug(name), sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
    await audit({ actorUserId: admin.id, action: "category.create", details: { name } });
  }

  refresh();
  return { ok: true };
}

// Troca de lugar com a vizinha. Antes, renumera tudo (0, 1, 2...) para não
// haver duas com a mesma ordem.
export async function moveCategory(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;

  const all = await db.platformCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
  const index = all.findIndex((c) => c.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= all.length) return;

  [all[index], all[target]] = [all[target], all[index]];
  await db.$transaction(all.map((c, i) => db.platformCategory.update({ where: { id: c.id }, data: { sortOrder: i } })));
  refresh();
}

export async function deleteCategory(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const category = await db.platformCategory.findUnique({
    where: { id },
    select: { name: true, _count: { select: { restaurants: true } } },
  });
  if (!category) return { error: "Categoria não encontrada." };
  if (category._count.restaurants > 0) {
    return {
      error: `Está em uso por ${category._count.restaurants} restaurante(s). Desmarque "Aparece no site" em vez de excluir.`,
    };
  }

  await db.platformCategory.delete({ where: { id } });
  await audit({ actorUserId: admin.id, action: "category.delete", details: { name: category.name } });
  refresh();
  return { ok: true };
}
