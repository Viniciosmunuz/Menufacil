"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

// As três abas do relatório do caixa, como no Yooga: o que vendi, em que
// forma de pagamento, e o que entrou e saiu de dinheiro à mão.
//
// São três perguntas diferentes sobre a mesma noite, e empilhar as três
// listas numa tela só faria o dono rolar para achar a que ele veio ver.
// O conteúdo vem pronto do servidor: aqui só se escolhe qual mostrar.

const ABAS = [
  { chave: "vendas", titulo: "Vendas" },
  { chave: "formas", titulo: "Vendas por Formas de Pagamento" },
  { chave: "movimentacoes", titulo: "Movimentações" },
] as const;

export function AbasDoRelatorio({ vendas, formas, movimentacoes }: { vendas: ReactNode; formas: ReactNode; movimentacoes: ReactNode }) {
  const [aba, setAba] = useState<(typeof ABAS)[number]["chave"]>("vendas");
  const conteudo = { vendas, formas, movimentacoes };

  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
      <div className="-mb-px flex gap-1 overflow-x-auto border-b border-line px-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ABAS.map((a) => {
          const aceso = aba === a.chave;
          return (
            <button
              key={a.chave}
              type="button"
              onClick={() => setAba(a.chave)}
              aria-current={aceso ? "true" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-4 pb-2.5 text-sm font-bold whitespace-nowrap transition-colors",
                aceso ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {a.titulo}
            </button>
          );
        })}
      </div>
      {conteudo[aba]}
    </div>
  );
}
