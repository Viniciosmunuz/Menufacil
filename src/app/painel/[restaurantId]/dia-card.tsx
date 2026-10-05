import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";

// Como o dia está indo, num cartão só.
//
// Eram quatro números soltos lado a lado -- pedidos hoje, esperando,
// concluídos, vendido --, e dois deles chegaram a se contradizer na tela do
// Papaléguas: "+100% em pedidos" ao lado de "-7% em vendas". Lidos
// separados, um desmente o outro. Lidos juntos, contam a mesma história:
// dobrou o movimento e o ticket caiu pela metade.
//
// Por isso o ticket ganhou o mesmo tamanho do faturamento, com o de ontem
// ao lado. É o número que explica os outros dois, e era o que estava
// escondido como linha de apoio.

function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  // sem ontem para comparar não há variação: "+100%" contra zero não
  // significa nada e só enfeita
  if (anterior <= 0) return null;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  if (pct === 0) return null;
  const subiu = pct > 0;
  const Icone = subiu ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-bold", subiu ? "text-success" : "text-danger")}>
      <Icone className="size-4" aria-hidden="true" />
      {subiu ? "+" : ""}
      {pct}%
    </span>
  );
}

export function DiaCard({
  href,
  pedidos,
  pedidosOntem,
  centavos,
  centavosOntem,
  concluidos,
}: {
  href: string;
  pedidos: number;
  pedidosOntem: number;
  centavos: number;
  centavosOntem: number;
  concluidos: number;
}) {
  const ticket = pedidos > 0 ? Math.round(centavos / pedidos) : 0;
  const ticketOntem = pedidosOntem > 0 ? Math.round(centavosOntem / pedidosOntem) : 0;

  // a frase só aparece quando os dois lados discordam -- é aí que o número
  // sozinho engana
  const maisPedidos = pedidosOntem > 0 && pedidos > pedidosOntem;
  const menosDinheiro = centavosOntem > 0 && centavos < centavosOntem;
  const leitura =
    maisPedidos && menosDinheiro
      ? "Mais pedidos que ontem, mas cada um está saindo menor."
      : !maisPedidos && pedidosOntem > 0 && pedidos < pedidosOntem && centavos > centavosOntem
        ? "Menos pedidos que ontem, mas cada um está valendo mais."
        : null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold">Hoje até agora</h2>
        <Link href={href} className="text-sm font-bold text-brand hover:underline">
          Ver pedidos
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-3xl font-extrabold tabular-nums">{formatCents(centavos)}</span>
            <Variacao atual={centavos} anterior={centavosOntem} />
          </p>
          <p className="mt-1 text-sm text-muted">
            {pedidos} {pedidos === 1 ? "pedido" : "pedidos"}
            {concluidos > 0 && ` · ${concluidos} ${concluidos === 1 ? "concluído" : "concluídos"}`}
            {pedidosOntem > 0 && ` · ontem ${pedidosOntem}`}
          </p>
        </div>

        <div>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-3xl font-extrabold tabular-nums">{ticket > 0 ? formatCents(ticket) : "—"}</span>
            <Variacao atual={ticket} anterior={ticketOntem} />
          </p>
          <p className="mt-1 text-sm text-muted">
            Ticket médio
            {ticketOntem > 0 && ` · ontem ${formatCents(ticketOntem)}`}
          </p>
        </div>
      </div>

      {leitura && <p className="border-t border-line pt-3 text-sm text-muted">{leitura}</p>}
    </Card>
  );
}
