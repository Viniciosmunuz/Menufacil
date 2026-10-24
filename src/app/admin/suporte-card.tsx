import { ChevronRight, LifeBuoy } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatWhen } from "@/lib/format";

// O suporte, na visão geral do admin.
//
// Não é uma seção do menu: quem administra a plataforma não "vai até" o
// suporte, ele precisa ver de relance se tem alguém esperando -- e é
// exatamente para isso que existe a visão geral. Tocar no cartão abre a
// lista inteira.
//
// No celular ele ocupa a vaga ao lado das mensalidades, só com o número.
// No computador cresce até o fim da linha e mostra quem está esperando,
// porque ali há espaço para responder "quem?" sem mais um toque.

export type ChamadoResumido = { id: string; restaurante: string; assunto: string; createdAt: Date };

export function SuporteCard({ abertos, className }: { abertos: ChamadoResumido[]; className?: string }) {
  const n = abertos.length;

  return (
    <Link href="/admin/suporte" className={cn("group block", className)}>
      <Card
        className={cn(
          "flex h-full flex-col gap-3 transition-colors group-hover:border-line-strong",
          n > 0 && "border-warning/50",
        )}
      >
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-control sm:size-11 [&_svg]:size-5",
              n > 0 ? "bg-warning/15 text-warning" : "bg-brand-soft text-brand",
            )}
          >
            <LifeBuoy aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-muted">Suporte</p>
            <p className="mt-0.5 text-xl font-extrabold tabular-nums sm:text-2xl">{n}</p>
            <p className="text-xs text-faint">{n === 0 ? "Ninguém esperando" : n === 1 ? "esperando resposta" : "esperando resposta"}</p>
          </div>
          <ChevronRight className="hidden size-5 shrink-0 text-faint xl:block" aria-hidden="true" />
        </div>

        {/* quem está esperando, só onde há espaço para a lista */}
        {n > 0 && (
          <ul className="hidden flex-col gap-1.5 border-t border-line pt-3 text-sm xl:flex">
            {abertos.slice(0, 3).map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">
                  <span className="font-bold">{c.restaurante}</span> <span className="text-muted">· {c.assunto}</span>
                </span>
                <span className="shrink-0 text-faint">{formatWhen(c.createdAt)}</span>
              </li>
            ))}
            {n > 3 && <li className="text-faint">e mais {n - 3}</li>}
          </ul>
        )}
      </Card>
    </Link>
  );
}
