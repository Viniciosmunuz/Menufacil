import "server-only";

import { connection } from "next/server";

import type { RestaurantCardData } from "@/components/public/restaurant-card";
import type { Prisma } from "@/generated/prisma/client";
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

export async function listRestaurants(filters: {
  q?: string | null;
  category?: string | null;
  city?: string | null;
  featuredOnly?: boolean;
  slugs?: string[];
  take?: number;
}): Promise<PublicRestaurantCard[]> {
  await connection();
  const q = filters.q?.trim();
  const where: Prisma.RestaurantWhereInput = {
    status: "ACTIVE",
    ...(filters.featuredOnly ? { featured: true } : {}),
    ...(filters.slugs ? { slug: { in: filters.slugs } } : {}),
    ...(filters.city ? { city: { equals: filters.city, mode: "insensitive" } } : {}),
    ...(filters.category ? { categories: { some: { slug: filters.category, active: true } } } : {}),
    // "pizza" acha a pizzaria pelo nome, pela categoria ou por um prato
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { categories: { some: { name: { contains: q, mode: "insensitive" }, active: true } } },
            { products: { some: { name: { contains: q, mode: "insensitive" }, available: true, category: { active: true } } } },
          ],
        }
      : {}),
  };

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

/**
 * Página do restaurante. Fora do ar, só abre em prévia para quem gerencia
 * o restaurante (dono ou admin); para os outros é como se não existisse.
 */
export async function getPublicRestaurant(slug: string, preview: boolean) {
  await connection();
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    include: {
      categories: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true } },
      openingHours: { orderBy: { weekday: "asc" }, select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
      menuCategories: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
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
}
