import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { db } from "@/lib/db";
import { STORE_COOKIE } from "@/lib/site";

/** restaurante em que o cliente entrou pelo link (a trava é do proxy.ts) */
export const lockedStore = cache(async () => {
  const slug = (await cookies()).get(STORE_COOKIE)?.value;
  if (!slug) return null;
  const store = await db.restaurant.findUnique({
    where: { slug },
    select: { slug: true, name: true, logoUrl: true, whatsapp: true, status: true },
  });
  return store?.status === "ACTIVE" ? store : null;
});
