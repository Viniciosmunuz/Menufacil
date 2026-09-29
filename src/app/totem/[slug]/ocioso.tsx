"use client";

import { useEffect } from "react";

import { cartCount, clearCart, useCart } from "@/components/site/cart-store";

// O totem fica horas aberto na mesma tela. Duas coisas dependem disso:
//
// 1. O cardápio precisa acompanhar o do dono. Esgotou um prato no painel às
//    11h, o balcão tem que parar de oferecer -- não adianta a tela ter
//    carregado às 8h e ficar parada no cardápio daquela hora.
// 2. O carrinho do cliente que desistiu não pode esperar o próximo cliente
//    com a comida do anterior dentro.
//
// As duas se resolvem juntas: passado um tempo sem ninguém tocar, o
// carrinho é esvaziado e a página é recarregada do servidor. Recarregar é
// de propósito mais forte que um refresh do Next -- garante foto, preço,
// esgotado e cardápio inteiro vindos do banco naquele instante.
//
// Enquanto o cliente está mexendo, nada acontece: cada toque zera a conta.

/** tempo sem ninguém tocar até o totem voltar ao começo */
const OCIOSO_MS = 90_000;
/** com a tela parada e o carrinho vazio, atualiza mais espaçado */
const VAZIO_MS = 5 * 60 * 1000;

export function TotemOcioso({ href }: { href: string }) {
  const cart = useCart();
  const temItens = cartCount(cart) > 0;

  useEffect(() => {
    let relogio: ReturnType<typeof setTimeout>;

    const recomecar = () => {
      // o carrinho é do cliente que foi embora: não fica para o próximo
      if (temItens) clearCart();
      window.location.href = href;
    };

    const armar = () => {
      clearTimeout(relogio);
      relogio = setTimeout(recomecar, temItens ? OCIOSO_MS : VAZIO_MS);
    };

    armar();
    const eventos = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const evento of eventos) window.addEventListener(evento, armar, { passive: true });

    return () => {
      clearTimeout(relogio);
      for (const evento of eventos) window.removeEventListener(evento, armar);
    };
  }, [href, temItens]);

  return null;
}
