import "server-only";

import { cookies } from "next/headers";

import { CITY_COOKIE } from "@/lib/site";

/** cidade escolhida pelo visitante no topo do site (ou null = todas) */
export async function selectedCity() {
  const raw = (await cookies()).get(CITY_COOKIE)?.value;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).slice(0, 80) || null;
  } catch {
    return null;
  }
}
