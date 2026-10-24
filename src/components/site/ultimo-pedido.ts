"use client";

import { useSyncExternalStore } from "react";

import type { CartItem } from "./cart-store";

// O último pedido feito neste aparelho, um por restaurante -- é o que o
// "Pedir de novo" do cardápio põe de volta no carrinho.
//
// Guarda os itens como estavam no carrinho, com as opções, sabores e
// acompanhamentos escolhidos, e não o pedido do servidor: lá cada item fica
// só como texto ("Tamanho: Grande"), e com texto não dá para montar o item
// de novo. O preço guardado não vale nada: o cardápio recalcula com o preço
// de hoje e deixa de fora o que acabou.

export type UltimoPedido = { itens: CartItem[]; quando: string };

type PorRestaurante = Record<string, UltimoPedido>;

const CHAVE = "mf_ultimo_pedido";
const EVENTO = "mf-ultimo-pedido";
/** restaurantes lembrados; o mais antigo sai quando passa disso */
const MAXIMO = 10;
const VAZIO: PorRestaurante = {};

let lidoBruto: string | null | undefined;
let lido: PorRestaurante = VAZIO;

function ler(): PorRestaurante {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch {
    return VAZIO;
  }
  if (bruto === lidoBruto) return lido;
  lidoBruto = bruto;
  try {
    const dados = bruto ? (JSON.parse(bruto) as PorRestaurante) : VAZIO;
    lido = dados && typeof dados === "object" ? dados : VAZIO;
  } catch {
    lido = VAZIO;
  }
  return lido;
}

function assinar(avisar: () => void) {
  const deOutraAba = (e: StorageEvent) => e.key === CHAVE && avisar();
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", deOutraAba);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", deOutraAba);
  };
}

/** o pedido acabou de ser feito: os itens do carrinho viram o "último pedido" */
export function guardarUltimoPedido(restaurantId: string, itens: CartItem[]) {
  if (itens.length === 0) return;
  const atual = { ...ler(), [restaurantId]: { itens, quando: new Date().toISOString() } };
  const restaurantes = Object.entries(atual)
    .sort(([, a], [, b]) => b.quando.localeCompare(a.quando))
    .slice(0, MAXIMO);
  try {
    localStorage.setItem(CHAVE, JSON.stringify(Object.fromEntries(restaurantes)));
  } catch {
    // navegador sem armazenamento: fica sem o "Pedir de novo", e só
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function useUltimoPedido(restaurantId: string): UltimoPedido | null {
  const todos = useSyncExternalStore(assinar, ler, () => VAZIO);
  return todos[restaurantId] ?? null;
}
