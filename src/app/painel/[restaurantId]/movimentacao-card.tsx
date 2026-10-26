import { ChevronRight, CircleCheck, CircleSlash, PackageOpen, TriangleAlert } from "lucide-react";

import { formatMinutos } from "@/lib/format";
import type { PedidoAtrasado } from "@/server/stats";
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

const ETAPA = {
  aceite: "esperando alguém aceitar",
  cozinha: "na cozinha",
  entrega: "na entrega",
} as const;

export function MovimentacaoCard({
  base,
  emAndamento,
  concluidos,
  cancelados,
  atrasados,
}: {
  base: string;
  emAndamento: number;
  concluidos: number;
  cancelados: number;
  /** pedidos parados mais que o normal desta casa; o pior vem primeiro */
  atrasados: PedidoAtrasado[];
}) {
  const pior = atrasados[0];
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

      {/* O aviso de atraso.

          Não é "demorou mais de X minutos" -- esse X não existe igual para
          todo mundo. É mais que o dobro do que ESTA casa costuma levar
          nessa etapa, com piso de dez minutos a mais. Sem régua medida, o
          aviso não aparece: inventar um limite seria apitar na cara de
          quem está trabalhando no ritmo normal dele. */}
      {pior && (
        <Link
          href={`${base}/pedidos`}
          className="mt-3 flex items-center gap-3 rounded-control border border-warning/50 bg-warning/10 px-3 py-2.5 transition-colors hover:bg-warning/15"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-warning/20 text-warning">
            <TriangleAlert className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block leading-tight font-extrabold text-warning">
              {atrasados.length === 1 ? "1 pedido atrasado" : `${atrasados.length} pedidos atrasados`}
            </span>
            <span className="block truncate text-xs text-muted">
              O #{pior.numero} está há {formatMinutos(pior.minutos)} {ETAPA[pior.etapa]} · o normal daqui é {formatMinutos(pior.normal)}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-warning" aria-hidden="true" />
        </Link>
      )}
    </Card>
  );
}
