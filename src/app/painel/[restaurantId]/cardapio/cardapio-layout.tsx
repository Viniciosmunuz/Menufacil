"use client";

import { CircleOff, ImageOff, LayoutList } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

// A casca do cardápio: o filtro em cima e, no computador, as categorias
// numa coluna à esquerda.
//
// O problema é de tamanho: 140 produtos em 18 categorias. Buscar pelo nome
// só serve para quem já sabe o que procura, e a pergunta de quem abre esta
// tela no meio do movimento costuma ser outra -- "o que está faltando?".
// Daí o filtro de esgotados, que é a razão de a tela existir.
//
// No computador a lista virava uma coluna estreita no meio de uma tela
// larga, com as laterais vazias: o mesmo custo de rolagem do celular, sem
// a desculpa do celular. Com as categorias fixas à esquerda, trocar de
// seção deixa de ser rolagem e vira um clique.

export type Filtro = "todos" | "esgotados" | "sem-foto";

export type CategoriaResumo = {
  id: string;
  nome: string;
  produtos: number;
  esgotados: number;
  semFoto: number;
  escondida: boolean;
};

type Estado = {
  filtro: Filtro;
  /** no computador, a categoria que ocupa a coluna da direita */
  selecionada: string | null;
  escolher: (id: string) => void;
  /** a categoria some quando o filtro em vigor não acha nada nela */
  vazia: (id: string) => boolean;
};

const Contexto = createContext<Estado | null>(null);

/** o que cada cartão de categoria precisa saber da casca */
export function useCardapio(): Estado {
  return (
    useContext(Contexto) ?? {
      filtro: "todos",
      selecionada: null,
      escolher: () => {},
      vazia: () => false,
    }
  );
}

const CHIP = "flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition-colors";

export function CardapioLayout({ categorias, children }: { categorias: CategoriaResumo[]; children: ReactNode }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  // no computador abre na primeira categoria: tela com a direita vazia
  // parece quebrada
  const [escolhida, setSelecionada] = useState<string | null>(categorias[0]?.id ?? null);

  const total = categorias.reduce((s, c) => s + c.produtos, 0);
  const esgotados = categorias.reduce((s, c) => s + c.esgotados, 0);
  const semFoto = categorias.reduce((s, c) => s + c.semFoto, 0);

  const quantos = (c: CategoriaResumo) => (filtro === "esgotados" ? c.esgotados : filtro === "sem-foto" ? c.semFoto : c.produtos);
  const vazia = (id: string) => {
    if (filtro === "todos") return false;
    const c = categorias.find((x) => x.id === id);
    return !c || quantos(c) === 0;
  };

  // ligar o filtro pode esvaziar justo a categoria que estava à mostra no
  // computador: aí quem aparece é a primeira que o filtro ainda acha
  const selecionada =
    escolhida && !vazia(escolhida) ? escolhida : (categorias.find((c) => !vazia(c.id))?.id ?? escolhida);

  const chips: { valor: Filtro; rotulo: string; conta: number; icone: ReactNode; tom: string }[] = [
    { valor: "todos", rotulo: "Todos", conta: total, icone: <LayoutList className="size-4" aria-hidden="true" />, tom: "text-brand" },
    { valor: "esgotados", rotulo: "Esgotados", conta: esgotados, icone: <CircleOff className="size-4" aria-hidden="true" />, tom: "text-warning" },
    { valor: "sem-foto", rotulo: "Sem foto", conta: semFoto, icone: <ImageOff className="size-4" aria-hidden="true" />, tom: "text-muted" },
  ];

  return (
    <Contexto.Provider value={{ filtro, selecionada, escolher: setSelecionada, vazia }}>
      <div data-cardapio-filtro={filtro} className="flex flex-col gap-4">
        {/* os filtros rolam de lado no celular, e nunca empurram a lista */}
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Filtrar o cardápio"
        >
          {chips.map(({ valor, rotulo, conta, icone, tom }) => {
            const ligado = filtro === valor;
            // o filtro que não acharia nada não vira botão morto: ele some
            if (valor !== "todos" && conta === 0) return null;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                aria-pressed={ligado}
                className={cn(CHIP, ligado ? "border-brand bg-brand-soft text-brand" : cn("border-line bg-surface", tom))}
              >
                {icone}
                {rotulo}
                <span className="tabular-nums opacity-70">{conta}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* a coluna das categorias: só no computador, onde há largura
              sobrando. No celular a gaveta continua sendo o caminho. */}
          {categorias.length > 1 && (
            <nav aria-label="Categorias" className="hidden w-64 shrink-0 flex-col gap-0.5 rounded-card border border-line bg-surface p-2 lg:flex">
              <p className="px-2.5 pt-1 pb-2 text-xs font-extrabold tracking-wide text-faint uppercase">
                {categorias.length} categorias
              </p>
              {categorias.map((c) => {
                const conta = quantos(c);
                const apagada = filtro !== "todos" && conta === 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelecionada(c.id)}
                    aria-current={selecionada === c.id ? "true" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-2 rounded-control px-2.5 text-left transition-colors",
                      selecionada === c.id ? "bg-brand-soft" : "hover:bg-surface-2",
                      apagada && "opacity-45",
                    )}
                  >
                    <span className={cn("min-w-0 flex-1 truncate text-sm", selecionada === c.id ? "font-extrabold text-brand" : "font-semibold")}>
                      {c.nome}
                    </span>
                    {c.escondida && <span className="shrink-0 text-[0.65rem] font-bold text-faint">oculta</span>}
                    {c.esgotados > 0 && filtro === "todos" && (
                      <span className="shrink-0 rounded-full bg-warning/15 px-1.5 text-[0.65rem] font-extrabold text-warning tabular-nums">
                        {c.esgotados}
                      </span>
                    )}
                    <span className={cn("shrink-0 text-xs tabular-nums", selecionada === c.id ? "text-brand" : "text-faint")}>{conta}</span>
                  </button>
                );
              })}
            </nav>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-3">{children}</div>
        </div>
      </div>
    </Contexto.Provider>
  );
}
