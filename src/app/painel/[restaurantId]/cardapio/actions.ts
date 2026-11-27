"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { checkbox, fieldErrors, formObject, optionalText, parseMoneyToCents, text, type FieldErrors } from "@/lib/validation";
import { requireRestaurantAccess, type RestaurantAccess } from "@/server/auth/dal";
import { derrubarCardapio } from "@/server/public/restaurants";
import { panelAudit } from "@/server/panel";
import { ImageError, deleteImage, hasFile, saveImage, saveImageComMedida } from "@/server/storage";

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

/**
 * O dono mexeu no que o cliente vê.
 *
 * Atualiza a tela do painel, como antes, e derruba o cardápio guardado
 * do cliente -- senão o preço novo, a foto nova ou o item que acabou
 * demorariam até um minuto para aparecer no link.
 */
async function aoMudarOCardapio(acc: RestaurantAccess) {
  await derrubarCardapio(acc.restaurant.slug);
  refresh();
}

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
  addons: z.string().optional(),
  somenteSalao: z.string().optional(),
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
    const addons = parsed.data.addons === "on";
    const somenteSalao = parsed.data.somenteSalao === "on";
    const { count } = await db.menuCategory.updateMany({
      where: { id, restaurantId },
      data: { name, description, active, addons, somenteSalao },
    });
    if (!count) return { error: "Categoria não encontrada." };
    await panelAudit(acc, "menu.category_update", { name, active, addons, somenteSalao });
  } else {
    const last = await db.menuCategory.aggregate({ where: { restaurantId }, _max: { sortOrder: true } });
    await db.menuCategory.create({
      data: { restaurantId, name, description, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
    await panelAudit(acc, "menu.category_create", { name });
  }
  await aoMudarOCardapio(acc);
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
  if (moved) await aoMudarOCardapio(acc);
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
  await aoMudarOCardapio(acc);
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
    allowAddons: checkbox,
    removeImage: checkbox,
  })
  .transform((v, ctx) => {
    const priceCents = parseMoneyToCents(v.price);
    const promoPriceCents = parseMoneyToCents(v.promoPrice);
    if (priceCents === null || Number.isNaN(priceCents) || priceCents < 0 || priceCents > 100_000_00) {
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
  half: z.boolean().optional().default(false),
  halfFrom: z.object({ group: z.number().int().min(0), option: z.number().int().min(0) }).nullable().optional().default(null),
  options: z.array(optionSchema).min(1, "Cada grupo precisa de pelo menos uma opção.").max(40, "No máximo 40 opções por grupo."),
});
const groupsSchema = z.array(groupSchema).max(10, "No máximo 10 grupos de opções.");

type ParsedGroup = {
  id?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  halfHalf: boolean;
  /** posição (grupo, opção) da opção "a partir de" do meio a meio */
  halfFrom: { group: number; option: number } | null;
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
    groups.push({ id: g.id, name: g.name, minSelect: g.required ? 1 : 0, maxSelect, halfHalf: g.half, halfFrom: g.half ? g.halfFrom : null, options });
  }
  // o "a partir de" precisa apontar para uma opção de outro grupo que existe
  for (const [index, g] of groups.entries()) {
    if (!g.halfFrom) continue;
    const target = groups[g.halfFrom.group]?.options[g.halfFrom.option];
    if (!target || g.halfFrom.group === index) g.halfFrom = null;
  }
  return { groups };
}

/** grava os grupos de opções do produto, mantendo os ids que já existiam */
async function syncOptionGroups(tx: Prisma.TransactionClient, productId: string, groups: ParsedGroup[]) {
  const existing = await tx.productOptionGroup.findMany({ where: { productId }, select: { id: true, options: { select: { id: true } } } });
  const existingGroups = new Map(existing.map((g) => [g.id, new Set(g.options.map((o) => o.id))]));
  const keepGroups = groups.map((g) => g.id).filter((id): id is string => !!id && existingGroups.has(id));
  await tx.productOptionGroup.deleteMany({ where: { productId, id: { notIn: keepGroups } } });

  const optionIds: string[][] = [];
  const groupIds: string[] = [];
  for (const [groupOrder, g] of groups.entries()) {
    const data = { name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect, halfHalf: g.halfHalf, sortOrder: groupOrder };
    const known = g.id ? existingGroups.get(g.id) : undefined;
    const groupId = known && g.id ? (await tx.productOptionGroup.update({ where: { id: g.id }, data })).id : (await tx.productOptionGroup.create({ data: { ...data, productId } })).id;

    const keepOptions = g.options.map((o) => o.id).filter((id): id is string => !!id && !!known?.has(id));
    await tx.productOption.deleteMany({ where: { groupId, id: { notIn: keepOptions } } });
    const ids: string[] = [];
    for (const [optionOrder, o] of g.options.entries()) {
      const optionData = { name: o.name, priceCents: o.priceCents, available: o.available, sortOrder: optionOrder };
      if (o.id && known?.has(o.id)) ids.push((await tx.productOption.update({ where: { id: o.id }, data: optionData })).id);
      else ids.push((await tx.productOption.create({ data: { ...optionData, groupId } })).id);
    }
    optionIds.push(ids);
    groupIds.push(groupId);
  }

  // meio a meio: com as opções já gravadas, a posição vira o id da opção
  for (const [index, g] of groups.entries()) {
    const halfFromOptionId = g.halfFrom ? (optionIds[g.halfFrom.group]?.[g.halfFrom.option] ?? null) : null;
    await tx.productOptionGroup.update({ where: { id: groupIds[index] }, data: { halfFromOptionId } });
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

  const category = await db.menuCategory.findFirst({
    where: { id: p.categoryId, restaurantId },
    select: { id: true, pizzaFlavors: true },
  });
  if (!category) return { fieldErrors: { categoryId: "Escolha uma categoria deste cardápio." }, values };

  const options = parseOptionGroups(formData.get("optionGroups"));
  if ("error" in options) return { fieldErrors: { optionGroups: options.error }, values };

  const current = p.id
    ? await db.product.findFirst({
        where: { id: p.id, restaurantId },
        select: { id: true, imageUrl: true, categoryId: true, pizzaFlavors: true },
      })
    : null;
  if (p.id && !current) return { error: "Produto não encontrado." };

  // Pizza não tem preço próprio: o do sabor está em cada tamanho, e o da
  // pizza montada é o do sabor mais caro que o cliente escolher. Nesses
  // dois casos o campo fica em zero de propósito — exigir um valor aqui
  // impedia até de trocar a foto.
  const priceFromFlavors = category.pizzaFlavors || current?.pizzaFlavors != null;
  if (!priceFromFlavors && p.priceCents <= 0) {
    return { fieldErrors: { price: "Preço inválido. Exemplo: 25,90" }, values };
  }

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
    // O "fixado em Mais pedidos" não passa por aqui: mora na aba Destaques
    // do cardápio. Se passasse, salvar o prato sem a caixinha na tela
    // tiraria ele de lá sem ninguém ter pedido.
    allowAddons: p.allowAddons,
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
  await aoMudarOCardapio(acc);
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
  if (moved) await aoMudarOCardapio(acc);
}

/**
 * Liga e desliga uma opção (um sabor de suco, um tamanho) sem abrir a
 * edição do produto.
 *
 * Marcar que o cupuaçu acabou custava seis passos e um "Salvar": achar o
 * produto, entrar na edição, rolar até o grupo, desmarcar, salvar, voltar.
 * No meio do movimento isso não acontece -- e o cliente continua pedindo um
 * suco que não existe.
 *
 * O caminho do restaurante vem do grupo e do produto, e não do formulário:
 * um id de opção de outro restaurante simplesmente não encontra nada.
 */
export async function toggleProductOption(formData: FormData) {
  const acc = await access(formData);
  const option = await db.productOption.findFirst({
    where: { id: idOf(formData), group: { product: { restaurantId: acc.restaurant.id } } },
    select: { id: true, name: true, available: true, group: { select: { name: true, product: { select: { name: true } } } } },
  });
  if (!option) return;

  const value = !option.available;
  await db.productOption.update({ where: { id: option.id }, data: { available: value } });
  await panelAudit(acc, "menu.option_available", {
    product: option.group.product.name,
    group: option.group.name,
    name: option.name,
    value,
  });
  await aoMudarOCardapio(acc);
}

// ---- a vitrine: os banners da capa e a ordem dos destaques -------------
//
// As duas coisas respondem à mesma pergunta -- o que o cliente vê antes
// de rolar o cardápio -- e por isso moram na mesma tela do painel.
//
// Toda alteração aqui passa pelo `aoMudarOCardapio`, como preço e foto:
// os banners entram no mesmo cache do cardápio, e sem derrubá-lo o
// banner novo só apareceria no minuto seguinte.

/**
 * Põe um banner novo na capa.
 *
 * Entra ligado e no fim da fila: quem acabou de subir a promoção da
 * semana quer ela no ar, e mexer na ordem é outro gesto.
 */
export async function criarBanner(_prev: MenuFormState, formData: FormData): Promise<MenuFormState> {
  const acc = await access(formData);
  const restaurantId = acc.restaurant.id;

  const image = formData.get("image");
  if (!hasFile(image)) return { error: "Escolha a imagem do banner." };

  let salvo: { url: string; width: number; height: number };
  try {
    salvo = await saveImageComMedida({ restaurantId, kind: "banner", file: image });
  } catch (error) {
    if (error instanceof ImageError) return { error: error.message };
    throw error;
  }

  const ultimo = await db.banner.findFirst({
    where: { restaurantId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const banner = await db.banner.create({
    data: {
      restaurantId,
      imageUrl: salvo.url,
      titulo: String(formData.get("titulo") ?? "").trim().slice(0, 60) || null,
      sortOrder: (ultimo?.sortOrder ?? 0) + 1,
      largura: salvo.width || null,
      altura: salvo.height || null,
      // Nasce mostrando a imagem inteira: o dono vê tudo o que mandou e
      // aproxima se quiser. Começar cortado escondia justamente a letra
      // do canto, que era a reclamação.
      escala: 0,
    },
    select: { id: true },
  });

  await panelAudit(acc, "banner.criar", { bannerId: banner.id });
  await aoMudarOCardapio(acc);
  return { ok: true };
}

/**
 * Liga e desliga a seção Destaques inteira.
 *
 * Desligada, ela some do cardápio e ele começa pelos mais pedidos -- e os
 * banners continuam guardados, para voltar do jeito que estavam.
 */
export async function ligarDestaques(formData: FormData) {
  const acc = await access(formData);
  const atual = await db.restaurant.findUnique({ where: { id: acc.restaurant.id }, select: { destaquesLigados: true } });
  if (!atual) return;
  const ligados = !atual.destaquesLigados;
  await db.restaurant.update({ where: { id: acc.restaurant.id }, data: { destaquesLigados: ligados } });
  await panelAudit(acc, "destaques.ligar", { ligados });
  await aoMudarOCardapio(acc);
}

/** liga e desliga um banner sem apagar a imagem */
export async function alternarBanner(formData: FormData) {
  const acc = await access(formData);
  const restaurantId = acc.restaurant.id;
  const banner = await db.banner.findFirst({ where: { id: idOf(formData), restaurantId }, select: { id: true, ativo: true } });
  if (!banner) return;
  await db.banner.update({ where: { id: banner.id }, data: { ativo: !banner.ativo } });
  await aoMudarOCardapio(acc);
}

/**
 * Tira o banner da capa e apaga a imagem.
 *
 * Quem só quer parar de mostrar tem o interruptor ao lado; isto é para
 * a promoção que acabou e não volta.
 */
export async function apagarBanner(formData: FormData) {
  const acc = await access(formData);
  const restaurantId = acc.restaurant.id;
  const banner = await db.banner.findFirst({ where: { id: idOf(formData), restaurantId }, select: { id: true, imageUrl: true } });
  if (!banner) return;
  await db.banner.delete({ where: { id: banner.id } });
  await deleteImage(banner.imageUrl);
  await panelAudit(acc, "banner.apagar", { bannerId: banner.id });
  await aoMudarOCardapio(acc);
}

/** sobe ou desce um banner na fila da capa */
export async function moverBanner(formData: FormData) {
  const acc = await access(formData);
  const restaurantId = acc.restaurant.id;
  const fila = await db.banner.findMany({
    where: { restaurantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const moved = await swapOrder(fila, idOf(formData), formData.get("direction") === "up" ? -1 : 1, (id, sortOrder) =>
    db.banner.updateMany({ where: { id, restaurantId }, data: { sortOrder } }),
  );
  if (moved) await aoMudarOCardapio(acc);
}

/**
 * Sobe ou desce um prato na vitrine de destaques.
 *
 * Mexe no `featuredOrder`, que é outro campo do `sortOrder`: a ordem
 * dentro da categoria continua a mesma. São duas listas diferentes com o
 * mesmo prato dentro, e mudar uma não pode bagunçar a outra.
 */
export async function moverDestaque(formData: FormData) {
  const acc = await access(formData);
  const restaurantId = acc.restaurant.id;
  const fila = await db.product.findMany({
    where: { restaurantId, featured: true },
    orderBy: [{ featuredOrder: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const moved = await swapOrder(fila, idOf(formData), formData.get("direction") === "up" ? -1 : 1, (id, featuredOrder) =>
    db.product.updateMany({ where: { id, restaurantId }, data: { featuredOrder } }),
  );
  if (moved) await aoMudarOCardapio(acc);
}

/**
 * Fixa um prato em "Mais pedidos", ou solta.
 *
 * A seção é do sistema, que escolhe pelas vendas do mês. Fixar é o jeito
 * de o dono pôr ali o que ainda não vendeu -- a novidade, o prato da
 * casa. O `fixar` vem do formulário: "1" só fixa, "0" só solta. Assim um
 * toque repetido (a tela atrasada, o dedo duas vezes) não desfaz o
 * primeiro, como um alternar faria.
 */
export async function alternarDestaque(formData: FormData) {
  const acc = await access(formData);
  const restaurantId = acc.restaurant.id;
  const produto = await db.product.findFirst({
    where: { id: idOf(formData), restaurantId },
    select: { id: true, name: true, featured: true },
  });
  if (!produto) return;

  const pedido = formData.get("fixar");
  const fixar = pedido === "1" ? true : pedido === "0" ? false : !produto.featured;
  if (fixar === produto.featured) return;

  // Entrando, vai para o fim da fila: um prato novo no meio dos fixados
  // empurraria os outros sem ninguém ter pedido.
  const ultimo = fixar
    ? await db.product.findFirst({
        where: { restaurantId, featured: true },
        orderBy: { featuredOrder: "desc" },
        select: { featuredOrder: true },
      })
    : null;

  await db.product.update({
    where: { id: produto.id },
    data: fixar ? { featured: true, featuredOrder: (ultimo?.featuredOrder ?? 0) + 1 } : { featured: false },
  });
  await panelAudit(acc, "menu.product_featured", { name: produto.name, value: fixar });
  await aoMudarOCardapio(acc);
}

/**
 * O enquadramento do banner: aproximar e mover.
 *
 * Existe porque arte boa chegava no lugar errado. A faixa é mais larga
 * que alta do que a imagem, então o navegador corta de cima e de baixo,
 * e a logo cobre o canto de baixo à esquerda -- a primeira arte que ele
 * fez na IA veio com "NO CARDÁPIO" exatamente ali. Sem isto, o caminho
 * era refazer a imagem; com isto, ele aproxima um pouco e empurra para
 * o lado.
 *
 * Os números chegam presos na faixa que faz sentido: escala de 0 (a
 * imagem inteira) a 200 (o dobro de preencher a faixa) e posição de 0 a
 * 100. Fora disso não é escolha de ninguém, é formulário adulterado.
 */
export async function enquadrarBanner(formData: FormData) {
  const acc = await access(formData);
  const restaurantId = acc.restaurant.id;

  const preso = (nome: string, minimo: number, maximo: number, padrao: number) => {
    const n = Number(formData.get(nome));
    return Number.isFinite(n) ? Math.min(maximo, Math.max(minimo, Math.round(n))) : padrao;
  };

  await db.banner.updateMany({
    where: { id: idOf(formData), restaurantId },
    data: {
      escala: preso("escala", 0, 200, 0),
      focoX: preso("focoX", 0, 100, 50),
      focoY: preso("focoY", 0, 100, 50),
    },
  });
  await aoMudarOCardapio(acc);
}
