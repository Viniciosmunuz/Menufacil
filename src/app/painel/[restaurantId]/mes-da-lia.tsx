import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { formatCents } from "@/lib/format";
import type { MesDaLia } from "@/server/stats";

// O mês da Lia, no canto que é de "Clientes que voltam" em quem não a
// tem ligada.
//
// A troca é de propósito e segue a mesma regra do resto do painel: a
// tela mostra o que este restaurante tem. Quem não liga a IA não precisa
// de um cartão dela apagado na tela; quem liga quer saber se ela está
// valendo o que custa, e esse é o número que responde -- quantos pedidos
// ela fechou sozinha, sem ninguém do balcão digitar nada.
//
// O pedido já vem marcado do banco (`feitoPelaIa`), a mesma marca que a
// tela de Pedidos usa para o selo "Anotado pela IA".

export function MesDaLia({ dados, href }: { dados: MesDaLia; href: string }) {
  const { pedidos, pedidosDaLia, centavosDaLia, clientesDaLia } = dados;
  const pct = pedidos > 0 ? Math.round((pedidosDaLia / pedidos) * 100) : 0;

  return (
    <Card className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-muted uppercase">
        <Sparkles className="size-4 shrink-0 text-faint" aria-hidden="true" />
        A Lia no seu mês
      </p>

      {pedidosDaLia === 0 ? (
        <p className="text-sm text-muted">
          Ela está ligada e atendendo. Quando fechar o primeiro pedido pela conversa, ele aparece aqui.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <span className="text-4xl leading-none font-extrabold tracking-tight tabular-nums text-brand">{pedidosDaLia}</span>
            <span className="text-sm font-bold text-muted">
              {pedidosDaLia === 1 ? "pedido fechado por ela" : "pedidos fechados por ela"}
            </span>
          </div>

          <p className="text-sm text-muted">
            <strong className="text-ink">{formatCents(centavosDaLia)}</strong> em 30 dias, de{" "}
            {clientesDaLia === 1 ? "1 cliente" : `${clientesDaLia} clientes`} que ela atendeu sozinha no WhatsApp — {pct}% do
            seu delivery do mês.
          </p>

          {/* A barra diz a mesma coisa do número, mas de um jeito que se
              lê sem ler: o pedaço laranja é o que ela fez, o resto é o
              que entrou pelos outros caminhos. */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" role="presentation">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
        </>
      )}

      <Link href={href} className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-bold text-brand hover:underline">
        Ver a Lia
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </Card>
  );
}
