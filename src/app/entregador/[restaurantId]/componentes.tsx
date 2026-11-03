import { Bike, MapPin, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoIcon } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { formatCents, formatTime } from "@/lib/format";
import { enderecoEmLinha, type EntregaNaLista } from "@/server/entregadores/entregas";

// As peças das telas do entregador.
//
// Isto aqui tem de parecer aplicativo, e não página: a faixa laranja no
// topo com a marca, os cartões subindo por cima dela, sombra embaixo de
// tudo que é tocável e a barra de baixo solta, flutuando. É o contrário da
// página do painel, que é um documento largo para ler sentado.

const FORMA = { PIX: "Pix", CARD: "Cartão", CASH: "Dinheiro" } as const;

/**
 * A faixa do topo.
 *
 * Ocupa o lugar da barra de status do aplicativo: marca à esquerda, o que
 * a pessoa pode mexer à direita, e o título dentro dela, em branco. O
 * `pb` generoso existe para os cartões da tela subirem por cima da faixa
 * -- é esse encaixe que dá a sensação de profundidade.
 */
export function Faixa({
  titulo,
  subtitulo,
  acao,
  alta = false,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  acao?: ReactNode;
  /** com espaço embaixo para os cartões subirem por cima */
  alta?: boolean;
}) {
  return (
    <header
      className={cn(
        "-mx-4 rounded-b-[2rem] bg-gradient-to-br from-brand to-brand-press px-5 pt-5 text-white shadow-lg shadow-brand/20",
        alta ? "pb-16" : "pb-7",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <LogoIcon className="h-7 text-white" />
          <span className="text-base leading-none font-extrabold">
            MenuFácil
            <span className="mt-0.5 block text-[0.55rem] font-bold tracking-[0.25em] text-white/70 uppercase">Entregas</span>
          </span>
        </span>
        {acao}
      </div>

      <div className="pt-6">
        <h1 className="text-2xl font-extrabold">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-white/80">{subtitulo}</p>}
      </div>
    </header>
  );
}

/** o número da vez: em entrega, entregues hoje */
export function Numero({
  rotulo,
  valor,
  icone: Icone,
  tom,
}: {
  rotulo: string;
  valor: ReactNode;
  icone: LucideIcon;
  tom: "brand" | "success";
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-bg p-4 shadow-md shadow-black/5">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-xl",
          tom === "brand" ? "bg-brand-soft text-brand" : "bg-success/12 text-success",
        )}
      >
        <Icone className="size-5" aria-hidden="true" />
      </span>
      <span className="text-xs font-bold text-muted">{rotulo}</span>
      <span className="text-2xl leading-none font-extrabold tabular-nums">{valor}</span>
    </div>
  );
}

/**
 * O recado escuro, que corta a tela clara.
 *
 * Usado para o que não é lista nem número: "você está online", "fique
 * atento". Escuro de propósito -- no meio de cartões claros, é o único
 * bloco que o olho procura primeiro.
 */
export function Recado({ titulo, children, icone: Icone, arte = false }: { titulo: string; children: ReactNode; icone: LucideIcon; arte?: boolean }) {
  return (
    <div className="relative flex min-h-28 items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-[#2b3038] p-4 text-white shadow-lg shadow-black/10">
      {/* o brilho laranja no canto, que tira o bloco do "retângulo preto" */}
      <span className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-brand/25 blur-2xl" aria-hidden="true" />
      {/* a arte do entregador, encostada na direita e desaparecendo para a
          esquerda: é a mesma do desenho do aplicativo, e ela já vem com o
          próprio fundo escuro -- a máscara é o que esconde a emenda */}
      {arte && (
        // eslint-disable-next-line @next/next/no-img-element -- arte fixa do aplicativo, sem transformação
        <img
          src="/app/entregador-moto-escuro.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 h-full w-auto opacity-95 [mask-image:linear-gradient(to_right,transparent,black_42%)]"
        />
      )}
      <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-brand-ink">
        <Icone className="size-6" aria-hidden="true" />
      </span>
      <span className="relative min-w-0 max-w-[60%]">
        <span className="block font-extrabold">{titulo}</span>
        <span className="block text-sm text-white/70">{children}</span>
      </span>
    </div>
  );
}

/** o título de uma lista, com o ícone na frente */
export function Secao({ children, icone: Icone, contagem }: { children: ReactNode; icone?: LucideIcon; contagem?: number }) {
  return (
    <h2 className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-muted uppercase">
      {Icone && <Icone className="size-4 text-brand" aria-hidden="true" />}
      {children}
      {contagem !== undefined && <span className="tabular-nums">({contagem})</span>}
    </h2>
  );
}

/**
 * Um pedido na lista.
 *
 * O número grande primeiro, o endereço logo abaixo: é o que o entregador
 * procura quando olha a tela com o capacete na mão. O valor e a forma de
 * pagamento vêm no pé porque importam na porta, não na escolha.
 */
export function CartaoDePedido({
  pedido,
  base,
  selo,
}: {
  pedido: EntregaNaLista & { status?: string };
  base: string;
  selo?: ReactNode;
}) {
  const dinheiro = pedido.paymentMethod === "CASH";
  return (
    <Link
      href={`${base}/pedido/${pedido.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-line bg-bg p-4 shadow-md shadow-black/5 transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-lg font-extrabold tabular-nums">#{pedido.number}</span>
        {selo}
      </div>
      <p className="font-bold">{pedido.customerName}</p>
      <p className="flex items-start gap-1.5 text-sm text-muted">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {enderecoEmLinha(pedido) || "sem endereço no pedido"}
      </p>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-2 text-sm">
        <span className={cn("font-bold", dinheiro && "text-warning")}>
          {FORMA[pedido.paymentMethod]}
          {dinheiro && " · leve troco"}
        </span>
        <span className="font-extrabold tabular-nums">{formatCents(pedido.totalCents)}</span>
      </div>
      <p className="text-xs text-faint">Pedido das {formatTime(pedido.createdAt)}</p>
    </Link>
  );
}

export function ListaVazia({ titulo, children, icone: Icone = Bike }: { titulo: string; children: ReactNode; icone?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-8 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-bg text-faint shadow-md shadow-black/5">
        <Icone className="size-7" aria-hidden="true" />
      </span>
      <p className="font-extrabold">{titulo}</p>
      <p className="max-w-xs text-sm text-muted">{children}</p>
    </div>
  );
}
