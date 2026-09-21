import "server-only";

import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

/** endereço livre a partir do nome: "burger-da-praca", "burger-da-praca-2"... */
export async function availableSlug(name: string) {
  const root = slugify(name) || "restaurante";
  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    if (!(await isSlugTaken(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function isSlugTaken(slug: string, exceptRestaurantId?: string) {
  const found = await db.restaurant.findUnique({ where: { slug }, select: { id: true } });
  return !!found && found.id !== exceptRestaurantId;
}
