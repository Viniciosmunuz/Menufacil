"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Pedido novo aparece na hora: a tela abre um canal com o servidor e, ao
// menor sinal de mudança, se atualiza. É isto que tirou a espera de até um
// minuto entre o cliente confirmar e o pedido surgir no balcão.
//
// Se o canal cair (internet ruim, navegador antigo), o <AutoRefresh /> que
// fica ao lado continua atualizando de tempos em tempos: o painel nunca
// depende só de uma coisa.

export function OrdersLive({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [ligado, setLigado] = useState(false);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    let fonte: EventSource | null = null;
    let religar: ReturnType<typeof setTimeout> | null = null;
    let vivo = true;

    const abrir = () => {
      if (!vivo) return;
      fonte = new EventSource(`/api/painel/${restaurantId}/eventos`);

      fonte.addEventListener("pronto", () => setLigado(true));
      fonte.addEventListener("pedidos", () => router.refresh());
      fonte.onerror = () => {
        setLigado(false);
        fonte?.close();
        // o canal se encerra sozinho a cada 50 s: reabrir é o esperado
        if (vivo) religar = setTimeout(abrir, 1500);
      };
    };

    abrir();
    return () => {
      vivo = false;
      if (religar) clearTimeout(religar);
      fonte?.close();
    };
  }, [restaurantId, router]);

  // a tela não muda de forma por causa disto; o estado serve para o título
  return <span hidden data-ao-vivo={ligado ? "sim" : "nao"} />;
}
