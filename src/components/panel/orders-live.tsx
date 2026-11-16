"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Pedido novo aparece sozinho: a tela pergunta ao servidor, de dez em dez
// segundos, um resumo do que está aberto, e se atualiza quando o resumo
// muda. É isto que tirou a espera de até um minuto entre o cliente
// confirmar e o pedido surgir no balcão.
//
// Era um canal aberto (SSE), com uma função do servidor de pé o tempo todo
// por tela aberta. Isso estourou a memória da conta na Vercel em 15/11/2026
// e o projeto inteiro corria o risco de ser pausado -- cardápio fora do ar.
// A pergunta curta custa um centésimo e o balcão não sente: dez segundos no
// pior caso, e na hora quando alguém volta para a tela.
//
// O <AutoRefresh /> que fica ao lado continua de reserva: se a pergunta
// falhar (internet ruim), o painel ainda se atualiza sozinho.

/** de quanto em quanto tempo a tela pergunta se mudou alguma coisa */
const INTERVALO_MS = 10_000;

export function OrdersLive({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [ligado, setLigado] = useState(false);

  useEffect(() => {
    let vivo = true;
    let anterior: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let perguntando = false;

    const perguntar = async () => {
      if (!vivo || perguntando) return;
      perguntando = true;
      try {
        const r = await fetch(`/api/painel/${restaurantId}/eventos`, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const { retrato } = (await r.json()) as { retrato: string };
        if (!vivo) return;
        setLigado(true);
        // a primeira resposta só serve de ponto de partida
        if (anterior !== null && retrato !== anterior) router.refresh();
        anterior = retrato;
      } catch {
        // sem internet agora: a próxima volta tenta de novo
        if (vivo) setLigado(false);
      } finally {
        perguntando = false;
      }
    };

    const volta = async () => {
      await perguntar();
      if (vivo) timer = setTimeout(volta, INTERVALO_MS);
    };
    void volta();

    // voltou para a tela depois de um tempo: não espera a próxima volta
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void perguntar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);

    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, [restaurantId, router]);

  // a tela não muda de forma por causa disto; o estado serve para o título
  return <span hidden data-ao-vivo={ligado ? "sim" : "nao"} />;
}
