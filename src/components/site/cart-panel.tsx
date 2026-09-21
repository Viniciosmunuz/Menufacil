"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";

import { cartCount, cartSubtotal, setQuantity, useCart } from "./cart-store";
import { QuantityStepper } from "./quantity-stepper";

// Itens do carrinho com + e –. Aparece na coluna da direita da página do
// restaurante (computador) e na página /carrinho.
export function CartPanel({
  restaurantId,
  minOrderCents = 0,
  closed = false,
  className,
}: {
  /** na página de um restaurante: só mostra se o carrinho é dele */
  restaurantId?: string;
  minOrderCents?: number;
  closed?: boolean;
  className?: string;
}) {
  const cart = useCart();
  const mine = !restaurantId || cart.restaurant?.id === restaurantId;
  const items = mine ? cart.items : [];
  const subtotal = cartSubtotal(cart);
  const missing = Math.max(0, minOrderCents - subtotal);

  if (items.length === 0 || !cart.restaurant) {
    return (
      <div className={cn("flex flex-col items-center rounded-card border border-line bg-surface px-5 py-8 text-center", className)}>
        <ShoppingBag className="size-10 text-faint" strokeWidth={1.5} aria-hidden="true" />
        <p className="mt-3 font-extrabold">Seu carrinho está vazio</p>
        <p className="mt-1 text-sm text-muted">
          {restaurantId ? "Toque em um produto para adicionar." : "Escolha um restaurante e monte seu pedido."}
        </p>
        {!restaurantId && (
          <Link href="/restaurantes" className={buttonClasses("primary", "md", "mt-5")}>
            Ver restaurantes
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col rounded-card border border-line bg-surface", className)}>
      <div className="border-b border-line px-5 py-4">
        <p className="text-sm text-muted">Seu pedido em</p>
        <Link href={`/restaurante/${cart.restaurant.slug}`} className="font-extrabold hover:text-brand">
          {cart.restaurant.name}
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {items.map((item) => (
          <li key={item.key} className="flex flex-col gap-2 px-5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">{item.name}</p>
                {item.notes && <p className="text-sm text-muted">Obs.: {item.notes}</p>}
              </div>
              <p className="shrink-0 font-extrabold tabular-nums">{formatCents(item.unitPriceCents * item.quantity)}</p>
            </div>
            <QuantityStepper
              size="sm"
              value={item.quantity}
              onChange={(q) => setQuantity(item.key, q)}
              allowRemove
              label={item.name}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
        <p className="flex justify-between text-lg font-extrabold">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCents(subtotal)}</span>
        </p>
        {missing > 0 && (
          <p className="text-sm text-warning">Faltam {formatCents(missing)} para o pedido mínimo de {formatCents(minOrderCents)}.</p>
        )}
        {closed ? (
          <p className="rounded-control bg-surface-2 px-3 py-2 text-sm text-muted">O restaurante está fechado agora. O pedido fica guardado aqui.</p>
        ) : (
          <Link
            href={`/restaurante/${cart.restaurant.slug}/pedido`}
            aria-disabled={missing > 0}
            className={buttonClasses("primary", "lg", cn("w-full", missing > 0 && "pointer-events-none opacity-50"))}
          >
            Finalizar pedido
          </Link>
        )}
        <p className="text-center text-xs text-faint">{cartCount(cart)} {cartCount(cart) === 1 ? "item" : "itens"} · entrega calculada no próximo passo</p>
      </div>
    </div>
  );
}
