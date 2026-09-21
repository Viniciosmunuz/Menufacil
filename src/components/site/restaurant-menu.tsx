"use client";

/* eslint-disable @next/next/no-img-element -- fotos já otimizadas no envio (WebP no tamanho de uso) */
import { ShoppingBag, Star, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";

import { addToCart, cartCount, cartSubtotal, useCart, type CartRestaurant } from "./cart-store";
import { QuantityStepper } from "./quantity-stepper";

export type MenuProduct = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  promoPriceCents: number | null;
  available: boolean;
  featured: boolean;
};

export type MenuCategory = { id: string; name: string; description: string | null; products: MenuProduct[] };

const unitPrice = (p: MenuProduct) => p.promoPriceCents ?? p.priceCents;

function Price({ p, className }: { p: MenuProduct; className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-extrabold", !!p.promoPriceCents && "text-brand")}>{formatCents(unitPrice(p))}</span>
      {p.promoPriceCents && <s className="text-sm text-faint">{formatCents(p.priceCents)}</s>}
    </span>
  );
}

function ProductRow({ p, onOpen }: { p: MenuProduct; onOpen: (p: MenuProduct) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(p)}
        disabled={!p.available}
        className="flex w-full items-stretch gap-4 rounded-card border border-line bg-surface p-4 text-left transition-colors enabled:hover:border-line-strong disabled:cursor-not-allowed"
      >
        <span className={cn("flex min-w-0 flex-1 flex-col gap-1", !p.available && "opacity-60")}>
          <span className="font-extrabold">{p.name}</span>
          {p.description && <span className="line-clamp-2 text-sm text-muted">{p.description}</span>}
          <span className="mt-auto pt-1">
            {p.available ? <Price p={p} /> : <span className="text-sm font-bold text-faint">Esgotado</span>}
          </span>
        </span>
        {p.imageUrl && (
          <span className={cn("size-24 shrink-0 overflow-hidden rounded-control bg-surface-2 sm:size-28", !p.available && "grayscale")}>
            <img src={p.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
          </span>
        )}
      </button>
    </li>
  );
}

export function RestaurantMenu({
  restaurant,
  categories,
  canOrder,
  closedMessage,
}: {
  restaurant: CartRestaurant;
  categories: MenuCategory[];
  /** fechado ou em prévia: dá para ver, não para pedir */
  canOrder: boolean;
  closedMessage: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [product, setProduct] = useState<MenuProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [conflict, setConflict] = useState(false);
  const cart = useCart();

  const featured = categories.flatMap((c) => c.products).filter((p) => p.featured && p.available);
  const mineInCart = cart.restaurant?.id === restaurant.id ? cart : null;

  function open(p: MenuProduct) {
    setProduct(p);
    setQuantity(1);
    setNotes("");
    setConflict(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function add(replace = false) {
    if (!product) return;
    const result = addToCart(
      restaurant,
      { productId: product.id, name: product.name, unitPriceCents: unitPrice(product), quantity, notes, imageUrl: product.imageUrl },
      { replace },
    );
    if (result === "conflict") {
      setConflict(true);
      return;
    }
    close();
  }

  return (
    <>
      {categories.length > 1 && (
        <nav
          className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto border-b border-line bg-bg/95 px-4 py-3 backdrop-blur [scrollbar-width:none] lg:top-[4.75rem] lg:mx-0 lg:rounded-b-card lg:px-0"
          aria-label="Categorias do cardápio"
        >
          {featured.length > 0 && (
            <a href="#destaques" className="flex h-10 shrink-0 items-center rounded-full border border-brand/50 bg-brand-soft px-4 text-sm font-bold text-brand">
              Destaques
            </a>
          )}
          {categories.map((c) => (
            <a
              key={c.id}
              href={`#cat-${c.id}`}
              className="flex h-10 shrink-0 items-center rounded-full border border-line bg-surface px-4 text-sm font-bold text-muted hover:text-ink"
            >
              {c.name}
            </a>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-8 pt-6">
        {featured.length > 0 && (
          <section id="destaques" className="scroll-mt-20 lg:scroll-mt-40">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold">
              <Star className="size-5 fill-brand text-brand" aria-hidden="true" />
              Destaques
            </h2>
            <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {featured.map((p) => (
                <li key={p.id} className="w-44 shrink-0 sm:w-52">
                  <button type="button" onClick={() => open(p)} className="flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-surface text-left hover:border-line-strong">
                    <span className="grid aspect-square w-full place-items-center bg-surface-2 text-faint">
                      {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="size-full object-cover" /> : <Star className="size-8" aria-hidden="true" />}
                    </span>
                    <span className="flex flex-1 flex-col gap-1 p-3">
                      <span className="line-clamp-2 font-extrabold">{p.name}</span>
                      <Price p={p} className="mt-auto text-sm" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {categories.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-20 lg:scroll-mt-40">
            <h2 className="text-xl font-extrabold">{c.name}</h2>
            {c.description && <p className="text-sm text-muted">{c.description}</p>}
            <ul className="mt-3 grid grid-cols-1 gap-3 2xl:grid-cols-2">
              {c.products.map((p) => (
                <ProductRow key={p.id} p={p} onOpen={open} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* barra do carrinho no celular (a coluna da direita faz esse papel no computador) */}
      {mineInCart && mineInCart.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 pb-3 lg:hidden">
          <Link
            href="/carrinho"
            className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 rounded-full bg-brand px-5 font-extrabold text-brand-ink shadow-lg shadow-black/40"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-5" aria-hidden="true" />
              Ver carrinho
              <span className="rounded-full bg-brand-ink/15 px-2 py-0.5 text-sm tabular-nums">{cartCount(mineInCart)}</span>
            </span>
            <span className="tabular-nums">{formatCents(cartSubtotal(mineInCart))}</span>
          </Link>
        </div>
      )}

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && close()}
        onClose={() => setProduct(null)}
        className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-card bg-surface p-0 text-ink backdrop:bg-black/70 sm:my-auto sm:rounded-card"
        aria-label={product?.name ?? "Produto"}
      >
        {product && (
          <div className="flex flex-col">
            <div className="relative">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="h-14" />
              )}
              <button
                type="button"
                onClick={close}
                className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-bg/80 text-ink backdrop-blur"
                aria-label="Fechar"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div>
                <h3 className="text-2xl leading-tight font-extrabold">{product.name}</h3>
                {product.description && <p className="mt-1 text-muted">{product.description}</p>}
                <Price p={product} className="mt-2 text-lg" />
              </div>
              {canOrder ? (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Alguma observação?</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={140}
                      rows={2}
                      placeholder="Ex.: sem cebola, ponto da carne..."
                      className="rounded-control border border-line bg-surface-2 px-4 py-3 text-base text-ink placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
                    />
                  </label>
                  {conflict ? (
                    <div className="flex flex-col gap-3 rounded-control border border-warning/40 bg-warning/10 p-4 text-sm">
                      <p>
                        Seu carrinho tem itens de <strong>{cart.restaurant?.name}</strong>. Cada pedido é de um restaurante só.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => add(true)}>
                          Começar um novo carrinho
                        </Button>
                        <Button size="sm" variant="ghost" onClick={close}>
                          Manter o outro
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <QuantityStepper value={quantity} onChange={setQuantity} label={product.name} />
                      <Button size="lg" className="flex-1 justify-between" onClick={() => add()}>
                        <span>Adicionar</span>
                        <span className="tabular-nums">{formatCents(unitPrice(product) * quantity)}</span>
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-control bg-surface-2 px-4 py-3 text-sm text-muted">{closedMessage ?? "Não é possível pedir agora."}</p>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
