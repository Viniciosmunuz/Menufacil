"use client";

import { Check, CheckSquare, X } from "lucide-react";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import type { PassoEmLote, ResultadoDoLote } from "./actions";

// Marcar vários pedidos e dar o mesmo passo em todos: "Saiu para entrega"
// para os cinco que o entregador levou juntos, "Entregue" quando ele volta.
//
// Fica escondido atrás de "Selecionar vários": no dia a dia o balcão anda
// pedido por pedido, e uma caixinha ao lado de cada um seria só ruído. Com
// a seleção ligada, cada pedido ganha a caixinha, e a barra de baixo mostra
// um botão por passo -- cada botão só move os pedidos marcados que estão
// naquele passo, então marcar um "aceitar" e um "entregue" juntos não faz
// nenhum dos dois pular etapa.

/** o próximo passo de um pedido, como a lista calculou */
export type PassoDoPedido = { orderId: string; from: string; to: string; label: string };

type Selecao = {
  ligada: boolean;
  marcados: Map<string, PassoDoPedido>;
  alternar: (passo: PassoDoPedido) => void;
};

const Contexto = createContext<Selecao | null>(null);

export function SelecaoDePedidos({
  restaurantId,
  acao,
  disponivel,
  children,
}: {
  restaurantId: string;
  acao: (restaurantId: string, passos: PassoEmLote[]) => Promise<ResultadoDoLote>;
  /** só na aba Em andamento: concluído e cancelado não têm passo a dar */
  disponivel: boolean;
  children: ReactNode;
}) {
  const [ligada, setLigada] = useState(false);
  const [marcados, setMarcados] = useState<Map<string, PassoDoPedido>>(new Map());
  const [recado, setRecado] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function alternar(passo: PassoDoPedido) {
    setMarcados((atual) => {
      const novo = new Map(atual);
      if (novo.has(passo.orderId)) novo.delete(passo.orderId);
      else novo.set(passo.orderId, passo);
      return novo;
    });
  }

  function desligar() {
    setLigada(false);
    setMarcados(new Map());
  }

  // um botão por passo, com quantos pedidos marcados estão nele
  const grupos = new Map<string, { label: string; passos: PassoDoPedido[] }>();
  for (const passo of marcados.values()) {
    const grupo = grupos.get(passo.to + passo.label) ?? { label: passo.label, passos: [] };
    grupo.passos.push(passo);
    grupos.set(passo.to + passo.label, grupo);
  }

  function aplicar(passos: PassoDoPedido[]) {
    setRecado(null);
    iniciar(async () => {
      const { feitos, pulados } = await acao(
        restaurantId,
        passos.map(({ orderId, from, to }) => ({ orderId, from, to })),
      );
      setMarcados((atual) => {
        const novo = new Map(atual);
        for (const p of passos) novo.delete(p.orderId);
        return novo;
      });
      setRecado(
        pulados > 0
          ? `${feitos} ${feitos === 1 ? "pedido atualizado" : "pedidos atualizados"}. ${pulados} já ${pulados === 1 ? "tinha mudado" : "tinham mudado"} e ficou como estava.`
          : `${feitos} ${feitos === 1 ? "pedido atualizado" : "pedidos atualizados"}.`,
      );
    });
  }

  if (!disponivel) return <>{children}</>;

  return (
    <Contexto.Provider value={{ ligada, marcados, alternar }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => (ligada ? desligar() : setLigada(true))}
          aria-pressed={ligada}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition-colors",
            ligada ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
          )}
        >
          {ligada ? <X className="size-4" aria-hidden="true" /> : <CheckSquare className="size-4" aria-hidden="true" />}
          {ligada ? "Cancelar seleção" : "Selecionar vários"}
        </button>
        {ligada && marcados.size === 0 && <span className="text-sm text-muted">Marque os pedidos que vão dar o mesmo passo.</span>}
        {recado && !ligada && <span className="text-sm font-semibold text-success">{recado}</span>}
      </div>

      {children}

      {ligada && (marcados.size > 0 || recado) && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 lg:bottom-6 lg:pl-[calc(5rem+1rem)]">
          <div className="mx-auto flex max-w-2xl flex-col gap-2 rounded-card border border-line bg-surface p-3 shadow-xl">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold">
                {marcados.size === 0
                  ? "Nada marcado"
                  : `${marcados.size} ${marcados.size === 1 ? "pedido marcado" : "pedidos marcados"}`}
              </span>
              {recado && <span className="truncate font-semibold text-success">{recado}</span>}
            </div>
            {marcados.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {[...grupos.values()].map((g) => (
                  <button
                    key={g.label}
                    type="button"
                    disabled={enviando}
                    onClick={() => aplicar(g.passos)}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control bg-brand px-4 text-sm font-extrabold whitespace-nowrap text-brand-ink transition active:scale-[0.98] disabled:opacity-60"
                  >
                    {enviando ? "Atualizando..." : `${g.label} (${g.passos.length})`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Contexto.Provider>
  );
}

/**
 * A caixinha de cada pedido. Só aparece com a seleção ligada, e só no
 * pedido que tem um passo que pode ir em lote; nos outros fica o espaço,
 * para a lista não andar de lado.
 */
export function MarcarPedido({ passo }: { passo: PassoDoPedido | null }) {
  const selecao = useContext(Contexto);
  if (!selecao?.ligada) return null;
  if (!passo) return <span className="w-7 shrink-0" aria-hidden="true" />;
  const marcado = selecao.marcados.has(passo.orderId);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcado}
      aria-label={`Marcar o pedido para ${passo.label.toLowerCase()}`}
      onClick={() => selecao.alternar(passo)}
      className={cn(
        "mt-3 grid size-7 shrink-0 place-items-center rounded-md border-2 transition-colors",
        marcado ? "border-brand bg-brand text-brand-ink" : "border-line-strong bg-surface",
      )}
    >
      {marcado && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
    </button>
  );
}
