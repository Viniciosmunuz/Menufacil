import { ChevronRight, LineChart, TrendingDown, TrendingUp, Trophy, Users, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { DiaDaSemana } from "@/server/stats";

// O rodapé da Visão geral: para onde ir depois de olhar o movimento.
//
// Mês, campeões e clientes eram três cartões grandes nesta tela, disputando
// espaço com o que pede decisão agora. Viraram três atalhos para telas
// próprias, onde cada assunto cabe inteiro -- a lista de clientes do mês
// não são cinco nomes, são todos.

function Atalho({ icone, titulo, apoio, href }: { icone: ReactNode; titulo: string; apoio: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-control border border-line bg-bg px-3.5 py-3 transition-colors hover:border-line-strong hover:bg-surface-2"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm leading-tight font-extrabold">{titulo}</span>
        <span className="block truncate text-xs text-muted">{apoio}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden="true" />
    </Link>
  );
}

export function DesempenhoCard({ base, mes }: { base: string; mes: string }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white">
            <LineChart className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg leading-tight font-extrabold">Desempenho do restaurante</h2>
            <p className="text-sm text-muted">Acompanhe os principais indicadores do seu negócio.</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-line bg-surface-2 px-3 py-1 text-sm font-bold text-muted first-letter:uppercase">
          {mes}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Atalho
          icone={<Trophy className="size-5" aria-hidden="true" />}
          titulo="Produtos mais vendidos"
          apoio="Ranking e faturamento por item"
          href={`${base}/resumo#produtos`}
        />
        <Atalho
          icone={<Users className="size-5" aria-hidden="true" />}
          titulo="Clientes frequentes"
          apoio="Pedidos e valor gasto"
          href={`${base}/clientes`}
        />
        <Atalho
          icone={<Wallet className="size-5" aria-hidden="true" />}
          titulo="Fechamento e resumo mensal"
          apoio="Vendas, pedidos e resultados"
          href={`${base}/resumo`}
        />
      </div>
    </Card>
  );
}

/**
 * Como o dia está indo, contra a média da semana.
 *
 * A regra está escrita na própria tela de propósito. Elogio automático sem
 * conta por trás é enfeite -- e no dia ruim fica mentindo na cara de quem
 * trabalhou. Aqui o cartão diz exatamente contra o que está comparando, e
 * cala a boca enquanto não houver semana suficiente para comparar.
 *
 * A média é dos dias ANTERIORES que tiveram venda: incluir hoje, que ainda
 * está no meio, puxaria a régua para baixo e todo dia pareceria bom.
 */
export function ComoEstaODia({ semana }: { semana: DiaDaSemana[] }) {
  const hoje = semana.find((d) => d.hoje)?.centavos ?? 0;
  const anteriores = semana.filter((d) => !d.hoje && d.centavos > 0);

  // menos de dois dias de histórico não é média, é um dia solto
  if (anteriores.length < 2) {
    return (
      <Card className="flex flex-col justify-center gap-1.5">
        <p className="text-lg leading-tight font-extrabold">Juntando histórico</p>
        <p className="text-sm text-muted">
          A partir de dois dias com venda na semana, este cartão passa a comparar o dia de hoje com a média dos anteriores.
        </p>
      </Card>
    );
  }

  const media = Math.round(anteriores.reduce((soma, d) => soma + d.centavos, 0) / anteriores.length);
  const pct = Math.round(((hoje - media) / media) * 100);
  const acima = hoje >= media;

  return (
    <Card
      className={cn(
        "flex flex-col justify-center gap-1.5",
        acima && "border-brand/40 bg-[linear-gradient(150deg,rgb(249_104_11/0.14),transparent_60%)]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full text-white",
            acima ? "bg-brand" : "bg-surface-3 text-muted",
          )}
        >
          {acima ? <TrendingUp className="size-5" aria-hidden="true" /> : <TrendingDown className="size-5" aria-hidden="true" />}
        </span>
        <p className="text-lg leading-tight font-extrabold">{acima ? "Muito bom!" : "Dia mais calmo"}</p>
      </div>

      <p className="text-sm text-muted">
        Hoje está{" "}
        <span className={cn("font-extrabold", acima ? "text-brand" : "text-ink")}>
          {Math.abs(pct)}% {acima ? "acima" : "abaixo"}
        </span>{" "}
        da média dos outros dias desta semana, que é de {formatCents(media)}.
      </p>
    </Card>
  );
}
