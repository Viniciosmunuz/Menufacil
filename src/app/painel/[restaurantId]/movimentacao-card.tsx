import { ChevronRight, CircleCheck, CircleSlash, PackageOpen } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

// Onde estão os pedidos de hoje, em três linhas.
//
// Os números já existiam espalhados: um no cartão do dia, outro na fila,
// o cancelado em lugar nenhum. Juntos eles respondem a pergunta do meio do
// expediente -- "o que ainda está na minha mão?" -- e cada linha leva à
// lista já filtrada, que é o passo seguinte de quem perguntou.

function Linha({
  icone,
  tom,
  titulo,
  apoio,
  quantos,
  href,
}: {
  icone: ReactNode;
  tom: string;
  titulo: string;
  apoio: string;
  quantos: number;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-control py-2.5 transition-colors hover:bg-surface-2"
      >
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-control", tom)}>{icone}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate leading-tight font-bold">{titulo}</span>
          <span className="block truncate text-xs text-muted">{apoio}</span>
        </span>
        <span className="shrink-0 text-lg font-extrabold tabular-nums">{quantos}</span>
        <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden="true" />
      </Link>
    </li>
  );
}

export function MovimentacaoCard({
  base,
  emAndamento,
  concluidos,
  cancelados,
}: {
  base: string;
  emAndamento: number;
  concluidos: number;
  cancelados: number;
}) {
  return (
    <Card className="flex flex-col">
      <h2 className="text-lg font-extrabold">Movimentação do dia</h2>
      <p className="text-sm text-muted">O que está na sua mão agora, e o que já fechou hoje.</p>

      <ul className="mt-3 flex flex-col divide-y divide-line">
        <Linha
          icone={<PackageOpen className="size-5" aria-hidden="true" />}
          tom="bg-brand-soft text-brand"
          titulo="Em andamento"
          apoio="Esperando, na cozinha e na entrega"
          quantos={emAndamento}
          href={`${base}/pedidos`}
        />
        <Linha
          icone={<CircleCheck className="size-5" aria-hidden="true" />}
          tom="bg-success/12 text-success"
          titulo="Concluídos"
          apoio="Hoje · entregues e retirados"
          quantos={concluidos}
          href={`${base}/pedidos?ver=concluidos`}
        />
        <Linha
          icone={<CircleSlash className="size-5" aria-hidden="true" />}
          tom="bg-surface-3 text-faint"
          titulo="Cancelados"
          apoio="Hoje"
          quantos={cancelados}
          href={`${base}/pedidos?ver=cancelados`}
        />
      </ul>
    </Card>
  );
}
