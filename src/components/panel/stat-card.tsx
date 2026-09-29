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
      <span className="grid size-11 shrink-0 place-items-center rounded-control bg-brand-soft text-brand [&_svg]:size-5">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold tabular-nums">{value}</p>
        {(subiu || desceu) && (
          <p className={cn("mt-0.5 flex items-center gap-1 text-xs font-bold", subiu ? "text-success" : "text-danger")}>
            {subiu ? <TrendingUp className="size-3.5" aria-hidden="true" /> : <TrendingDown className="size-3.5" aria-hidden="true" />}
            {subiu ? "+" : ""}
            {variacao}% que ontem a esta hora
          </p>
        )}
        {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
      </div>
    </>
  );

  if (!href) return <Card className="flex items-start gap-4">{miolo}</Card>;

  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong sm:p-6"
    >
      {miolo}
    </Link>
  );
}
