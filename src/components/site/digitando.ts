"use client";

import { useSyncExternalStore } from "react";

// A pessoa está digitando num campo de texto -- o teclado do celular está
// aberto.
//
// No iPhone, com o teclado aberto, o que é "fixo embaixo" (a barra de
// Cardápio, Pedidos e Carrinho; a barra "Ver carrinho") não fica embaixo:
// sobe junto com a tela e para no meio dela, por cima do cardápio. Enquanto
// alguém digita, essas barras simplesmente saem, e voltam quando o teclado
// fecha.

const SEM_TECLADO = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image", "hidden"]);

function digitando() {
  const el = document.activeElement;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return !SEM_TECLADO.has(el.type);
  return el instanceof HTMLElement && el.isContentEditable;
}

function assinar(avisar: () => void) {
  document.addEventListener("focusin", avisar);
  document.addEventListener("focusout", avisar);
  return () => {
    document.removeEventListener("focusin", avisar);
    document.removeEventListener("focusout", avisar);
  };
}

export function useDigitando() {
  return useSyncExternalStore(assinar, digitando, () => false);
}
