import { ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";

import { Gaveta } from "@/components/ui/gaveta";
import { formatCents } from "@/lib/format";

// Os campeões do mês, em gaveta.
//
// É consulta, não vigilância: o ranking responde "o que comprar amanhã",
// uma pergunta de quem senta para pensar, não de quem está no meio do
// movimento. Aberto o tempo todo, ele ocupava um terço da linha para dizer
// cinco nomes que ninguém lê com pedido entrando.
//
// Fechado, o resumo já entrega o que mais importa -- quem é o primeiro --,
// e a lista inteira está a um toque.

export type MaisPedido = { nome: string; quantidade: number; centavos: number };

export function MaisPedidosCard({ produtos, cardapioHref }: { produtos: MaisPedido[]; cardapioHref: string }) {
  const primeiro = produtos[0];

  return (
    <Gaveta
      titulo="Mais pedidos no mês"
      resumo={primeiro ? `${primeiro.nome} · ${primeiro.quantidade}x` : "Os campeões dos últimos 30 dias"}
      icone={<Trophy />}
    >
      {produtos.length === 0 ? (
        <p className="text-sm text-muted">Assim que chegarem os primeiros pedidos, os produtos mais vendidos aparecem aqui.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-line">
          {produtos.map((p, i) => (
            <li key={p.nome} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
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

      <Link href={cardapioHref} className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">
        Ver o cardápio
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </Gaveta>
  );
}
