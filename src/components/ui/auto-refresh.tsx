"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Atualiza a página sozinha (pedido andando, pedido novo).
 *
 * Com `background`, continua atualizando mesmo com a janela minimizada ou
 * em outra aba — é o caso do painel de pedidos, que precisa imprimir sem
 * ninguém olhando. O navegador segura o ritmo nesse estado (costuma cair
 * para uma vez por minuto) e o celular chega a congelar a aba; por isso,
 * ao voltar para a tela, atualiza na hora e tira o atraso.
 */
export function AutoRefresh({ seconds = 15, background = false }: { seconds?: number; background?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (background || document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router, seconds, background]);
  return null;
}
