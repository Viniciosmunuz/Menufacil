"use server";

import { listRestaurants, type PublicRestaurantCard } from "@/server/public/restaurants";

/** cartões dos restaurantes favoritados (os favoritos ficam no aparelho) */
export async function favoriteRestaurants(slugs: string[]): Promise<PublicRestaurantCard[]> {
  const clean = (Array.isArray(slugs) ? slugs : []).filter((s) => typeof s === "string" && /^[a-z0-9-]{1,60}$/.test(s)).slice(0, 50);
  if (clean.length === 0) return [];
  const cards = await listRestaurants({ slugs: clean, take: 50 });
  // na ordem em que a pessoa favoritou
  return clean.map((slug) => cards.find((c) => c.slug === slug)).filter((c): c is PublicRestaurantCard => !!c);
}
