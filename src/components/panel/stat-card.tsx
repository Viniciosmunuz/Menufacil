import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

// Um número da visão geral.
//
// Com href, o cartão inteiro vira atalho: ver "3 em andamento" e não poder
// tocar para chegar neles é pedir para a pessoa procurar o caminho sozinha.
//
// A variação existe porque número sozinho não diz se o dia está bom: 12
// pedidos é ótimo para quem fez 6 ontem e ruim para quem fez 30.
//
// No celular o ícone sobe para cima do texto e tudo encolhe um ponto, para
// cabes dois cartões lado a lado. Empilhado um por linha, ver os quatro
// números da visão geral custava três rolagens -- e eles existem justamente
// para serem lidos de uma vez.

export function StatCard({
  label,
  value,
  icon,
  hint,
  href,
  variacao,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: string;
  href?: string;
  /** quanto mudou contra ontem, em porcento; null quando não dá para comparar */
  variacao?: number | null;
}) {
  const subiu = typeof variacao === "number" && variacao > 0;
  const desceu = typeof variacao === "number" && variacao < 0;

  const miolo = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-brand-soft text-brand sm:size-11 [&_svg]:size-5">{icon}</span>
      <div className="min-w-0">
        <p className="min-h-10 text-sm font-semibold text-muted sm:min-h-0">{label}</p>
        <p className="mt-0.5 text-xl font-extrabold tabular-nums sm:text-2xl">{value}</p>
        {(subiu || desceu) && (
          <p className={cn("mt-0.5 flex items-start gap-1 text-xs font-bold", subiu ? "text-success" : "text-danger")}>
            {subiu ? (
              <TrendingUp className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <TrendingDown className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            )}
            {/* a metade final só aparece com espaço: numa coluna de meia tela,
                "que ontem" já diz contra o que se está comparando */}
            <span>
              {subiu ? "+" : ""}
              {variacao}% que ontem<span className="hidden sm:inline"> a esta hora</span>
            </span>
          </p>
        )}
        {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
      </div>
    </>
  );

  const fora = "flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4";

  if (!href) return <Card className={fora}>{miolo}</Card>;

  return (
    <Link href={href} className={cn(fora, "rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong sm:p-6")}>
      {miolo}
    </Link>
  );
}
