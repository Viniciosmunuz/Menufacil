"use client";

import { ArrowLeft, Check, HandCoins, History, ImageOff, Info, Minus, Percent, Plus, ReceiptText, Search, Trash2, UtensilsCrossed, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { CategoriaDoCardapio, ComandaAberta, ProdutoDoCardapio } from "@/server/salao/comanda";

import { ContaNoPapel } from "./conta-no-papel";
import { FolhaDoDesconto } from "./folha-do-desconto";
import { ApagarAMesa } from "./mexer-na-mesa";
import { FolhaDoItem, type ItemEscolhido } from "./folha-do-item";
import { FolhaDoPagamento } from "./folha-do-pagamento";

type Escolhido = {
  chave: string;
  produtoId: string;
  nome: string;
  centavos: number;
  quantidade: number;
  observacao: string | null;
  opcoes: string[];
  rotulo: string | null;
};

import { apagarItem, finalizarMesa, lancarItens, type SalaoFormState } from "@/app/painel/[restaurantId]/salao/actions";

// A mesa aberta no caixa, no jeito do Yooga -- que é o que o Papaléguas já
// usa no balcão, então quem está no caixa reconhece tudo sem aprender nada:
//
//   à esquerda   a comanda: "Mesa 4 ✎ ⇅", os itens, Subtotal, Total e
//                Restante, a fila de cinco botões quadrados e o
//                "+ Adicionar Pagamento"
//   à direita    o cardápio: busca e VOLTAR em cima, as categorias em
//                bolinhas com foto, os pratos em cartões e o "Salvar"
//
// No celular não cabem as duas colunas: ali elas viram duas abas, com a
// troca e o Salvar no rodapé, no alcance do polegar.
//
// O cardápio é o mesmo do delivery e do totem -- um produto só, em vários
// canais. Mudou o preço no Cardápio, mudou aqui.

const limpo = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function Linha({
  item,
  restaurantId,
  podeApagar,
}: {
  item: ComandaAberta["itens"][number];
  restaurantId: string;
  /** apagar item da conta mexe no que entra no caixa: permissão por garçom */
  podeApagar: boolean;
}) {
  const [apagado, apagar, apagando] = useActionState<SalaoFormState, FormData>(apagarItem, {});

  return (
    <li className="group flex items-start gap-3 py-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-3 text-sm font-bold tabular-nums">{item.quantidade}</span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="block truncate">{item.nome}</span>
        {item.opcoes && <span className="block text-sm text-muted">{item.opcoes}</span>}
        {item.observacao && <span className="block truncate text-sm text-warning">{item.observacao}</span>}
        {apagado.error && <span className="block text-xs font-bold text-danger">{apagado.error}</span>}
      </span>
      <span className="shrink-0 pt-0.5 tabular-nums">{formatCents(item.centavos)}</span>
      {podeApagar && (
        <form action={apagar} className="shrink-0">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="itemId" value={item.id} />
          <button
            type="submit"
            disabled={apagando}
            aria-label={"Apagar " + item.nome + " da conta"}
            title="Apagar da conta"
            className="grid size-7 place-items-center rounded-control text-faint hover:text-danger disabled:opacity-40 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </form>
      )}
    </li>
  );
}

function Totais({ comanda, novoCents }: { comanda: ComandaAberta; novoCents: number }) {
  const linha = "flex items-baseline justify-between";
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-3">
      <p className={cn(linha, "text-muted")}>
        <span>Subtotal</span>
        <span className="tabular-nums">{formatCents(comanda.subtotalCents)}</span>
      </p>
      {comanda.servicoCents > 0 && (
        <p className={cn(linha, "text-muted")}>
          <span>Taxa de serviço</span>
          <span className="tabular-nums">{formatCents(comanda.servicoCents)}</span>
        </p>
      )}
      {comanda.descontoCents > 0 && (
        <p className={cn(linha, "text-success")}>
          <span>Desconto</span>
          <span className="tabular-nums">−{formatCents(comanda.descontoCents)}</span>
        </p>
      )}
      {comanda.pagoCents > 0 && (
        <p className={cn(linha, "text-success")}>
          <span>
            Pago
            <span className="pl-1.5 text-xs font-semibold text-faint">{comanda.pagamentos.map((p) => p.nomeDaForma).join(", ")}</span>
          </span>
          <span className="tabular-nums">{formatCents(comanda.pagoCents)}</span>
        </p>
      )}
      <p className={cn(linha, "text-lg font-bold")}>
        <span>Total</span>
        <span className="tabular-nums">{formatCents(comanda.totalCents)}</span>
      </p>
      <p className={cn(linha, "text-lg font-bold", comanda.totalCents > 0 && comanda.faltaCents === 0 ? "text-success" : "text-brand")}>
        <span>{comanda.totalCents > 0 && comanda.faltaCents === 0 ? "Conta paga" : "Restante"}</span>
        <span className="tabular-nums">{formatCents(comanda.faltaCents)}</span>
      </p>
      {/* o que está na sacola ainda não entrou na conta: ver o total que
          vai ficar evita o "salvei e o valor mudou?" */}
      {novoCents > 0 && (
        <p className={cn(linha, "text-sm font-semibold text-muted")}>
          <span>Com os novos</span>
          <span className="tabular-nums">{formatCents(comanda.totalCents + novoCents)}</span>
        </p>
      )}
    </div>
  );
}

/**
 * A fila de botões quadrados embaixo da conta, no jeito do Yooga: cada um
 * de uma cor, só com o ícone.
 *
 * A cor é o que o caixa lê de longe, e no meio do movimento ele acerta o
 * botão pela cor antes de ler o ícone -- cinco quadrados cinzentos iguais
 * viravam cinco chances de errar. São as mesmas cores do mapa de mesas,
 * para o salão inteiro falar a mesma língua.
 */
const QUADRADO =
  "grid aspect-square w-full place-items-center rounded-control text-white shadow-[0_1px_0_rgb(0_0_0/0.08)] transition-[filter,opacity] hover:brightness-105 disabled:pointer-events-none disabled:opacity-30";

const COR = {
  imprimir: "bg-[#2f7de1]",
  apagar: "bg-[#e2483d]",
  servico: "bg-[#f0b429]",
  desconto: "bg-[#1fc46e]",
  dividir: "bg-[#6f4fd8]",
} as const;

const quadrado = (cor: keyof typeof COR) => `${QUADRADO} ${COR[cor]}`;

/**
 * Dividir a conta: quanto dá para cada um.
 *
 * Não muda nada na mesa -- é a conta que o caixa faria de cabeça. O botão
 * de baixo abre o recebimento já com a parte de uma pessoa, e a folha do
 * pagamento continua mostrando o que sobra até a conta fechar.
 */
function FolhaDaDivisao({
  comanda,
  onReceber,
  onFechar,
}: {
  comanda: ComandaAberta;
  onReceber: (centavos: number) => void;
  onFechar: () => void;
}) {
  const [pessoas, setPessoas] = useState(Math.max(2, comanda.pessoas));
  const parte = Math.ceil(comanda.faltaCents / pessoas);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/60" />
      <div className="relative flex w-full flex-col rounded-t-card border border-line bg-surface sm:max-w-md sm:rounded-card">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold">Dividir a conta</h2>
            <p className="text-sm tabular-nums text-muted">Restante: {formatCents(comanda.faltaCents)}</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="grid size-9 shrink-0 place-items-center rounded-control text-muted hover:text-ink">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-col gap-5 px-4 py-5">
          <div className="flex items-center justify-between gap-4">
            <span className="font-bold">Pessoas</span>
            <span className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPessoas((n) => Math.max(2, n - 1))}
                disabled={pessoas <= 2}
                aria-label="Menos uma pessoa"
                className="grid size-11 place-items-center rounded-control border border-line disabled:opacity-35"
              >
                <Minus className="size-5" aria-hidden="true" />
              </button>
              <span className="w-8 text-center text-2xl font-extrabold tabular-nums">{pessoas}</span>
              <button
                type="button"
                onClick={() => setPessoas((n) => Math.min(50, n + 1))}
                aria-label="Mais uma pessoa"
                className="grid size-11 place-items-center rounded-control border border-line"
              >
                <Plus className="size-5" aria-hidden="true" />
              </button>
            </span>
          </div>

          <p className="rounded-control bg-surface-2 px-4 py-4 text-center">
            <span className="block text-sm text-muted">Cada um paga</span>
            <span className="block text-3xl font-extrabold tabular-nums">{formatCents(parte)}</span>
          </p>

          <button
            type="button"
            onClick={() => onReceber(parte)}
            disabled={comanda.faltaCents === 0}
            className="flex min-h-12 items-center justify-center rounded-control bg-brand font-extrabold text-brand-ink disabled:opacity-40"
          >
            Receber uma parte · {formatCents(parte)}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A fila de botões e o pagamento, embaixo da comanda.
 *
 * Liberar a mesa só aparece com a conta coberta, e é o único botão que
 * troca de lugar com o de pagar. Os dois juntos na mesma tela, um cinza e
 * um verde, faziam o garçom liberar a mesa achando que estava recebendo --
 * e mesa liberada sem pagar é venda que ninguém encontra depois.
 */
function Acoes({
  comanda,
  restaurantId,
  podeFinanceiro,
  podeMexer,
  mesaRotulo,
  temImpressora,
  onReceber,
  onAjustar,
  onDividir,
}: {
  comanda: ComandaAberta;
  restaurantId: string;
  podeFinanceiro: boolean;
  /** apagar a comanda inteira: dono e Garçom II */
  podeMexer: boolean;
  mesaRotulo: string;
  temImpressora: boolean;
  onReceber: () => void;
  onAjustar: (foco: "desconto" | "servico") => void;
  onDividir: () => void;
}) {
  const [liberado, liberar, liberando] = useActionState<SalaoFormState, FormData>(finalizarMesa, {});

  const temConta = comanda.id !== "" && comanda.totalCents > 0;
  const quitada = temConta && comanda.faltaCents === 0;

  return (
    <div className="flex flex-col gap-3">
      {/* a ordem é a do Yooga: imprimir, apagar, serviço, desconto -- e o
          dividir, que é nosso, por último */}
      <div className="grid grid-cols-5 gap-2">
        <ContaNoPapel
          restaurantId={restaurantId}
          comandaId={comanda.id}
          temConta={temConta}
          temImpressora={temImpressora}
          className={quadrado("imprimir")}
        />
        {podeMexer && temConta ? (
          <ApagarAMesa comanda={comanda} restaurantId={restaurantId} rotulo={mesaRotulo} classeInteira={quadrado("apagar")} />
        ) : (
          <button type="button" disabled aria-label="Apagar a comanda" className={quadrado("apagar")}>
            <Trash2 className="size-5" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onAjustar("servico")}
          disabled={!podeFinanceiro || !temConta}
          aria-label="Taxa de serviço"
          title="Taxa de serviço"
          className={quadrado("servico")}
        >
          <HandCoins className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onAjustar("desconto")}
          disabled={!podeFinanceiro || !temConta}
          aria-label="Desconto"
          title="Desconto"
          className={quadrado("desconto")}
        >
          <Percent className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDividir}
          disabled={!temConta || quitada}
          aria-label="Dividir a conta"
          title="Dividir a conta"
          className={quadrado("dividir")}
        >
          <ReceiptText className="size-5" aria-hidden="true" />
        </button>
      </div>

      {quitada && podeFinanceiro ? (
        <form action={liberar}>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="comandaId" value={comanda.id} />
          <button
            type="submit"
            disabled={liberando}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-success text-lg font-bold text-white disabled:opacity-40"
          >
            <Check className="size-5" aria-hidden="true" />
            {liberando ? "Liberando..." : "Liberar a mesa"}
          </button>
        </form>
      ) : quitada ? (
        /* conta paga e sem permissão de finalizar: quem libera é o balcão */
        <p className="flex min-h-14 items-center justify-center gap-2 rounded-control bg-success/15 px-4 text-center font-bold text-success">
          <Check className="size-5 shrink-0" aria-hidden="true" />
          Conta paga. O balcão libera a mesa.
        </p>
      ) : (
        <button
          type="button"
          onClick={onReceber}
          disabled={!temConta}
          className="flex min-h-14 items-center justify-center gap-2 rounded-control bg-brand text-lg font-bold text-brand-ink hover:brightness-105 disabled:opacity-40"
        >
          <Plus className="size-5" strokeWidth={2.5} aria-hidden="true" />
          Adicionar Pagamento
        </button>
      )}

      {liberado.error && (
        <p className="rounded-control bg-danger/15 px-3 py-2 text-sm font-bold text-danger" role="status">
          {liberado.error}
        </p>
      )}
    </div>
  );
}

/** a bolinha da categoria: a foto do primeiro prato que tem foto */
function Bolinha({ nome, imagem, ativa, onClick }: { nome: string; imagem: string | null; ativa: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativa} className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5">
      <span
        className={cn(
          "relative grid size-16 place-items-center overflow-hidden rounded-full border-2 bg-surface-2 text-xl font-bold text-muted transition-colors",
          ativa ? "border-brand ring-2 ring-brand/30" : "border-transparent",
        )}
      >
        {imagem ? <Image src={imagem} alt="" fill sizes="64px" className="object-cover" /> : nome.charAt(0).toUpperCase()}
      </span>
      <span className={cn("line-clamp-2 text-center text-xs leading-tight", ativa ? "font-bold text-brand" : "text-ink")}>{nome}</span>
    </button>
  );
}

function Cardapio({
  categorias,
  voltarHref,
  historicoHref,
  onEscolher,
  rodape,
}: {
  categorias: CategoriaDoCardapio[];
  voltarHref: string;
  /** o histórico já filtrado por esta mesa, como o relógio do Yooga */
  historicoHref: string;
  onEscolher: (p: ProdutoDoCardapio) => void;
  /** o Salvar, colado embaixo dos pratos no computador */
  rodape: ReactNode;
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);

  const procurando = limpo(busca).length > 0;
  const visiveis = procurando
    ? categorias
        .map((c) => ({ ...c, produtos: c.produtos.filter((p) => limpo(p.nome).includes(limpo(busca))) }))
        .filter((c) => c.produtos.length > 0)
    : categorias.filter((c) => !categoria || c.id === categoria);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            aria-label="Buscar no cardápio"
            className="h-12 w-full rounded-control border border-line bg-surface pr-4 pl-11 outline-none placeholder:text-faint focus:border-brand [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        <Link
          href={historicoHref}
          aria-label="Histórico desta mesa"
          title="Histórico desta mesa"
          className="grid size-12 shrink-0 place-items-center rounded-control border border-line bg-surface text-ink/70 hover:bg-surface-2 hover:text-ink"
        >
          <History className="size-5" aria-hidden="true" />
        </Link>
        <Link
          href={voltarHref}
          className="hidden h-12 shrink-0 items-center gap-2 rounded-control border border-line bg-surface px-5 text-sm font-bold tracking-wide uppercase hover:bg-surface-2 lg:flex"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar
        </Link>
      </div>

      {/* as categorias em bolinhas, numa fila que rola: num cardápio de
          dezoito seções, uma grade tomaria metade da tela antes do primeiro
          prato */}
      {!procurando && (
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          <Bolinha nome="Todos" imagem={null} ativa={categoria === null} onClick={() => setCategoria(null)} />
          {categorias.map((c) => (
            <Bolinha
              key={c.id}
              nome={c.nome}
              imagem={c.produtos.find((p) => p.imagem)?.imagem ?? null}
              ativa={categoria === c.id}
              onClick={() => setCategoria(c.id)}
            />
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visiveis.length === 0 ? (
          <p className="py-8 text-center text-muted">Nenhum produto com esse nome.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {visiveis.map((c) => (
              <section key={c.id} className="flex flex-col gap-2">
                <h3 className="text-sm font-bold">{c.nome}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {c.produtos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!p.disponivel}
                      onClick={() => onEscolher(p)}
                      className="flex flex-col overflow-hidden rounded-card border border-line bg-surface text-left shadow-[0_1px_0_rgb(0_0_0/0.04)] transition-colors hover:border-brand disabled:opacity-40"
                    >
                      <span className="relative grid aspect-[4/3] w-full place-items-center bg-surface-2 text-faint">
                        {p.imagem ? (
                          <Image src={p.imagem} alt="" fill sizes="200px" className="object-cover" />
                        ) : (
                          <ImageOff className="size-5" aria-hidden="true" />
                        )}
                      </span>
                      <span className="flex flex-1 flex-col gap-1 p-2.5">
                        <span className="line-clamp-2 text-sm">{p.nome}</span>
                        <span className="mt-auto font-bold tabular-nums">{formatCents(p.centavos)}</span>
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

      <div className="hidden lg:block">{rodape}</div>
    </div>
  );
}

export function ComandaDaMesa({
  comanda,
  categorias,
  podeFinanceiro = true,
  podeApagarItem = true,
  podeMexer = true,
  mesaRotulo = "mesa",
  temImpressora = false,
  restaurantId,
  mesaId,
  voltarHref,
  cabecalho,
}: {
  comanda: ComandaAberta;
  categorias: CategoriaDoCardapio[];
  /** o garçom sem permissão não vê desconto nem liberação de mesa */
  podeFinanceiro?: boolean;
  /** nem a lixeira ao lado do item que já foi para a cozinha */
  podeApagarItem?: boolean;
  /** trocar a mesa de lugar, mover itens e apagar a comanda */
  podeMexer?: boolean;
  mesaRotulo?: string;
  /** com o Menu Fácil PC ligado, a conta sai no balcão em vez de abrir na tela */
  temImpressora?: boolean;
  restaurantId: string;
  mesaId: string;
  /** o VOLTAR, de volta ao mapa do salão */
  voltarHref: string;
  /** "Mesa 4 ✎ ⇅": em cima da comanda no computador, no topo no celular */
  cabecalho: ReactNode;
}) {
  const [aba, setAba] = useState<"conta" | "cardapio">("cardapio");
  const [sacola, setSacola] = useState<Escolhido[]>([]);
  const [aberto, setAberto] = useState<ProdutoDoCardapio | null>(null);
  const [folha, setFolha] = useState<"pagamento" | "desconto" | "servico" | "divisao" | null>(null);
  const [parte, setParte] = useState<number | undefined>(undefined);
  const [estado, salvar, salvando] = useActionState<SalaoFormState, FormData>(lancarItens, {});

  // o que foi salvo sai da sacola: deixá-lo ali faria lançar duas vezes
  const [ultimoSalvo, setUltimoSalvo] = useState<string | undefined>(undefined);
  if (estado.ok && estado.message !== ultimoSalvo) {
    setUltimoSalvo(estado.message);
    setSacola([]);
  }

  // duas unidades do mesmo prato com observações diferentes são duas
  // linhas: "sem cebola" vale para uma e não para a outra
  const juntar = (item: ItemEscolhido) =>
    setSacola((atual) => {
      const chave = item.produtoId + "|" + item.opcoes.map((o) => o.id).join(",") + "|" + (item.observacao ?? "");
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

  const tirar = (chave: string) =>
    setSacola((atual) => atual.flatMap((i) => (i.chave === chave ? (i.quantidade > 1 ? [{ ...i, quantidade: i.quantidade - 1 }] : []) : [i])));

  const novoItens = sacola.reduce((s, i) => s + i.quantidade, 0);
  const novoCents = sacola.reduce((s, i) => s + i.centavos * i.quantidade, 0);

  const botaoSalvar = (className?: string) => (
    <form action={salvar} className={className}>
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="mesaId" value={mesaId} />
      <input
        type="hidden"
        name="itens"
        value={JSON.stringify(sacola.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, observacao: i.observacao, opcoes: i.opcoes })))}
      />
      <button
        type="submit"
        disabled={novoItens === 0 || salvando}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-brand text-lg font-bold text-brand-ink transition disabled:bg-surface-3 disabled:text-muted"
      >
        {salvando ? "Enviando..." : novoItens === 0 ? "Salvar" : "Salvar · " + novoItens + (novoItens === 1 ? " item · " : " itens · ") + formatCents(novoCents)}
      </button>
    </form>
  );

  const aviso = (estado.error || estado.message) && (
    <p className={cn("rounded-control px-3 py-2 text-sm font-bold", estado.error ? "bg-danger/15 text-danger" : "bg-success/15 text-success")} role="status">
      {estado.error ?? estado.message}
    </p>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-24 lg:grid lg:grid-cols-[minmax(22rem,26rem)_1fr] lg:grid-rows-[auto_1fr] lg:gap-x-5 lg:gap-y-0 lg:pb-0">
      {/* No celular, a comanda fica atrás de um botão no rodapé, como na
          tela do garçom: é o mesmo gesto nos dois aparelhos, e no alcance
          do polegar de quem está de pé. No computador as duas colunas
          aparecem juntas e este rodapé some. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-line bg-bg/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setAba(aba === "conta" ? "cardapio" : "conta")}
          aria-label={aba === "conta" ? "Ver o cardápio" : "Ver a comanda da mesa"}
          className="relative grid size-14 shrink-0 place-items-center rounded-control bg-surface-3 text-ink"
        >
          {aba === "conta" ? <UtensilsCrossed className="size-5" aria-hidden="true" /> : <Info className="size-5" aria-hidden="true" />}
          {aba !== "conta" && comanda.itens.length > 0 && (
            <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-brand text-[11px] font-extrabold text-brand-ink">
              {comanda.itens.length}
            </span>
          )}
        </button>
        {novoItens > 0 ? (
          botaoSalvar("min-w-0 flex-1")
        ) : (
          <p className="flex min-w-0 flex-1 items-center justify-between rounded-control bg-surface-2 px-4 font-bold">
            <span className="truncate">{aba === "conta" ? "Comanda" : "Cardápio"}</span>
            <span className="shrink-0 tabular-nums">{formatCents(comanda.totalCents)}</span>
          </p>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2 lg:col-start-1 lg:row-start-1 lg:rounded-t-card lg:border lg:border-b-0 lg:border-line lg:bg-surface lg:px-5 lg:pt-4">
        {cabecalho}
      </div>

      <section
        className={cn(
          "min-h-0 min-w-0 flex-col gap-4 rounded-card border border-line bg-surface p-4 lg:col-start-1 lg:row-start-2 lg:rounded-t-none lg:border-t-0 lg:px-5 lg:pt-1",
          aba === "conta" ? "flex" : "hidden lg:flex",
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          {comanda.itens.length === 0 && sacola.length === 0 ? (
            <p className="px-1 py-10 text-center text-muted">Nada lançado ainda. Escolha no cardápio.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {comanda.itens.map((i) => (
                <Linha key={i.id} item={i} restaurantId={restaurantId} podeApagar={podeApagarItem} />
              ))}
            </ul>
          )}

          {/* O que ainda não foi enviado fica separado do que já está na
              cozinha: são duas coisas diferentes para quem olha a conta.
              A faixa amarela atravessando a coluna é a do Yooga -- de
              relance ela diz "isto aqui ainda não foi para o fogão". */}
          {sacola.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-control border border-[#f0b429]/60">
              <p className="bg-[#f7d070] px-3 py-1.5 text-xs font-extrabold tracking-wide text-[#4a3708] uppercase">Novos · falta salvar</p>
              <ul className="flex flex-col gap-1 bg-[#fdf6e3] p-3">
                {sacola.map((i) => (
                  <li key={i.chave} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {i.quantidade}x {i.nome}
                      </span>
                      {(i.rotulo || i.observacao) && (
                        <span className="block truncate text-xs text-muted">{[i.rotulo, i.observacao].filter(Boolean).join(" · ")}</span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatCents(i.centavos * i.quantidade)}</span>
                    <button
                      type="button"
                      onClick={() => tirar(i.chave)}
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
        </div>

        <Totais comanda={comanda} novoCents={novoCents} />

        {aviso}

        <Acoes
          comanda={comanda}
          restaurantId={restaurantId}
          podeFinanceiro={podeFinanceiro}
          podeMexer={podeMexer}
          mesaRotulo={mesaRotulo}
          temImpressora={temImpressora}
          onReceber={() => {
            setParte(undefined);
            setFolha("pagamento");
          }}
          onAjustar={setFolha}
          onDividir={() => setFolha("divisao")}
        />
      </section>

      <section
        className={cn("min-h-0 min-w-0 flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1", aba === "cardapio" ? "flex" : "hidden lg:flex")}
      >
        <Cardapio categorias={categorias} voltarHref={voltarHref} historicoHref={`${voltarHref}/historico?mesa=${mesaId}`} onEscolher={setAberto} rodape={botaoSalvar()} />
      </section>

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

      {folha === "pagamento" && (
        <FolhaDoPagamento
          comanda={comanda}
          restaurantId={restaurantId}
          podeDesfazer={podeFinanceiro}
          valorInicial={parte}
          onFechar={() => setFolha(null)}
        />
      )}

      {(folha === "desconto" || folha === "servico") && (
        <FolhaDoDesconto comanda={comanda} restaurantId={restaurantId} foco={folha} onFechar={() => setFolha(null)} />
      )}

      {folha === "divisao" && (
        <FolhaDaDivisao
          comanda={comanda}
          onFechar={() => setFolha(null)}
          onReceber={(centavos) => {
            setParte(centavos);
            setFolha("pagamento");
          }}
        />
      )}
    </div>
  );
}
