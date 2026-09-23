"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

import { cartCount, useCart } from "./cart-store";

/** carrinho do topo: o único acesso fixo ao carrinho em qualquer página */
export function CartIconLink({ className }: { className?: string }) {
  const cart = useCart();
  const count = cartCount(cart);

  return (
    <Link
      href="/carrinho"
      className={cn("relative grid size-11 shrink-0 place-items-center rounded-control text-ink hover:bg-surface-2", className)}
      aria-label={`Carrinho${count ? ` (${count} itens)` : ""}`}
    >
      <ShoppingCart className="size-6" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[0.7rem] font-extrabold text-brand-ink tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}
