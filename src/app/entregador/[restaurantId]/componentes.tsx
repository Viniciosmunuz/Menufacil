import { Bike, MapPin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { formatCents, formatTime } from "@/lib/format";
import { enderecoEmLinha, type EntregaNaLista } from "@/server/entregadores/entregas";

// As peças repetidas das telas do entregador.
//
// O cartão de pedido é o mesmo no Início, na lista e no histórico: na rua,
// com pressa, reconhecer a forma vale mais do que caprichar em cada tela.

const FORMA = { PIX: "Pix", CARD: "Cartão", CASH: "Dinheiro" } as const;

export function Topo({ titulo, acao }: { titulo: string; acao?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 pt-5 pb-3">
      <h1 className="text-2xl font-extrabold">{titulo}</h1>
      {acao}
    </header>
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
      className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong"
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

export function ListaVazia({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-faint">
        <Bike className="size-6" aria-hidden="true" />
      </span>
      <p className="font-extrabold">{titulo}</p>
      <p className="text-sm text-muted">{children}</p>
    </div>
  );
}
