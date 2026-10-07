"use client";

import { ArrowLeft, Check, ImageOff, Info, Percent, Printer, Search, Trash2, Wallet, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";

import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { CategoriaDoCardapio, ComandaAberta, ProdutoDoCardapio } from "@/server/salao/comanda";

import { FolhaDoDesconto } from "./folha-do-desconto";
import { FolhaDoItem, type ItemEscolhido } from "./folha-do-item";
import { FolhaDoPagamento } from "./folha-do-pagamento";

import { apagarItem, finalizarMesa, lancarItens, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";

// A mesa na mão do garçom.
//
// Abre no cardápio, porque é isso que ele veio fazer: o cliente está
// falando e ele precisa tocar nos pratos. A conta fica atrás do botão de
// informação, a um toque, e não ocupa a tela enquanto ninguém perguntou
// por ela.
//
// O que ele escolhe entra numa sacola que só vira pedido ao tocar em
// Salvar. É de propósito: numa mesa de seis pessoas o garçom ouve tudo e
// lança de uma vez, e cada toque indo direto para a cozinha imprimiria
// seis comandas picadas para o mesmo pedido.

const limpo = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

type Escolhido = { chave: string; produtoId: string; nome: string; centavos: number; quantidade: number; observacao: string | null; opcoes: string[]; rotulo: string | null };

export function MesaDoGarcom({
  comanda,
  categorias,
  mesaRotulo,
  voltarHref,
  restaurantId,
  mesaId,
  podeFinanceiro = false,
  podeApagarItem = false,
}: {
  comanda: ComandaAberta;
  categorias: CategoriaDoCardapio[];
  mesaRotulo: string;
  voltarHref: string;
  restaurantId: string;
  mesaId: string;
  /** liberar a mesa, dar desconto, desfazer recebimento: o dono liga por garçom */
  podeFinanceiro?: boolean;
  /** tirar da conta o que já foi para a cozinha */
  podeApagarItem?: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(categorias[0]?.id ?? null);
  const [sacola, setSacola] = useState<Escolhido[]>([]);
  const [vendoConta, setVendoConta] = useState(false);
  const [aberto, setAberto] = useState<ProdutoDoCardapio | null>(null);
  const [folha, setFolha] = useState<"pagamento" | "desconto" | null>(null);
  const [estado, salvar, salvando] = useActionState<SalaoFormState, FormData>(lancarItens, {});
  const [liberado, liberar, liberando] = useActionState<SalaoFormState, FormData>(finalizarMesa, {});
  const [apagado, apagar] = useActionState<SalaoFormState, FormData>(apagarItem, {});

  const temConta = comanda.id !== "" && comanda.totalCents > 0;
  const quitada = temConta && comanda.faltaCents === 0;

  // Salvou: a sacola esvazia, porque o que estava nela agora está na
  // comanda -- deixá-la cheia faria o garçom lançar o mesmo pedido duas
  // vezes. O ajuste acontece durante o render, e não num efeito: é uma
  // reação a um dado novo que chegou, não um efeito colateral, e assim a
  // tela nunca chega a pintar a sacola já salva.
  const [ultimoSalvo, setUltimoSalvo] = useState<string | undefined>(undefined);
  if (estado.ok && estado.message !== ultimoSalvo) {
    setUltimoSalvo(estado.message);
    setSacola([]);
  }

  const procurando = limpo(busca).length > 0;
  const produtos = procurando
    ? categorias.flatMap((c) => c.produtos).filter((p) => limpo(p.nome).includes(limpo(busca)))
    : (categorias.find((c) => c.id === categoria)?.produtos ?? []);

  const novoCents = sacola.reduce((s, i) => s + i.centavos * i.quantidade, 0);
  const novoItens = sacola.reduce((s, i) => s + i.quantidade, 0);

  // duas unidades do mesmo prato com observações diferentes são duas
  // linhas: "sem cebola" vale para uma e não para a outra
  const juntar = (item: ItemEscolhido) =>
    setSacola((atual) => {
      const chave = item.produtoId + "|" + item.opcoes.join(",") + "|" + (item.observacao ?? "");
      const tem = atual.find((i) => i.chave === chave);
      if (tem) return atual.map((i) => (i.chave === chave ? { ...i, quantidade: i.quantidade + item.quantidade } : i));
      return [
        ...atual,
        {
          chave,
          produtoId: item.produtoId,
          nome: item.nome,
          centavos: item.centavos,
          quantidade: item.quantidade,
          observacao: item.observacao,
          opcoes: item.opcoes.map((o) => o.id),
          rotulo: item.opcoes.length ? item.opcoes.map((o) => o.nome).join(" · ") : null,
        },
      ];
    });


  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/95 px-3 py-2.5 backdrop-blur">
        <Link href={voltarHref} className="shrink-0 px-1 text-sm font-extrabold text-muted hover:text-ink" aria-label="Voltar às mesas">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar"
            aria-label="Buscar no cardápio"
            className="h-10 w-full rounded-full border border-line bg-surface-2 pr-3 pl-9 text-sm outline-none placeholder:text-faint focus:border-brand [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
      </header>

      <p className="bg-brand py-2 text-center font-extrabold text-brand-ink">{mesaRotulo}</p>

      {/* as seções em círculo, rolando de lado: a foto identifica mais
          rápido que o nome quando se procura "aquele prato ali" */}
      {!procurando && categorias.length > 0 && (
        <div className="flex gap-4 overflow-x-auto border-b border-line px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categorias.map((c) => {
            const capa = c.produtos.find((p) => p.imagem)?.imagem ?? null;
            const aceso = c.id === categoria;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoria(c.id)}
                className="flex w-16 shrink-0 flex-col items-center gap-1"
                aria-current={aceso ? "true" : undefined}
              >
                <span
                  className={cn(
                    "relative grid size-16 place-items-center overflow-hidden rounded-full border-2 bg-surface-2 text-faint transition-colors",
                    aceso ? "border-brand" : "border-line",
                  )}
                >
                  {capa ? <Image src={capa} alt="" fill sizes="64px" className="object-cover" /> : <ImageOff className="size-5" aria-hidden="true" />}
                </span>
                <span className={cn("line-clamp-2 text-center text-xs leading-tight", aceso ? "font-extrabold text-ink" : "text-muted")}>
                  {c.nome}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-28">
        {produtos.length === 0 ? (
          <p className="py-10 text-center text-muted">Nenhum prato aqui.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {produtos.map((p) => {
              const naSacola = sacola.filter((i) => i.produtoId === p.id).reduce((s, i) => s + i.quantidade, 0);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!p.disponivel}
                  onClick={() => setAberto(p)}
                  className={cn(
                    "relative flex flex-col overflow-hidden rounded-card border bg-surface text-left transition-colors active:brightness-95 disabled:opacity-40",
                    naSacola > 0 ? "border-brand" : "border-line",
                  )}
                >
                  <span className="relative grid aspect-square w-full place-items-center bg-surface-2 text-faint">
                    {p.imagem ? <Image src={p.imagem} alt="" fill sizes="120px" className="object-cover" /> : <ImageOff className="size-5" aria-hidden="true" />}
                    {naSacola > 0 && (
                      <span className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-ink">
                        {naSacola}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5 p-2">
                    <span className="line-clamp-2 text-xs leading-tight font-bold">{p.nome}</span>
                    <span className="text-sm font-extrabold tabular-nums text-brand">{formatCents(p.centavos)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* o rodapé: a conta à esquerda, salvar à direita */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-line bg-bg/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button
          type="button"
          onClick={() => setVendoConta(true)}
          aria-label="Ver a comanda da mesa"
          className="relative grid size-14 shrink-0 place-items-center rounded-control bg-surface-3 text-ink"
        >
          <Info className="size-6" aria-hidden="true" />
          {comanda.itens.length > 0 && (
            <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-brand text-[11px] font-extrabold text-brand-ink">
              {comanda.itens.length}
            </span>
          )}
        </button>

        <form action={salvar} className="flex-1">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="mesaId" value={mesaId} />
          {/* a lista inteira num campo só: são itens de tamanho variável, e
              o preço de cada um o servidor lê do banco */}
          <input
            type="hidden"
            name="itens"
            value={JSON.stringify(sacola.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, observacao: i.observacao, opcoes: i.opcoes })))}
          />
          <button
            type="submit"
            disabled={novoItens === 0 || salvando}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-brand text-base font-extrabold text-brand-ink disabled:opacity-40"
          >
            {salvando
              ? "Enviando..."
              : novoItens === 0
                ? "Salvar"
                : `Salvar · ${novoItens} ${novoItens === 1 ? "item" : "itens"} · ${formatCents(novoCents)}`}
          </button>
        </form>
      </div>

      {/* o retorno do envio, fora do rodapé para não empurrar os botões */}
      {(estado.error || estado.message) && (
        <p
          className={cn(
            "fixed inset-x-3 bottom-24 z-30 rounded-control px-4 py-3 text-center text-sm font-bold shadow-xl",
            estado.error ? "bg-danger text-white" : "bg-success text-white",
          )}
          role="status"
        >
          {estado.error ?? estado.message}
        </p>
      )}

      {/* a comanda inteira, atrás do botão de informação */}
      {vendoConta && (
        <div className="fixed inset-0 z-30 flex flex-col bg-bg">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-xl font-extrabold">{mesaRotulo}</h2>
            <button type="button" onClick={() => setVendoConta(false)} aria-label="Fechar a comanda" className="grid size-10 place-items-center rounded-control text-muted">
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            {apagado.error && (
              <p className="mt-3 rounded-control bg-danger/15 px-3 py-2 text-sm font-bold text-danger" role="status">
                {apagado.error}
              </p>
            )}
            {comanda.itens.length === 0 ? (
              <p className="py-12 text-center text-muted">Nada lançado ainda.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {comanda.itens.map((i) => (
                  <li key={i.id} className="flex items-start gap-3 py-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded bg-surface-3 text-xs font-extrabold tabular-nums">{i.quantidade}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{i.nome}</span>
                      {i.opcoes && <span className="block truncate text-xs text-muted">{i.opcoes}</span>}
                      {i.observacao && <span className="block truncate text-xs text-warning">{i.observacao}</span>}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums">{formatCents(i.centavos)}</span>
                    {podeApagarItem && (
                      <form action={apagar} className="shrink-0">
                        <input type="hidden" name="restaurantId" value={restaurantId} />
                        <input type="hidden" name="itemId" value={i.id} />
                        <button
                          type="submit"
                          aria-label={"Apagar " + i.nome + " da conta"}
                          className="grid size-8 place-items-center rounded-control text-faint active:text-danger"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-line px-4 py-3">
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
            <p className="flex items-baseline justify-between text-xl font-extrabold">
              <span>Total</span>
              <span className="tabular-nums">{formatCents(comanda.totalCents)}</span>
            </p>
            {/* o que falta só aparece depois do primeiro recebimento: numa
                mesa que ninguém pagou, "restante" é o total repetido */}
            {comanda.pagoCents > 0 && (
              <>
                <p className="flex items-baseline justify-between text-sm text-success">
                  <span>Recebido</span>
                  <span className="tabular-nums">{formatCents(comanda.pagoCents)}</span>
                </p>
                <p className={cn("flex items-baseline justify-between font-extrabold", comanda.faltaCents === 0 ? "text-success" : "text-warning")}>
                  <span>{comanda.faltaCents === 0 ? "Conta paga" : "Falta"}</span>
                  {comanda.faltaCents > 0 && <span className="tabular-nums">{formatCents(comanda.faltaCents)}</span>}
                </p>
              </>
            )}
          </div>

          <div className="flex gap-2 border-t border-line px-4 py-3">
            <a
              href={temConta ? "/painel/" + restaurantId + "/salao/conta/" + comanda.id : undefined}
              target="_blank"
              rel="noopener"
              aria-label="Imprimir a conta"
              className={cn(
                "grid h-12 flex-1 place-items-center rounded-control bg-surface-3 text-muted",
                temConta ? "" : "pointer-events-none opacity-40",
              )}
            >
              <Printer className="size-5" aria-hidden="true" />
            </a>
            {podeFinanceiro && (
              <button
                type="button"
                onClick={() => setFolha("desconto")}
                disabled={!temConta}
                aria-label="Desconto e acréscimo"
                className="grid h-12 flex-1 place-items-center rounded-control bg-surface-3 text-muted disabled:opacity-40"
              >
                <Percent className="size-5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {quitada && podeFinanceiro ? (
              <form action={liberar}>
                <input type="hidden" name="restaurantId" value={restaurantId} />
                <input type="hidden" name="comandaId" value={comanda.id} />
                <button
                  type="submit"
                  disabled={liberando}
                  className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-success font-extrabold text-white disabled:opacity-40"
                >
                  <Check className="size-5" aria-hidden="true" />
                  {liberando ? "Liberando..." : "Liberar a mesa"}
                </button>
              </form>
            ) : quitada ? (
              /* conta paga e sem permissão de finalizar: o botão de receber
                 dizia "Receber o resto · R$ 0,00", que não é coisa que se
                 peça a ninguém. Quem libera é o balcão. */
              <p className="flex min-h-14 items-center justify-center gap-2 rounded-control bg-success/15 px-4 text-center font-bold text-success">
                <Check className="size-5 shrink-0" aria-hidden="true" />
                Conta paga. O balcão libera a mesa.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setFolha("pagamento")}
                disabled={!temConta}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-brand font-extrabold text-brand-ink disabled:opacity-40"
              >
                <Wallet className="size-5" aria-hidden="true" />
                {comanda.pagoCents > 0 ? "Receber o resto · " + formatCents(comanda.faltaCents) : "Adicionar pagamento"}
              </button>
            )}
            {liberado.error && (
              <p className="mt-2 rounded-control bg-danger/15 px-3 py-2 text-center text-sm font-bold text-danger" role="status">
                {liberado.error}
              </p>
            )}
          </div>
        </div>
      )}

      {folha === "pagamento" && (
        <FolhaDoPagamento comanda={comanda} restaurantId={restaurantId} podeDesfazer={podeFinanceiro} onFechar={() => setFolha(null)} />
      )}

      {folha === "desconto" && <FolhaDoDesconto comanda={comanda} restaurantId={restaurantId} onFechar={() => setFolha(null)} />}

      {aberto && (
        <FolhaDoItem
          produto={aberto}
          onFechar={() => setAberto(null)}
          onAdicionar={(item) => {
            juntar(item);
            setAberto(null);
          }}
        />
      )}
    </div>
  );
}
