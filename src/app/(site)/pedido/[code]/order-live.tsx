"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { clearCart, useCart } from "@/components/site/cart-store";

/** esvazia o carrinho depois que o pedido deste restaurante foi feito */
export function ClearCartAfterOrder({ restaurantId }: { restaurantId: string }) {
  const cart = useCart();
  useEffect(() => {
    if (cart.restaurant?.id === restaurantId) clearCart();
  }, [cart.restaurant?.id, restaurantId]);
  return null;
}

/** atualiza o status sozinho enquanto o pedido está andando */
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
