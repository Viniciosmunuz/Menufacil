"use client";

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
