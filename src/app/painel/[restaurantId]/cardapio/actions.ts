"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { checkbox, fieldErrors, formObject, optionalText, parseMoneyToCents, text, type FieldErrors } from "@/lib/validation";
import { requireRestaurantAccess, type RestaurantAccess } from "@/server/auth/dal";
import { panelAudit } from "@/server/panel";
import { ImageError, deleteImage, hasFile, saveImage } from "@/server/storage";

// Cardápio do restaurante. Regra de ouro: todo where leva o restaurantId de
// quem tem acesso. Um id de outro restaurante enviado no formulário
// simplesmente não encontra nada.

export type MenuFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

async function access(formData: FormData) {
  return requireRestaurantAccess(String(formData.get("restaurantId") ?? ""));
}

const idOf = (formData: FormData, key = "id") => String(formData.get(key) ?? "");

/** troca de lugar com o vizinho e renumera a lista (0, 1, 2...) numa transação */
async function swapOrder<T extends { id: string }>(
  items: T[],
  id: string,
  direction: number,
  update: (id: string, sortOrder: number) => Prisma.PrismaPromise<unknown>,
) {
  const index = items.findIndex((i) => i.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return false;
  [items[index], items[target]] = [items[target], items[index]];
  await db.$transaction(items.map((item, i) => update(item.id, i)));
  return true;
}

// ---- Categorias do cardápio ---------------------------------------------

const categorySchema = z.object({
  id: z.string().optional(),
  name: text("Informe o nome da categoria.", 50),
  description: optionalText(200),
  active: z.string().optional(),
});

export async function saveMenuCategory(_prev: MenuFormState, formData: FormData): Promise<MenuFormState> {
  const acc = await access(formData);
  const values = formObject(formData);
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { id, name, description } = parsed.data;
  const restaurantId = acc.restaurant.id;

  if (id) {
    const active = parsed.data.active === "on";
    const { count } = await db.menuCategory.updateMany({ where: { id, restaurantId }, data: { name, description, active } });
    if (!count) return { error: "Categoria não encontrada." };
    await panelAudit(acc, "menu.category_update", { name, active });
  } else {
    const last = await db.menuCategory.aggregate({ where: { restaurantId }, _max: { sortOrder: true } });
    await db.menuCategory.create({
      data: { restaurantId, name, description, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
    await panelAudit(acc, "menu.category_create", { name });
  }
  refresh();
  return { ok: true };
}

export async function moveMenuCategory(formData: FormData) {
  const acc = await access(formData);
  const restaurantId = acc.restaurant.id;
  const categories = await db.menuCategory.findMany({
    where: { restaurantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const moved = await swapOrder(categories, idOf(formData), formData.get("direction") === "up" ? -1 : 1, (id, sortOrder) =>
    db.menuCategory.updateMany({ where: { id, restaurantId }, data: { sortOrder } }),
  );
  if (moved) refresh();
}

export async function deleteMenuCategory(_prev: MenuFormState, formData: FormData): Promise<MenuFormState> {
  const acc = await access(formData);
  const category = await db.menuCategory.findFirst({
    where: { id: idOf(formData), restaurantId: acc.restaurant.id },
    select: { id: true, name: true, _count: { select: { products: true } } },
  });
  if (!category) return { error: "Categoria não encontrada." };
  if (category._count.products > 0) {
    return { error: "Essa categoria ainda tem produtos. Mova ou exclua os produtos antes." };
  }
  await db.menuCategory.delete({ where: { id: category.id } });
  await panelAudit(acc, "menu.category_delete", { name: category.name });
  refresh();
  return { ok: true };
}

// ---- Produtos -----------------------------------------------------------

const productSchema = z
  .object({
    id: z.string().optional(),
    categoryId: z.string().min(1, "Escolha a categoria."),
    name: text("Informe o nome do produto.", 80),
    description: optionalText(400),
    price: z.string({ error: "Informe o preço." }),
    promoPrice: z.string().optional(),
    available: checkbox,
    featured: checkbox,
    removeImage: checkbox,
  })
  .transform((v, ctx) => {
    const priceCents = parseMoneyToCents(v.price);
    const promoPriceCents = parseMoneyToCents(v.promoPrice);
    if (priceCents === null || Number.isNaN(priceCents) || priceCents <= 0 || priceCents > 100_000_00) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Preço inválido. Exemplo: 25,90" });
    }
    if (promoPriceCents !== null) {
      if (Number.isNaN(promoPriceCents) || promoPriceCents <= 0) {
        ctx.addIssue({ code: "custom", path: ["promoPrice"], message: "Preço promocional inválido." });
      } else if (priceCents && promoPriceCents >= priceCents) {
        ctx.addIssue({ code: "custom", path: ["promoPrice"], message: "O preço promocional precisa ser menor que o preço normal." });
      }
    }
    return { ...v, priceCents: priceCents ?? 0, promoPriceCents };
  });

// Opções do produto: chegam do editor como JSON. O id de grupo/opção que já
// existe é mantido (carrinhos abertos continuam valendo); o resto é criado.
const optionSchema = z.object({
  id: z.string().max(40).optional(),
  name: text("Dê um nome para cada opção.", 60),
  price: z.string().max(20).optional(),
  available: z.boolean(),
});
const groupSchema = z.object({
  id: z.string().max(40).optional(),
  name: text("Dê um nome para cada grupo de opções (ex.: Tamanho).", 40),
  required: z.boolean(),
  max: z.number().int().min(1).max(20),
  options: z.array(optionSchema).min(1, "Cada grupo precisa de pelo menos uma opção.").max(40, "No máximo 40 opções por grupo."),
});
const groupsSchema = z.array(groupSchema).max(10, "No máximo 10 grupos de opções.");

type ParsedGroup = {
  id?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: { id?: string; name: string; priceCents: number; available: boolean }[];
};

function parseOptionGroups(raw: FormDataEntryValue | null): { groups: ParsedGroup[] } | { error: string } {
  let data: unknown = [];
  try {
    data = typeof raw === "string" && raw ? JSON.parse(raw) : [];
  } catch {
    return { error: "Não consegui ler as opções. Atualize a página e tente de novo." };
  }
  const parsed = groupsSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira as opções." };

  const groups: ParsedGroup[] = [];
  for (const g of parsed.data) {
    const options = [];
    for (const o of g.options) {
      const priceCents = parseMoneyToCents(o.price) ?? 0;
      if (Number.isNaN(priceCents) || priceCents < 0 || priceCents > 100_000_00) {
        return { error: `Valor inválido na opção "${o.name}". Exemplo: 5,00 (ou 0,00).` };
      }
      options.push({ id: o.id, name: o.name, priceCents, available: o.available });
    }
    const maxSelect = Math.min(g.max, options.length);
    groups.push({ id: g.id, name: g.name, minSelect: g.required ? 1 : 0, maxSelect, options });
  }
  return { groups };
}

/** grava os grupos de opções do produto, mantendo os ids que já existiam */
async function syncOptionGroups(tx: Prisma.TransactionClient, productId: string, groups: ParsedGroup[]) {
  const existing = await tx.productOptionGroup.findMany({ where: { productId }, select: { id: true, options: { select: { id: true } } } });
  const existingGroups = new Map(existing.map((g) => [g.id, new Set(g.options.map((o) => o.id))]));
  const keepGroups = groups.map((g) => g.id).filter((id): id is string => !!id && existingGroups.has(id));
  await tx.productOptionGroup.deleteMany({ where: { productId, id: { notIn: keepGroups } } });

  for (const [groupOrder, g] of groups.entries()) {
    const data = { name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect, sortOrder: groupOrder };
    const known = g.id ? existingGroups.get(g.id) : undefined;
    const groupId = known && g.id ? (await tx.productOptionGroup.update({ where: { id: g.id }, data })).id : (await tx.productOptionGroup.create({ data: { ...data, productId } })).id;

    const keepOptions = g.options.map((o) => o.id).filter((id): id is string => !!id && !!known?.has(id));
    await tx.productOption.deleteMany({ where: { groupId, id: { notIn: keepOptions } } });
    for (const [optionOrder, o] of g.options.entries()) {
      const optionData = { name: o.name, priceCents: o.priceCents, available: o.available, sortOrder: optionOrder };
      if (o.id && known?.has(o.id)) await tx.productOption.update({ where: { id: o.id }, data: optionData });
      else await tx.productOption.create({ data: { ...optionData, groupId } });
    }
  }
}

function productListUrl(acc: RestaurantAccess, categoryId: string) {
  return `/painel/${acc.restaurant.id}/cardapio#categoria-${categoryId}`;
}

export async function saveProduct(_prev: MenuFormState, formData: FormData): Promise<MenuFormState> {
  const acc = await access(formData);
  const restaurantId = acc.restaurant.id;
  const values = formObject(formData);
  const parsed = productSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const p = parsed.data;

  const category = await db.menuCategory.findFirst({ where: { id: p.categoryId, restaurantId }, select: { id: true } });
  if (!category) return { fieldErrors: { categoryId: "Escolha uma categoria deste cardápio." }, values };

  const options = parseOptionGroups(formData.get("optionGroups"));
  if ("error" in options) return { fieldErrors: { optionGroups: options.error }, values };

  const current = p.id
    ? await db.product.findFirst({ where: { id: p.id, restaurantId }, select: { id: true, imageUrl: true, categoryId: true } })
    : null;
  if (p.id && !current) return { error: "Produto não encontrado." };

  let imageUrl = p.removeImage ? null : (current?.imageUrl ?? null);
  const image = formData.get("image");
  try {
    if (hasFile(image)) imageUrl = await saveImage({ restaurantId, kind: "product", file: image });
  } catch (error) {
    if (error instanceof ImageError) return { error: error.message, values };
    throw error;
  }

  const data = {
    categoryId: category.id,
    name: p.name,
    description: p.description,
    priceCents: p.priceCents,
    promoPriceCents: p.promoPriceCents,
    available: p.available,
    featured: p.featured,
    imageUrl,
  };

  // produto novo (ou que mudou de categoria) vai para o fim da lista
  const needsOrder = !current || current.categoryId !== category.id;
  const sortOrder = needsOrder
    ? ((await db.product.aggregate({ where: { restaurantId, categoryId: category.id }, _max: { sortOrder: true } }))._max
        .sortOrder ?? -1) + 1
    : undefined;

  if (current) {
    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id: current.id }, data: { ...data, ...(sortOrder !== undefined ? { sortOrder } : {}) } });
      await syncOptionGroups(tx, current.id, options.groups);
    });
    if (current.imageUrl !== imageUrl) await deleteImage(current.imageUrl);
    await panelAudit(acc, "menu.product_update", { name: p.name });
  } else {
    await db.$transaction(async (tx) => {
      const created = await tx.product.create({ data: { ...data, restaurantId, sortOrder: sortOrder ?? 0 } });
      await syncOptionGroups(tx, created.id, options.groups);
    });
    await panelAudit(acc, "menu.product_create", { name: p.name });
  }

  redirect(productListUrl(acc, category.id));
}

export async function deleteProduct(_prev: MenuFormState, formData: FormData): Promise<MenuFormState> {
  const acc = await access(formData);
  const product = await db.product.findFirst({
    where: { id: idOf(formData), restaurantId: acc.restaurant.id },
    select: { id: true, name: true, imageUrl: true, categoryId: true },
  });
  if (!product) return { error: "Produto não encontrado." };

  // pedidos antigos guardam nome e preço próprios: continuam intactos
  await db.product.delete({ where: { id: product.id } });
  await deleteImage(product.imageUrl);
  await panelAudit(acc, "menu.product_delete", { name: product.name });
  redirect(productListUrl(acc, product.categoryId));
}

export async function toggleProduct(formData: FormData) {
  const acc = await access(formData);
  const field = formData.get("field") === "featured" ? "featured" : "available";
  const product = await db.product.findFirst({
    where: { id: idOf(formData), restaurantId: acc.restaurant.id },
    select: { id: true, name: true, available: true, featured: true },
  });
  if (!product) return;
  const value = !product[field];
  await db.product.update({ where: { id: product.id }, data: { [field]: value } });
  await panelAudit(acc, `menu.product_${field}`, { name: product.name, value });
  refresh();
}

export async function moveProduct(formData: FormData) {
  const acc = await access(formData);
  const restaurantId = acc.restaurant.id;
  const product = await db.product.findFirst({
    where: { id: idOf(formData), restaurantId },
    select: { id: true, categoryId: true },
  });
  if (!product) return;
  const siblings = await db.product.findMany({
    where: { restaurantId, categoryId: product.categoryId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const moved = await swapOrder(siblings, product.id, formData.get("direction") === "up" ? -1 : 1, (id, sortOrder) =>
    db.product.updateMany({ where: { id, restaurantId }, data: { sortOrder } }),
  );
  if (moved) refresh();
}
