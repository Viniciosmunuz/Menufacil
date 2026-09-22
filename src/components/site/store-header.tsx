"use client";

import { ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";

import { cartCount, useCart } from "./cart-store";

/** topo de quem entrou pelo link do restaurante: só ele, sem busca nem outros restaurantes */
export function StoreHeader({ store }: { store: { slug: string; name: string; logoUrl: string | null } }) {
  const cart = useCart();
  const count = cartCount(cart);

  return (
    <header className="z-30 border-b border-line bg-bg/90 backdrop-blur lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[90rem] items-center gap-3 px-4 py-3 lg:px-6">
        <Link href={`/restaurante/${store.slug}`} className="flex min-w-0 items-center gap-3">
          <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-surface-3">
            {store.logoUrl ? (
              <Image src={store.logoUrl} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              <LogoIcon className="h-5" />
            )}
          </span>
          <span className="truncate text-lg font-extrabold">{store.name}</span>
        </Link>
        <Link
          href="/carrinho"
          className="relative ml-auto grid size-11 shrink-0 place-items-center rounded-control text-ink hover:bg-surface-2"
          aria-label={`Carrinho${count ? ` (${count} itens)` : ""}`}
        >
          <ShoppingCart className="size-6" aria-hidden="true" />
          {count > 0 && (
            <span className="absolute top-0.5 right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[0.7rem] font-extrabold text-brand-ink tabular-nums">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
