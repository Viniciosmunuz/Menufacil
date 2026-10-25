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
//
// Com duas impressoras no mesmo computador, cada uma é um aparelho com a
// própria fila, e a via sai com o nome da impressora dela. O programa
// antigo (antes da 1.4.0) ignora esse nome e tira tudo no caixa: sai no
// lugar errado, mas sai -- nenhuma comanda fica presa na fila.

const INTERVALO = 5000;

/** a tela de impressoras avisa por aqui que ligou ou desligou uma */
export const IMPRESSORAS_MUDARAM = "mf-impressoras-do-salao";

type NaFila = { id: string; numero: number; criado_em: string; tentativa: number };
type Fila = { token: string; desde: number; impressora: string | null };

let rodando = false;

export function ImpressaoDoSalao({ restaurantId }: { restaurantId: string }) {
  useEffect(() => {
    const app = typeof window === "undefined" ? null : (window.menuFacilApp ?? null);
    if (!app || rodando) return;
    rodando = true;

    let parado = false;
    let filas: Fila[] | null = null;
    let doCaixa: string | null = null;
    // o que já saiu nesta janela: se o servidor não ouvir o "impresso",
    // a via não sai de novo na volta seguinte
    const feitos = new Set<string>();

    const ligar = async () => {
      const estado = await app.estado();
      doCaixa = estado.impressora;
      const r = await ligarImpressoraDoApp(restaurantId, estado.computador, estado.impressora);
      if (!r) return false;
      filas = r.map((f) => ({ token: f.token, desde: new Date(f.desde).getTime(), impressora: f.impressora }));
      return true;
    };

    const api = (fila: Fila, caminho: string, init?: RequestInit) =>
      fetch(caminho, { ...init, cache: "no-store", headers: { authorization: `Bearer ${fila.token}` } });

    const marcar = (fila: Fila, id: string) => api(fila, `/api/impressao/pedidos/${encodeURIComponent(id)}/impresso`, { method: "POST" });

    const umaFila = async (fila: Fila) => {
      // a do caixa conta ao servidor qual impressora o programa usa
      const nome = fila.impressora ?? doCaixa;
      const q = nome ? `?impressora=${encodeURIComponent(nome)}` : "";
      const resposta = await api(fila, `/api/impressao/pedidos${q}`);
      if (resposta.status === 401) {
        filas = null;
        return;
      }
      if (!resposta.ok) return;
      const { pedidos } = (await resposta.json()) as { pedidos: NaFila[] };

      for (const p of pedidos) {
        if (parado) return;
        const chave = `${fila.token}:${p.id}:${p.tentativa}`;
        if (feitos.has(chave)) continue;

        // o que é de antes desta impressora entrar fica onde está: ligar o
        // programa não pode despejar a noite de ontem no papel. Só a via
        // pedida de novo (tentativa) sai.
        if (p.tentativa === 0 && new Date(p.criado_em).getTime() < fila.desde) {
          feitos.add(chave);
          await marcar(fila, p.id);
          continue;
        }

        const via = await api(fila, `/api/impressao/pedidos/${encodeURIComponent(p.id)}`);
        if (!via.ok) continue;
        const t = (await via.json()) as { texto?: string; dados?: unknown; papel_mm?: number; numero?: number };
        if (!t.texto) continue;

        const saida = await app.imprimir({
          texto: t.texto,
          dados: t.dados,
          papel: t.papel_mm,
          numero: t.numero ?? p.numero,
          ...(fila.impressora ? { impressora: fila.impressora } : {}),
        });
        if (saida?.ok) {
          feitos.add(chave);
          await marcar(fila, p.id);
        }
      }
    };

    const volta = async () => {
      if (!filas && !(await ligar())) return "sem-salao" as const;
      for (const fila of filas ?? []) {
        if (parado) return;
        await umaFila(fila);
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

    // ligou ou desligou uma impressora: pega as filas de novo na próxima volta
    const mudou = () => {
      filas = null;
    };
    window.addEventListener(IMPRESSORAS_MUDARAM, mudou);

    return () => {
      parado = true;
      rodando = false;
      if (timer) clearTimeout(timer);
      window.removeEventListener(IMPRESSORAS_MUDARAM, mudou);
    };
  }, [restaurantId]);

  return null;
}
