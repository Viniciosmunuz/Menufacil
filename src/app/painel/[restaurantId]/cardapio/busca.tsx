"use client";

import { Pencil, Search, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { buttonClasses } from "@/components/ui/button";
import { SwitchButton } from "@/components/ui/switch-button";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";

import { PilulaDaOpcao } from "./pilula-da-opcao";

// Achar um prato entre cento e trinta, no meio do movimento.
//
// A tela do cardápio sempre listou tudo, categoria por categoria. Num
// cardápio de cinco pratos isso basta; no Papaléguas são cento e trinta e
// oito, e a hora em que alguém precisa achar um é justamente a pior: acabou
// a lasanha às oito da noite e a cozinha está gritando. Rolar a lista
// inteira procurando com o olho custa mais tempo do que o balcão tem.
//
// A busca filtra aqui no aparelho, sem ida ao servidor: com esse tamanho de
// cardápio a lista inteira cabe na memória, e esperar a rede a cada letra
// digitada seria devolver o mesmo problema com outra roupa.
//
// Enquanto há texto, as categorias somem e ficam só os resultados, numa
// lista reta. Quem está procurando um prato não quer saber de seções.

export type OpcaoDaBusca = { id: string; nome: string; available: boolean };
export type GrupoDaBusca = { nome: string; opcoes: OpcaoDaBusca[] };

export type ProdutoDaBusca = {
  id: string;
  name: string;
  categoria: string;
  priceCents: number;
  promoPriceCents: number | null;
  available: boolean;
  /** sabores, tamanhos: o que acaba sem o prato inteiro acabar */
  grupos: GrupoDaBusca[];
};

/** sem acento e sem caixa: ninguém digita "lasanha à bolonhesa" com crase */
const limpo = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function BuscaDeProdutos({
  produtos,
  restaurantId,
  toggleAction,
  toggleOptionAction,
  children,
}: {
  produtos: ProdutoDaBusca[];
  restaurantId: string;
  toggleAction: (formData: FormData) => Promise<void>;
  /** liga e desliga um sabor sem abrir a edição do produto */
  toggleOptionAction: (formData: FormData) => Promise<void>;
  children: ReactNode;
}) {
  const [texto, setTexto] = useState("");
  const procurando = limpo(texto).length > 0;

  // todas as palavras digitadas, em qualquer ordem: "frango lasanha" acha
  // "Lasanha de frango", que é como a pessoa lembra do prato
  const palavras = limpo(texto).split(/\s+/).filter(Boolean);

  // A seção entra na busca, mas o nome vem primeiro.
  //
  // Procurar "isca" num cardápio com a seção "Iscas e petiscos" trazia
  // dezesseis pratos, com a batata frita antes da isca de frango -- certo
  // pela regra e inútil para quem procurava. Casar pelo nome sobe; casar só
  // pela seção fica embaixo, que é o que serve para ver uma seção inteira.
  const achados = procurando
    ? produtos
        .map((p) => ({ p, noNome: palavras.every((w) => limpo(p.name).includes(w)) }))
        .filter((x) => x.noNome || palavras.every((w) => limpo(x.p.name + " " + x.p.categoria).includes(w)))
        .sort((a, b) => Number(b.noNome) - Number(a.noNome))
        .map((x) => x.p)
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-faint" aria-hidden="true" />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Procurar um prato pelo nome"
          aria-label="Procurar um prato pelo nome"
          className="h-12 w-full rounded-control border border-line bg-surface pr-12 pl-12 font-bold outline-none placeholder:font-normal placeholder:text-faint focus:border-brand [&::-webkit-search-cancel-button]:hidden"
        />
        {procurando && (
          <button
            type="button"
            onClick={() => setTexto("")}
            aria-label="Limpar a busca"
            className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-control text-faint hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {!procurando ? (
        children
      ) : achados.length === 0 ? (
        <p className="rounded-card border border-line bg-surface px-5 py-8 text-center text-muted">
          Nenhum prato com <span className="font-bold text-ink">{texto}</span> no nome.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <p className="border-b border-line px-5 py-3 text-sm text-muted">
            {achados.length} {achados.length === 1 ? "prato encontrado" : "pratos encontrados"}
          </p>
          <ul className="divide-y divide-line">
            {achados.map((p) => (
              <li key={p.id} className={cn("flex flex-col gap-3 px-4 py-3 sm:px-5", !p.available && "bg-bg/40")}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate font-bold", !p.available && "text-muted")}>{p.name}</span>
                    {/* a seção vem junto porque nome de prato se repete entre
                        elas: "Carne de sol" existe em Grelhados e em Iscas */}
                    <span className="block truncate text-sm text-muted">
                      {p.categoria} · {formatCents(p.promoPriceCents ?? p.priceCents)}
                    </span>
                  </span>

                  <div className="flex items-center justify-between gap-2 sm:shrink-0">
                    <form action={toggleAction} className="shrink-0">
                      <input type="hidden" name="restaurantId" value={restaurantId} />
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="field" value="available" />
                      <SwitchButton checked={p.available} label={p.available ? "Disponível" : "Esgotado"} className="w-36" />
                    </form>

                    <Link
                      href={`/painel/${restaurantId}/cardapio/produto/${p.id}`}
                      className={buttonClasses("secondary", "sm", "shrink-0")}
                      aria-label={`Editar ${p.name}`}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      <span className="hidden md:inline">Editar</span>
                    </Link>
                  </div>
                </div>

                {/* Os sabores aqui mesmo, sem entrar na edição.

                    Acabar um sabor de suco é mais comum do que acabar o
                    suco: o cliente pede cupuaçu, não "suco". Marcar isso
                    custava seis passos e um "Salvar" dentro da edição do
                    produto, e no meio do movimento ninguém faz seis passos
                    -- então o sabor continuava à venda a noite inteira.
                    Aqui cada toque salva na hora, como o interruptor do
                    prato logo acima.

                    Com o prato esgotado as opções somem: discutir qual
                    sabor tem, num suco que não está à venda, é conversa
                    para depois. */}
                {p.available &&
                  p.grupos.map((g) => (
                    <div key={g.nome} className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-xs font-bold tracking-wide text-faint uppercase">{g.nome}</span>
                      {g.opcoes.map((o) => (
                        <form key={o.id} action={toggleOptionAction}>
                          <input type="hidden" name="restaurantId" value={restaurantId} />
                          <input type="hidden" name="id" value={o.id} />
                          <PilulaDaOpcao nome={o.nome} tem={o.available} />
                        </form>
                      ))}
                    </div>
                  ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
