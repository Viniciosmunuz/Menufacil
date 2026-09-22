"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** atualiza a página sozinha enquanto ela está visível (pedido andando, pedido novo) */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
