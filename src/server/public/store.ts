import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { db } from "@/lib/db";
import { STORE_COOKIE } from "@/lib/site";
import { SESSION_COOKIE } from "@/server/auth/session";

/** restaurante em que o cliente entrou pelo link (a trava é do proxy.ts); a equipe logada navega livre */
export const lockedStore = cache(async () => {
  const jar = await cookies();
  const slug = jar.get(STORE_COOKIE)?.value;
  if (!slug || jar.has(SESSION_COOKIE)) return null;
  const store = await db.restaurant.findUnique({
    where: { slug },
    select: { slug: true, name: true, logoUrl: true, whatsapp: true, status: true },
  });
  return store?.status === "ACTIVE" ? store : null;
});
