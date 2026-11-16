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

// A tela pergunta ao servidor, de poucos em poucos segundos, se entrou
// comanda de mesa ou conta pedida. Quando entrou, a fila é buscada na hora
// -- a via já vem junto, numa ida só.
/** de quanto em quanto tempo a tela espia se mudou alguma coisa */
const VIGIA = 3000;
/** e a busca completa da fila, de reserva, para o que escapar da espiada */
const RESERVA = 15000;

/** a tela de impressoras avisa por aqui que ligou ou desligou uma */
export const IMPRESSORAS_MUDARAM = "mf-impressoras-do-salao";

type Via = { texto?: string; dados?: unknown; papel_mm?: number; numero?: number };
type NaFila = { id: string; numero: number; criado_em: string; tentativa: number; via?: Via | null };
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
      const q = new URLSearchParams({ vias: "1", ...(nome ? { impressora: nome } : {}) });
      const resposta = await api(fila, `/api/impressao/pedidos?${q}`);
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
          void marcar(fila, p.id);
          continue;
        }

        // a via veio junto; só a busca à parte se o servidor não mandou
        let t: Via | null | undefined = p.via;
        if (!t) {
          const via = await api(fila, `/api/impressao/pedidos/${encodeURIComponent(p.id)}`);
          if (!via.ok) continue;
          t = (await via.json()) as Via;
        }
        if (!t?.texto) continue;

        const saida = await app.imprimir({
          texto: t.texto,
          dados: t.dados,
          papel: t.papel_mm,
          numero: t.numero ?? p.numero,
          ...(fila.impressora ? { impressora: fila.impressora } : {}),
        });
        if (saida?.ok) {
          feitos.add(chave);
          // o "impresso" vai sem segurar a próxima via: se ele se perder,
          // o feitos desta janela já impede a mesma via de sair de novo
          void marcar(fila, p.id).catch(() => {});
        }
      }
    };

    // as impressoras do computador trabalham juntas: a do bar não espera a
    // do caixa terminar
    const volta = async () => {
      if (!filas && !(await ligar())) return "sem-salao" as const;
      await Promise.all((filas ?? []).map((fila) => umaFila(fila).catch(() => {})));
    };

    // Uma busca de cada vez. O aviso que chega no meio de uma busca não se
    // perde: ela roda de novo assim que terminar.
    let buscando = false;
    let deNovo = false;
    let semSalao = false;
    const agora = async () => {
      if (parado || semSalao) return;
      if (buscando) {
        deNovo = true;
        return;
      }
      buscando = true;
      try {
        do {
          deNovo = false;
          if ((await volta()) === "sem-salao") semSalao = true;
        } while (deNovo && !parado && !semSalao);
        // restaurante sem salão: as duas voltas param sozinhas daqui em
        // diante, porque as duas olham o semSalao antes de marcar a próxima
      } catch {
        // sem internet agora: a próxima volta tenta de novo
      } finally {
        buscando = false;
      }
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const reserva = async () => {
      await agora();
      if (!parado && !semSalao) timer = setTimeout(reserva, RESERVA);
    };
    void reserva();

    // A pergunta curta ao servidor: entrou comanda de mesa, pediram a via
    // de novo ou o garçom pediu a conta. Era um canal aberto (SSE) até
    // 15/11/2026, com uma função do servidor de pé o tempo todo; isso
    // estourou a memória da conta na Vercel. Perguntar de três em três
    // segundos custa quase nada e a comanda sai no mesmo tempo de antes.
    let vigia: ReturnType<typeof setTimeout> | undefined;
    let retrato: string | null = null;
    const espiar = async () => {
      if (parado || semSalao) return;
      try {
        const r = await fetch(`/api/painel/${restaurantId}/eventos?salao=1`, { cache: "no-store" });
        if (r.ok) {
          const dados = (await r.json()) as { retrato: string };
          if (retrato !== null && dados.retrato !== retrato) void agora();
          retrato = dados.retrato;
        }
      } catch {
        // sem internet agora: a próxima volta tenta de novo
      }
      if (!parado && !semSalao) vigia = setTimeout(espiar, VIGIA);
    };
    void espiar();

    // ligou ou desligou uma impressora: pega as filas de novo na hora
    const mudou = () => {
      filas = null;
      void agora();
    };
    window.addEventListener(IMPRESSORAS_MUDARAM, mudou);

    return () => {
      parado = true;
      rodando = false;
      if (timer) clearTimeout(timer);
      if (vigia) clearTimeout(vigia);
      window.removeEventListener(IMPRESSORAS_MUDARAM, mudou);
    };
  }, [restaurantId]);

  return null;
}
