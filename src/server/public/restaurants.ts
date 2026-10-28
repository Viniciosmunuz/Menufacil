import "server-only";

import { cache } from "react";
import { connection } from "next/server";

import type { RestaurantCardData } from "@/components/public/restaurant-card";
import type { Prisma } from "@/generated/prisma/client";
import { combina, normalizar, palavrasDaBusca } from "@/lib/busca";
import { db } from "@/lib/db";
import { isOpenNow } from "@/lib/opening-hours";
import { getRestaurantAccess } from "@/server/auth/dal";

// Consultas da área pública. Só restaurante ACTIVE aparece para o cliente.
// "Aberto agora" depende do relógio, então tudo aqui roda a cada acesso
// (connection() tira estas páginas da geração estática).

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  coverUrl: true,
  city: true,
  state: true,
  featured: true,
  openMode: true,
  ratingAverage: true,
  ratingCount: true,
  deliveryEnabled: true,
  deliveryFeeCents: true,
  deliveryTimeMin: true,
  deliveryTimeMax: true,
  categories: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true } },
  openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
} satisfies Prisma.RestaurantSelect;

type CardRow = Prisma.RestaurantGetPayload<{ select: typeof cardSelect }>;

export type PublicRestaurantCard = RestaurantCardData & { id: string; featured: boolean };

function toCard(r: CardRow): PublicRestaurantCard {
  return {
    id: r.id,
    featured: r.featured,
    name: r.name,
    slug: r.slug,
    logoUrl: r.logoUrl,
    coverUrl: r.coverUrl,
    city: r.city,
    state: r.state,
    categories: r.categories.map((c) => c.name),
    open: isOpenNow(r.openMode, r.openingHours),
    ratingAverage: r.ratingAverage,
    ratingCount: r.ratingCount,
    deliveryEnabled: r.deliveryEnabled,
    deliveryFeeCents: r.deliveryFeeCents,
    deliveryTimeMin: r.deliveryTimeMin,
    deliveryTimeMax: r.deliveryTimeMax,
  };
}

/** os bairros que o restaurante atende agora; vazio = atende qualquer um */
export async function areasDeEntrega(restaurantId: string) {
  return db.deliveryArea.findMany({
    where: { restaurantId, active: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, feeCents: true },
  });
}

export async function listRestaurants(filters: {
  q?: string | null;
  category?: string | null;
  city?: string | null;
  featuredOnly?: boolean;
  slugs?: string[];
  take?: number;
}): Promise<PublicRestaurantCard[]> {
  await connection();
  const palavras = palavrasDaBusca(filters.q ?? "");
  const where: Prisma.RestaurantWhereInput = {
    status: "ACTIVE",
    ...(filters.featuredOnly ? { featured: true } : {}),
    ...(filters.slugs ? { slug: { in: filters.slugs } } : {}),
    ...(filters.city ? { city: { equals: filters.city, mode: "insensitive" } } : {}),
    ...(filters.category ? { categories: { some: { slug: filters.category, active: true } } } : {}),
  };

  // Com busca, o filtro é feito aqui, e não no banco. O "contém" do banco
  // não ignora acento ("hamburguer" não achava "Hambúrguer") e exige a
  // frase exata ("pizza calabresa" não achava "Pizza de Calabresa"). A
  // regra do site (src/lib/busca.ts) resolve os dois, e o número de
  // restaurantes no ar é pequeno o bastante para olhar um por um.
  //
  // "pizza" acha a pizzaria pelo nome, pela categoria, por uma seção do
  // cardápio ou por um prato.
  if (palavras.length > 0) {
    const candidatos = await db.restaurant.findMany({
      where,
      select: {
        ...cardSelect,
        menuCategories: { where: { active: true, somenteSalao: false }, select: { name: true } },
        products: { where: { available: true, category: { active: true, somenteSalao: false } }, select: { name: true } },
      },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      take: 300,
    });
    return candidatos
      .filter((r) => {
        const texto = normalizar(
          [r.name, ...r.categories.map((c) => c.name), ...r.menuCategories.map((c) => c.name), ...r.products.map((p) => p.name)].join(" "),
        );
        return combina(texto, palavras);
      })
      .slice(0, filters.take ?? 60)
      .map(toCard)
      .sort((a, b) => Number(b.open) - Number(a.open));
  }

  const rows = await db.restaurant.findMany({
    where,
    select: cardSelect,
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    take: filters.take ?? 60,
  });
  // abertos primeiro, mantendo destaque e nome
  return rows.map(toCard).sort((a, b) => Number(b.open) - Number(a.open));
}

/** cidades com restaurante no ar, para o seletor do topo */
export async function listCities() {
  await connection();
  const rows = await db.restaurant.groupBy({
    by: ["city", "state"],
    where: { status: "ACTIVE", city: { not: null } },
    _count: { _all: true },
    orderBy: { city: "asc" },
  });
  return rows.filter((r) => r.city).map((r) => ({ city: r.city!, state: r.state, count: r._count._all }));
}

export async function listPublicCategories() {
  await connection();
  return db.platformCategory.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, icon: true, _count: { select: { restaurants: { where: { status: "ACTIVE" } } } } },
  });
}

/** as categorias com mais restaurantes no ar (empate mantém a ordem do admin) */
export async function listPopularCategories(limit = 6) {
  const categories = await listPublicCategories();
  return categories
    .filter((c) => c._count.restaurants > 0)
    .sort((a, b) => b._count.restaurants - a._count.restaurants)
    .slice(0, limit)
    .map(({ slug, name, icon }) => ({ slug, name, icon }));
}

/**
 * Página do restaurante. Fora do ar, só abre em prévia para quem gerencia
 * o restaurante (dono ou admin); para os outros é como se não existisse.
 */
/**
 * Dentro de cache() porque esta consulta roda duas vezes por acesso: uma
 * para o título e a prévia do link (generateMetadata) e outra para a
 * página. São as mesmas 131 linhas de cardápio, com opções e sabores,
 * indo e voltando do banco duas vezes para desenhar uma tela só.
 *
 * O cache é do pedido, não do tempo: dois acessos diferentes continuam
 * cada um com a sua consulta, e nada fica velho.
 */
export const getPublicRestaurant = cache(async (slug: string, preview: boolean) => {
  await connection();
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    include: {
      categories: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true } },
      openingHours: { orderBy: { weekday: "asc" }, select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
      menuCategories: {
        // a seção marcada como "só no salão" não existe para quem pede
        // pelo link: ela é a taxa de embalagem, o couvert, o "para viagem"
        where: { active: true, somenteSalao: false },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          pizzaFlavors: true,
          addons: true,
          products: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              priceCents: true,
              promoPriceCents: true,
              available: true,
              featured: true,
              pizzaFlavors: true,
              allowAddons: true,
              optionGroups: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  name: true,
                  minSelect: true,
                  maxSelect: true,
                  halfHalf: true,
                  halfFromOptionId: true,
                  options: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, priceCents: true, available: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!restaurant) return null;

  let isPreview = false;
  if (restaurant.status !== "ACTIVE") {
    if (!preview || !(await getRestaurantAccess(restaurant.id))) return null;
    isPreview = true;
  }

  return {
    restaurant,
    isPreview,
    open: isOpenNow(restaurant.openMode, restaurant.openingHours),
  };
});

/**
 * Os pratos que mais saíram nos últimos 30 dias, para o selo "Mais pedido"
 * do cardápio. No máximo três, e só com pelo menos cinco unidades vendidas:
 * com menos, o selo diria "mais pedido" de um prato que saiu duas vezes.
 *
 * Conta o delivery e o totem; a mesa do salão fica de fora, como em todo
 * número do cardápio. Pedido cancelado não conta.
 */
export async function maisPedidos(restaurantId: string): Promise<string[]> {
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const linhas = await db.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      order: { restaurantId, origin: { not: "SALAO" }, status: { not: "CANCELED" }, createdAt: { gte: desde } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 3,
  });
  return linhas.filter((l) => l.productId && (l._sum.quantity ?? 0) >= 5).map((l) => l.productId!);
}
