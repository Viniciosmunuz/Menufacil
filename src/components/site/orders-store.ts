"use client";

import { useSyncExternalStore } from "react";

// Pedidos feitos neste aparelho. Sem cadastro: o site guarda só o código de
// cada pedido (o mesmo do link) para montar a aba "Pedidos". O andamento
// vem do servidor, pelo código.

export type SavedOrder = {
  code: string;
  number: number;
  restaurantName: string;
  restaurantSlug: string;
  /** para ordenar sem precisar do servidor */
  createdAt: string;
};

const STORAGE_KEY = "mf_pedidos";
const EVENT = "mf-pedidos";
const EMPTY: SavedOrder[] = [];
/** o suficiente para o cliente achar um pedido antigo, sem encher o aparelho */
export const MAX_SAVED = 20;

let cachedRaw: string | null | undefined;
let cachedOrders: SavedOrder[] = EMPTY;

function read(): SavedOrder[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedOrders;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as SavedOrder[]) : EMPTY;
    cachedOrders = Array.isArray(parsed) ? parsed.filter((o) => o && typeof o.code === "string") : EMPTY;
  } catch {
    cachedOrders = EMPTY;
  }
  return cachedOrders;
}

function write(orders: SavedOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // navegador sem armazenamento: a lista vive só nesta visita
    cachedRaw = JSON.stringify(orders);
    cachedOrders = orders;
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

export function useMyOrders() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** guarda o pedido no aparelho (o mesmo pedido de novo só sobe para o topo) */
export function rememberOrder(order: SavedOrder) {
  const current = read();
  if (current[0]?.code === order.code) return; // já está no topo
  write([order, ...current.filter((o) => o.code !== order.code)].slice(0, MAX_SAVED));
}
