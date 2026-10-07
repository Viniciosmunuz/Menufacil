"use client";

import { ImageOff, Minus, Percent, Printer, Search, Trash2, Wallet } from "lucide-react";
import Image from "next/image";
import { useActionState, useState } from "react";

import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { CategoriaDoCardapio, ComandaAberta, ProdutoDoCardapio } from "@/server/salao/comanda";

import { lancarItens, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";

// A mesa aberta: a conta de um lado, o cardápio do outro.
//
// No computador do balcão as duas coisas ficam lado a lado, porque há tela
// de sobra e quem lança um pedido quer ver a conta crescer enquanto escolhe.
// No celular do garçom não cabem as duas: ali elas viram duas abas, e a
// conta fica a um toque, com o total sempre visível no rodapé.
//
// O cardápio é o mesmo do delivery e do totem -- um produto só, em vários
// canais. Mudou o preço no Cardápio, mudou aqui.

const limpo = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function Linha({ item }: { item: ComandaAberta["itens"][number] }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="grid size-6 shrink-0 place-items-center rounded bg-surface-3 text-xs font-extrabold tabular-nums">{item.quantidade}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{item.nome}</span>
        {item.opcoes && <span className="block truncate text-xs text-muted">{item.opcoes}</span>}
        {item.observacao && <span className="block truncate text-xs text-warning">{item.observacao}</span>}
      </span>
      <span className="shrink-0 text-sm font-bold tabular-nums">{formatCents(item.centavos)}</span>
    </li>
  );
}

function Conta({ comanda }: { comanda: ComandaAberta }) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {comanda.itens.length === 0 ? (
          <p className="px-1 py-8 text-center text-muted">Nada lançado ainda. Escolha no cardápio.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {comanda.itens.map((i) => (
              <Linha key={i.id} item={i} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
        <p className="flex items-baseline justify-between text-sm text-muted">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCents(comanda.subtotalCents)}</span>
        </p>
        {comanda.servicoCents > 0 && (
          <p className="flex items-baseline justify-between text-sm text-muted">
            <span>Serviço</span>
            <span className="tabular-nums">{formatCents(comanda.servicoCents)}</span>
          </p>
        )}
        {comanda.descontoCents > 0 && (
          <p className="flex items-baseline justify-between text-sm text-success">
            <span>Desconto</span>
            <span className="tabular-nums">−{formatCents(comanda.descontoCents)}</span>
          </p>
        )}
        <p className="flex items-baseline justify-between text-lg font-extrabold">
          <span>Total</span>
          <span className="tabular-nums">{formatCents(comanda.totalCents)}</span>
        </p>
      </div>
    </div>
  );
}

function Acoes({ podeFinanceiro }: { podeFinanceiro: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button type="button" aria-label="Imprimir a conta" className="grid h-11 flex-1 place-items-center rounded-control border border-line text-muted hover:text-ink">
          <Printer className="size-4" aria-hidden="true" />
        </button>
        {podeFinanceiro && (
          <>
            <button type="button" aria-label="Aplicar desconto" className="grid h-11 flex-1 place-items-center rounded-control border border-line text-muted hover:text-ink">
              <Percent className="size-4" aria-hidden="true" />
            </button>
            <button type="button" aria-label="Cancelar a mesa" className="grid h-11 flex-1 place-items-center rounded-control border border-line text-muted hover:text-danger">
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        className="flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand font-extrabold text-brand-ink hover:brightness-105"
      >
        <Wallet className="size-5" aria-hidden="true" />
        Adicionar pagamento
      </button>
    </div>
  );
}

function Cardapio({ categorias, onEscolher }: { categorias: CategoriaDoCardapio[]; onEscolher: (p: ProdutoDoCardapio) => void }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);

  const procurando = limpo(busca).length > 0;
  const visiveis = procurando
    ? categorias
        .map((c) => ({ ...c, produtos: c.produtos.filter((p) => limpo(p.nome).includes(limpo(busca))) }))
        .filter((c) => c.produtos.length > 0)
    : categorias.filter((c) => !categoria || c.id === categoria);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar no cardápio"
          aria-label="Buscar no cardápio"
          className="h-11 w-full rounded-control border border-line bg-surface-2 pr-4 pl-10 outline-none placeholder:text-faint focus:border-brand [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      {/* as seções numa fila que rola: num cardápio de dezoito seções, uma
          grade de botões tomaria metade da tela antes do primeiro prato */}
      {!procurando && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setCategoria(null)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors",
              categoria === null ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
            )}
          >
            Tudo
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoria(c.id)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 text-sm font-bold whitespace-nowrap transition-colors",
                categoria === c.id ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
              )}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visiveis.length === 0 ? (
          <p className="py-8 text-center text-muted">Nenhum prato com esse nome.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {visiveis.map((c) => (
              <section key={c.id} className="flex flex-col gap-2">
                <h3 className="text-xs font-bold tracking-wide text-faint uppercase">{c.nome}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {c.produtos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!p.disponivel}
                      onClick={() => onEscolher(p)}
                      className={cn(
                        "flex flex-col overflow-hidden rounded-card border border-line bg-surface text-left transition-colors hover:border-brand disabled:opacity-40",
                      )}
                    >
                      <span className="relative grid aspect-[4/3] w-full place-items-center bg-surface-2 text-faint">
                        {p.imagem ? (
                          <Image src={p.imagem} alt="" fill sizes="160px" className="object-cover" />
                        ) : (
                          <ImageOff className="size-5" aria-hidden="true" />
                        )}
                      </span>
                      <span className="flex flex-1 flex-col gap-0.5 p-2">
                        <span className="line-clamp-2 text-sm font-bold">{p.nome}</span>
                        <span className="text-sm font-extrabold tabular-nums text-brand">{formatCents(p.centavos)}</span>
                        {!p.disponivel && <span className="text-xs font-bold text-danger">Esgotado</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ComandaDaMesa({
  comanda,
  categorias,
  podeFinanceiro = true,
  restaurantId,
  mesaId,
}: {
  comanda: ComandaAberta;
  categorias: CategoriaDoCardapio[];
  /** o garçom sem permissão não vê desconto nem cancelamento */
  podeFinanceiro?: boolean;
  restaurantId: string;
  mesaId: string;
}) {
  const [aba, setAba] = useState<"conta" | "cardapio">("cardapio");
  const [sacola, setSacola] = useState<{ id: string; nome: string; centavos: number; quantidade: number }[]>([]);
  const [estado, salvar, salvando] = useActionState<SalaoFormState, FormData>(lancarItens, {});

  // o que foi salvo sai da sacola: deixá-lo ali faria lançar duas vezes
  const [ultimoSalvo, setUltimoSalvo] = useState<string | undefined>(undefined);
  if (estado.ok && estado.message !== ultimoSalvo) {
    setUltimoSalvo(estado.message);
    setSacola([]);
  }

  const juntar = (p: ProdutoDoCardapio) =>
    setSacola((atual) => {
      const tem = atual.find((i) => i.id === p.id);
      return tem
        ? atual.map((i) => (i.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i))
        : [...atual, { id: p.id, nome: p.nome, centavos: p.centavos, quantidade: 1 }];
    });

  const tirar = (id: string) =>
    setSacola((atual) => atual.flatMap((i) => (i.id === id ? (i.quantidade > 1 ? [{ ...i, quantidade: i.quantidade - 1 }] : []) : [i])));

  const novoItens = sacola.reduce((s, i) => s + i.quantidade, 0);
  const novoCents = sacola.reduce((s, i) => s + i.centavos * i.quantidade, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[22rem_1fr] lg:items-stretch">
      {/* no celular, duas abas; no computador, as duas colunas ao mesmo tempo */}
      <div className="flex gap-1 border-b border-line lg:hidden">
        {(["conta", "cardapio"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setAba(k)}
            aria-current={aba === k ? "page" : undefined}
            className={cn(
              "-mb-px flex-1 border-b-2 py-3 text-sm font-extrabold transition-colors",
              aba === k ? "border-brand text-ink" : "border-transparent text-muted",
            )}
          >
            {k === "conta" ? `Comanda (${comanda.itens.length})` : "Cardápio"}
          </button>
        ))}
      </div>

      <section
        className={cn(
          "flex min-h-0 min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-4",
          aba === "conta" ? "flex" : "hidden lg:flex",
        )}
      >
        <Conta comanda={comanda} />

        {/* o que ainda não foi enviado fica separado do que já está na
            cozinha: são duas coisas diferentes para quem olha a conta */}
        {sacola.length > 0 && (
          <div className="flex flex-col gap-2 rounded-control border border-brand/50 bg-brand-soft p-3">
            <p className="text-xs font-bold tracking-wide text-brand uppercase">Novos</p>
            <ul className="flex flex-col gap-1">
              {sacola.map((i) => (
                <li key={i.id} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {i.quantidade}x {i.nome}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatCents(i.centavos * i.quantidade)}</span>
                  <button
                    type="button"
                    onClick={() => tirar(i.id)}
                    aria-label={"Tirar um " + i.nome}
                    className="grid size-7 shrink-0 place-items-center rounded-control text-muted hover:text-danger"
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form action={salvar}>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="mesaId" value={mesaId} />
          <input type="hidden" name="itens" value={JSON.stringify(sacola.map((i) => ({ produtoId: i.id, quantidade: i.quantidade })))} />
          <button
            type="submit"
            disabled={novoItens === 0 || salvando}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand font-extrabold text-brand-ink disabled:opacity-40"
          >
            {salvando ? "Enviando..." : novoItens === 0 ? "Salvar" : "Salvar · " + novoItens + " · " + formatCents(novoCents)}
          </button>
        </form>

        {(estado.error || estado.message) && (
          <p className={cn("rounded-control px-3 py-2 text-sm font-bold", estado.error ? "bg-danger/15 text-danger" : "bg-success/15 text-success")} role="status">
            {estado.error ?? estado.message}
          </p>
        )}

        <Acoes podeFinanceiro={podeFinanceiro} />
      </section>

      <section className={cn("flex min-h-0 min-w-0 flex-col", aba === "cardapio" ? "flex" : "hidden lg:flex")}>
        <Cardapio categorias={categorias} onEscolher={juntar} />
      </section>
    </div>
  );
}
