import { ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/format";

// Os campeões do mês: o que comprar amanhã.
//
// Aberto, e não em gaveta: cinco nomes cabem na coluna sem pedir toque
// nenhum, e o primeiro colocado em laranja é o que se lê de relance.

export type MaisPedido = { nome: string; quantidade: number; centavos: number };

export function MaisPedidosCard({ produtos, cardapioHref }: { produtos: MaisPedido[]; cardapioHref: string }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
          <Trophy className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg leading-tight font-extrabold">Mais pedidos no mês</h2>
          <p className="text-sm text-muted">Os campeões dos últimos 30 dias.</p>
        </div>
      </div>

      {produtos.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Assim que chegarem os primeiros pedidos, os produtos mais vendidos aparecem aqui.</p>
      ) : (
        <ol className="mt-3 flex flex-col divide-y divide-line">
          {produtos.map((p, i) => (
            <li key={p.nome} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={
                    i === 0
                      ? "grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-ink"
                      : "grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold text-muted"
                  }
                >
                  {i + 1}
                </span>
                <span className="min-w-0 truncate text-sm font-semibold">{p.nome}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-extrabold tabular-nums">{p.quantidade}x</span>
                <span className="block text-xs text-muted tabular-nums">{formatCents(p.centavos)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <Link href={cardapioHref} className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-bold text-brand hover:underline">
        Ver o cardápio
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </Card>
  );
}
