"use client";

import { useEffect } from "react";

import { ligarImpressoraDoApp } from "@/app/painel/[restaurantId]/impressora-do-app";

// A impressão do salão no Menu Fácil PC.
//
// O delivery continua saindo pela tela de Pedidos, como sempre. Isto aqui
// cuida só do que é do salão -- a comanda da cozinha dos pedidos de mesa e
// a conta que o garçom pediu --, em qualquer tela do painel: o caixa passa
// a noite no mapa das mesas, não em Pedidos.
//
// É a mesma fila do Print Fácil, com a mesma trava de "já saiu" e a mesma
// divisão por seção. A diferença é que o programa não guarda token: o
// painel já está logado, pede um ao abrir e pergunta a fila de poucos em
// poucos segundos. Fora do programa do Windows, isto não faz nada.

const INTERVALO = 5000;

type NaFila = { id: string; numero: number; criado_em: string; tentativa: number };

let rodando = false;

export function ImpressaoDoSalao({ restaurantId }: { restaurantId: string }) {
  useEffect(() => {
    const app = typeof window === "undefined" ? null : (window.menuFacilApp ?? null);
    if (!app || rodando) return;
    rodando = true;

    let parado = false;
    let token: string | null = null;
    let desde = 0;
    let impressora: string | null = null;
    // o que já saiu nesta janela: se o servidor não ouvir o "impresso",
    // a via não sai de novo na volta seguinte
    const feitos = new Set<string>();

    const ligar = async () => {
      const estado = await app.estado();
      impressora = estado.impressora;
      const r = await ligarImpressoraDoApp(restaurantId, estado.computador, estado.impressora);
      if (!r) return false;
      token = r.token;
      desde = new Date(r.desde).getTime();
      return true;
    };

    const api = (caminho: string, init?: RequestInit) =>
      fetch(caminho, { ...init, cache: "no-store", headers: { authorization: `Bearer ${token}` } });

    const marcar = (id: string) => api(`/api/impressao/pedidos/${encodeURIComponent(id)}/impresso`, { method: "POST" });

    const volta = async () => {
      if (!token && !(await ligar())) return "sem-salao" as const;

      const q = impressora ? `?impressora=${encodeURIComponent(impressora)}` : "";
      const resposta = await api(`/api/impressao/pedidos${q}`);
      if (resposta.status === 401) {
        token = null;
        return;
      }
      if (!resposta.ok) return;
      const { pedidos } = (await resposta.json()) as { pedidos: NaFila[] };

      for (const p of pedidos) {
        if (parado) return;
        const chave = `${p.id}:${p.tentativa}`;
        if (feitos.has(chave)) continue;

        // o que é de antes deste computador virar impressora fica onde
        // está: ligar o programa não pode despejar a noite de ontem no
        // papel. Só a via pedida de novo (tentativa) sai.
        if (p.tentativa === 0 && new Date(p.criado_em).getTime() < desde) {
          feitos.add(chave);
          await marcar(p.id);
          continue;
        }

        const via = await api(`/api/impressao/pedidos/${encodeURIComponent(p.id)}`);
        if (!via.ok) continue;
        const t = (await via.json()) as { texto?: string; dados?: unknown; papel_mm?: number; numero?: number };
        if (!t.texto) continue;

        const saida = await app.imprimir({ texto: t.texto, dados: t.dados, papel: t.papel_mm, numero: t.numero ?? p.numero });
        if (saida?.ok) {
          feitos.add(chave);
          await marcar(p.id);
        }
      }
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const ciclo = async () => {
      let fim: "sem-salao" | void = undefined;
      try {
        fim = await volta();
      } catch {
        // sem internet agora: tenta de novo na próxima volta
      }
      // restaurante sem salão: não há o que perguntar ao servidor
      if (!parado && fim !== "sem-salao") timer = setTimeout(ciclo, INTERVALO);
    };
    void ciclo();

    return () => {
      parado = true;
      rodando = false;
      if (timer) clearTimeout(timer);
    };
  }, [restaurantId]);

  return null;
}
