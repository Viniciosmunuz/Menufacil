"use client";

import { useSyncExternalStore } from "react";

// Carrinho do cliente, guardado no aparelho (localStorage). Um restaurante
// por vez. Os preços daqui servem só para mostrar: quem calcula o total do
// pedido de verdade é o servidor, com os preços do banco.

export type CartItem = {
  /** produto + observação: o mesmo lanche "sem cebola" é outra linha */
  key: string;
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string;
  imageUrl: string | null;
};

export type CartRestaurant = { id: string; slug: string; name: string };

export type Cart = { restaurant: CartRestaurant | null; items: CartItem[] };

const STORAGE_KEY = "mf_carrinho";
const EVENT = "mf-carrinho";
const EMPTY: Cart = { restaurant: null, items: [] };
export const MAX_QUANTITY = 50;

let cachedRaw: string | null | undefined;
let cachedCart: Cart = EMPTY;

function read(): Cart {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedCart;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as Cart) : EMPTY;
    cachedCart = parsed && Array.isArray(parsed.items) ? parsed : EMPTY;
  } catch {
    cachedCart = EMPTY;
  }
  return cachedCart;
}

function write(cart: Cart) {
  try {
    if (cart.items.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // navegador sem armazenamento (aba anônima antiga): o carrinho vive só na memória
    cachedRaw = JSON.stringify(cart);
    cachedCart = cart;
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && callback();
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage); // outra aba
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function cartCount(cart: Cart) {
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartSubtotal(cart: Cart) {
  return cart.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
}

/** "conflict" quando o carrinho tem itens de outro restaurante */
export function addToCart(
  restaurant: CartRestaurant,
  item: Omit<CartItem, "key">,
  options: { replace?: boolean } = {},
): "ok" | "conflict" {
  const cart = read();
  if (cart.restaurant && cart.restaurant.id !== restaurant.id && cart.items.length > 0 && !options.replace) {
    return "conflict";
  }
  const base = cart.restaurant?.id === restaurant.id ? cart.items : [];
  const notes = item.notes.trim().slice(0, 140);
  const key = `${item.productId}:${notes.toLowerCase()}`;
  const existing = base.find((i) => i.key === key);
  const items = existing
    ? base.map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_QUANTITY, i.quantity + item.quantity) } : i))
    : [...base, { ...item, notes, key, quantity: Math.min(MAX_QUANTITY, item.quantity) }];
  write({ restaurant, items });
  return "ok";
}

export function setQuantity(key: string, quantity: number) {
  const cart = read();
  const items =
    quantity <= 0
      ? cart.items.filter((i) => i.key !== key)
      : cart.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_QUANTITY, quantity) } : i));
  write({ restaurant: items.length ? cart.restaurant : null, items });
}

export function clearCart() {
  write(EMPTY);
}
