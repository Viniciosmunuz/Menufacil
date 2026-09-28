import type { PrismaClient } from "@/generated/prisma/client";

import { PIZZA_CATEGORY, PIZZA_SIZE_GROUP, pizzaProductDescription, pizzaProductName } from "./pizza";

// As "Pizza de N sabores" são produtos de verdade, criados pelo sistema
// quando o restaurante diz até quantos sabores a pizza dele aceita. Assim o
// dono continua podendo trocar a foto, a ordem e o texto de cada uma pelo
// cardápio, como faz com qualquer produto.
//
// Recebe o cliente do banco por fora: o painel chama com o dele, o seed com
// o dele.

type Db = PrismaClient;

/** marca quais categorias são catálogo de sabores (Especiais, Tradicionais) */
export async function setFlavorCategories(db: Db, restaurantId: string, categoryIds: string[]) {
  await db.menuCategory.updateMany({ where: { restaurantId }, data: { pizzaFlavors: false } });
  if (categoryIds.length) {
    await db.menuCategory.updateMany({ where: { restaurantId, id: { in: categoryIds } }, data: { pizzaFlavors: true } });
  }
}

/** os tamanhos que os sabores deste restaurante usam, na ordem em que aparecem */
async function sizesFromFlavors(db: Db, restaurantId: string) {
  const flavors = await db.product.findMany({
    where: { restaurantId, category: { pizzaFlavors: true } },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: {
      optionGroups: { orderBy: { sortOrder: "asc" }, take: 1, select: { options: { orderBy: { sortOrder: "asc" }, select: { name: true } } } },
    },
  });
  const nomes: string[] = [];
  for (const f of flavors) {
    for (const o of f.optionGroups[0]?.options ?? []) if (!nomes.includes(o.name)) nomes.push(o.name);
  }
  return nomes;
}

/** o montador ganha o mesmo grupo de tamanhos que os sabores usam */
async function syncSizeGroup(db: Db, productId: string, sizes: string[]) {
  const atual = await db.productOptionGroup.findFirst({
    where: { productId, name: PIZZA_SIZE_GROUP },
    select: { id: true, options: { orderBy: { sortOrder: "asc" }, select: { name: true } } },
  });

  if (sizes.length === 0) {
    if (atual) await db.productOptionGroup.delete({ where: { id: atual.id } });
    return;
  }
  // já está igual: não mexe, para não perder o que o dono ajustou
  if (atual && atual.options.map((o) => o.name).join("|") === sizes.join("|")) return;
  if (atual) await db.productOptionGroup.delete({ where: { id: atual.id } });

  await db.productOptionGroup.create({
    data: {
      productId,
      name: PIZZA_SIZE_GROUP,
      minSelect: 1,
      maxSelect: 1,
      sortOrder: 0,
      // o preço vem do sabor escolhido, não do tamanho
      options: { create: sizes.map((name, i) => ({ name, priceCents: 0, sortOrder: i })) },
    },
  });
}

/**
 * Deixa o cardápio com uma pizza montada para cada quantidade de sabores,
 * de 1 até o máximo. Diminuiu o máximo? As que sobraram saem. Zerou? Sai a
 * categoria inteira — os pedidos antigos guardam nome e preço próprios e
 * não se perdem.
 */
export async function syncPizzaProducts(db: Db, restaurantId: string, maxFlavors: number) {
  const atuais = await db.product.findMany({
    where: { restaurantId, pizzaFlavors: { not: null } },
    select: { id: true, pizzaFlavors: true, categoryId: true },
  });

  const sobrando = atuais.filter((p) => (p.pizzaFlavors ?? 0) > maxFlavors);
  if (sobrando.length) await db.product.deleteMany({ where: { id: { in: sobrando.map((p) => p.id) } } });

  if (maxFlavors <= 0) {
    for (const id of [...new Set(atuais.map((p) => p.categoryId))]) {
      const resto = await db.product.count({ where: { categoryId: id } });
      if (resto === 0) await db.menuCategory.delete({ where: { id } });
    }
    return;
  }

  const categoria =
    (await db.menuCategory.findFirst({ where: { restaurantId, name: PIZZA_CATEGORY }, select: { id: true } })) ??
    (await db.menuCategory.create({
      data: {
        restaurantId,
        name: PIZZA_CATEGORY,
        description: "Escolha o tamanho e monte os sabores.",
        sortOrder: ((await db.menuCategory.aggregate({ where: { restaurantId }, _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1,
      },
      select: { id: true },
    }));

  const sizes = await sizesFromFlavors(db, restaurantId);

  for (let sabores = 1; sabores <= maxFlavors; sabores++) {
    const existente = atuais.find((p) => p.pizzaFlavors === sabores);
    const id =
      existente?.id ??
      (
        await db.product.create({
          data: {
            restaurantId,
            categoryId: categoria.id,
            name: pizzaProductName(sabores),
            description: pizzaProductDescription(sabores),
            // o preço é o do sabor mais caro escolhido; a base não entra
            priceCents: 0,
            pizzaFlavors: sabores,
            sortOrder: sabores - 1,
          },
          select: { id: true },
        })
      ).id;
    await syncSizeGroup(db, id, sizes);
  }
}
