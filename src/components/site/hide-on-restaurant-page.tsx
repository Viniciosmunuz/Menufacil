"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** esconde um trecho do topo nas páginas de restaurante (e no pedido) */
export function HideOnRestaurantPage({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/restaurante/")) return null;
  return <>{children}</>;
}
