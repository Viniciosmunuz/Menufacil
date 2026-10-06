import { Timer, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatMinutos } from "@/lib/format";
import type { TemposDeUmRestaurante } from "@/server/stats";

// Quanto cada restaurante está demorando, um por linha.
//
// Antes isto era um número só, da plataforma inteira, e não respondia nada:
// quando uma casa começa a demorar para aceitar, a média geral mal se mexe
// e o telefonema que precisava acontecer não acontece. Com o nome do lado,
// a lista diz em qual casa ligar.
//
// O mais demorado vem primeiro, porque é essa a linha que pede ação. Quem
// ainda não tem pedido concluído suficiente para medir fica de fora: linha
// de travessões não informa e faz a lista parecer quebrada.

/** acima disto, o atendimento inteiro já está longe do que se promete */
const DEMORADO_MIN = 60;
/** o balcão demorando a tocar no pedido: é o que faz o cliente desistir */
const ACEITE_LENTO_MIN = 10;
/** o mesmo corte do painel do dono: variação pequena é o dia sendo dia */
const MINUTOS_PARA_AVISAR = 5;
const PARTE_PARA_AVISAR = 0.25;

export function TemposPorRestaurante({ lista }: { lista: TemposDeUmRestaurante[] }) {
  if (lista.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold">Quanto cada um está demorando</h2>
          <p className="text-sm text-muted">Os últimos 15 pedidos entregues de cada restaurante.</p>
        </div>
        <Timer className="size-5 text-faint" aria-hidden="true" />
      </div>

      <ul className="flex flex-col divide-y divide-line">
        {lista.map(({ id, nome, tempos }) => {
          const demorado = (tempos.total?.minutos ?? 0) >= DEMORADO_MIN;
          const aceiteLento = (tempos.aceite?.minutos ?? 0) >= ACEITE_LENTO_MIN;

          // Piorou agora, ou sempre foi assim?
          //
          // São dois telefonemas diferentes: uma casa que sempre levou uma
          // hora precisa de conversa sobre o cardápio; uma que levava
          // quarenta e passou a levar uma hora tem algo acontecendo hoje.
          const antes = tempos.normal?.total;
          const delta = antes && tempos.total ? tempos.total.minutos - antes.minutos : 0;
          const piorou = !!antes && delta >= MINUTOS_PARA_AVISAR && delta >= antes.minutos * PARTE_PARA_AVISAR;

          return (
            <li key={id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0 flex-1 truncate font-bold">{nome}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                {piorou && (
                  <span className="flex items-center gap-1 text-xs font-bold text-warning">
                    <TrendingUp className="size-3.5 shrink-0" aria-hidden="true" />
                    {formatMinutos(delta)} acima do normal
                  </span>
                )}
                <span className={cn("text-lg font-extrabold tabular-nums", demorado && "text-warning")}>
                  {tempos.total ? formatMinutos(tempos.total.minutos) : "—"}
                </span>
              </span>

              {/* as três etapas na linha de baixo: o total diz que está
                  demorando, elas dizem onde */}
              <span className="w-full text-sm text-muted">
                {tempos.aceite && (
                  <span className={cn(aceiteLento && "font-bold text-warning")}>Aceitar {formatMinutos(tempos.aceite.minutos)}</span>
                )}
                {tempos.cozinha && <> · Cozinha {formatMinutos(tempos.cozinha.minutos)}</>}
                {tempos.entrega && <> · Entrega {formatMinutos(tempos.entrega.minutos)}</>}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
