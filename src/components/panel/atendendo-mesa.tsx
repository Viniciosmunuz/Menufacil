"use client";

import { useEffect } from "react";

// Avisa o caixa que o garçom está com esta mesa aberta no celular.
//
// Marca ao abrir, renova a cada 20 segundos enquanto a tela estiver à vista
// e desmarca ao sair. Se o celular apagar ou perder a rede no meio, a marca
// vence sozinha no mapa (ver server/salao/mesas.ts): o cartão nunca fica
// roxo para sempre por causa de um garçom que guardou o aparelho.

const CADA_MS = 20_000;

export function AtendendoMesa({
  restaurantId,
  mesaId,
  marcar,
}: {
  restaurantId: string;
  mesaId: string;
  marcar: (restaurantId: string, mesaId: string, aberta: boolean) => Promise<void>;
}) {
  useEffect(() => {
    const avisar = (aberta: boolean) => {
      marcar(restaurantId, mesaId, aberta).catch(() => {
        // sem rede: a próxima volta tenta de novo
      });
    };
    const renovar = () => {
      if (document.visibilityState === "visible") avisar(true);
      else avisar(false);
    };

    avisar(true);
    const relogio = setInterval(renovar, CADA_MS);
    document.addEventListener("visibilitychange", renovar);
    return () => {
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", renovar);
      avisar(false);
    };
  }, [restaurantId, mesaId, marcar]);

  return null;
}
