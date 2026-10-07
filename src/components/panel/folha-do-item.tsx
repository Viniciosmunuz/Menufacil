"use client";

import { Minus, Plus, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { ProdutoDoCardapio } from "@/server/salao/comanda";

// O item antes de entrar na comanda.
//
// Tocar no prato não lança: abre esta folha, de baixo para cima, onde se
// diz quantos são, o que marcar e o que escrever. Somar direto ao toque
// daria uma unidade por vez e nenhuma observação -- e "sem cebola" é
// metade do que um garçom anota numa mesa.
//
// A folha sobe do rodapé porque é de lá que a mão vem. No computador ela
// vira uma caixa centrada, onde o cursor já está.

export type ItemEscolhido = {
  produtoId: string;
  nome: string;
  centavos: number;
  quantidade: number;
  observacao: string | null;
  opcoes: { id: string; nome: string; centavos: number }[];
};

export function FolhaDoItem({
  produto,
  onFechar,
  onAdicionar,
}: {
  produto: ProdutoDoCardapio;
  onFechar: () => void;
  onAdicionar: (item: ItemEscolhido) => void;
}) {
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [marcadas, setMarcadas] = useState<Record<string, string[]>>({});

  const escolhidas = produto.grupos.flatMap((g) =>
    (marcadas[g.id] ?? []).flatMap((id) => {
      const o = g.opcoes.find((x) => x.id === id);
      return o ? [{ id: o.id, nome: o.nome, centavos: o.centavos }] : [];
    }),
  );

  const unidade = produto.centavos + escolhidas.reduce((s, o) => s + o.centavos, 0);
  const total = unidade * quantidade;

  // grupo obrigatório sem nada marcado trava o botão: é o tamanho da
  // pizza, o sabor do suco -- mandar para a cozinha sem isso é devolver o
  // prato depois
  const faltando = produto.grupos.find((g) => g.obrigatorio && (marcadas[g.id] ?? []).length === 0);

  const alternar = (grupoId: string, opcaoId: string, maximo: number) =>
    setMarcadas((atual) => {
      const agora = atual[grupoId] ?? [];
      if (agora.includes(opcaoId)) return { ...atual, [grupoId]: agora.filter((i) => i !== opcaoId) };
      // no grupo de uma escolha só, marcar troca; nos outros, acumula até o teto
      if (maximo <= 1) return { ...atual, [grupoId]: [opcaoId] };
      return agora.length >= maximo ? atual : { ...atual, [grupoId]: [...agora, opcaoId] };
    });

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/60" />

      <div className="relative flex max-h-[88dvh] w-full flex-col rounded-t-card border border-line bg-surface sm:max-w-md sm:rounded-card">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-extrabold">{produto.nome}</h2>
            <p className="text-sm text-muted tabular-nums">{formatCents(produto.centavos)}</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="grid size-9 shrink-0 place-items-center rounded-control text-muted hover:text-ink">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {produto.grupos.map((g) => (
            <section key={g.id} className="mb-5 flex flex-col gap-2">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold">
                {g.nome}
                <span className="text-xs font-semibold text-faint">
                  {g.obrigatorio ? "escolha 1" : g.maximo > 1 ? `até ${g.maximo}` : "opcional"}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {g.opcoes.map((o) => {
                  const marcada = (marcadas[g.id] ?? []).includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={!o.disponivel}
                      onClick={() => alternar(g.id, o.id, g.maximo)}
                      className={cn(
                        "flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-bold transition-colors disabled:opacity-40 disabled:line-through",
                        marcada ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
                      )}
                    >
                      {o.nome}
                      {o.centavos > 0 && <span className="text-xs tabular-nums">+{formatCents(o.centavos)}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold">Observação</span>
            <input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={120}
              placeholder="sem cebola, ponto da carne..."
              className="h-12 w-full rounded-control border border-line bg-surface-2 px-4 outline-none placeholder:text-faint focus:border-brand"
            />
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-1 rounded-control border border-line">
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              aria-label="Tirar um"
              className="grid size-11 place-items-center text-muted hover:text-ink"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span className="w-8 text-center text-lg font-extrabold tabular-nums">{quantidade}</span>
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.min(99, q + 1))}
              aria-label="Mais um"
              className="grid size-11 place-items-center text-muted hover:text-ink"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            disabled={!!faltando}
            onClick={() =>
              onAdicionar({
                produtoId: produto.id,
                nome: produto.nome,
                centavos: unidade,
                quantidade,
                observacao: observacao.trim() || null,
                opcoes: escolhidas,
              })
            }
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-brand font-extrabold text-brand-ink disabled:opacity-40"
          >
            {faltando ? `Escolha ${faltando.nome.toLowerCase()}` : `Adicionar · ${formatCents(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
