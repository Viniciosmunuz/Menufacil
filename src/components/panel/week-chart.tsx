import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { DiaDaSemana } from "@/server/stats";

// Os sete últimos dias em barras.
//
// Feito com divs e altura em porcentagem: sem biblioteca de gráfico, sem
// JavaScript no navegador, e acompanha o tema. O que importa aqui não é
// precisão de milímetro, é enxergar o ritmo da semana — que dia enche,
// que dia esvazia.

export function WeekChart({ dias, titulo, descricao }: { dias: DiaDaSemana[]; titulo: string; descricao?: string }) {
  const maior = Math.max(...dias.map((d) => d.pedidos), 1);
  const totalPedidos = dias.reduce((soma, d) => soma + d.pedidos, 0);
  const totalCentavos = dias.reduce((soma, d) => soma + d.centavos, 0);

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold">{titulo}</h2>
          {descricao && <p className="text-sm text-muted">{descricao}</p>}
        </div>
        <p className="text-right text-sm text-muted">
          <span className="block font-extrabold text-ink tabular-nums">{formatCents(totalCentavos)}</span>
          {totalPedidos} pedido{totalPedidos === 1 ? "" : "s"}
        </p>
      </div>

      {totalPedidos === 0 ? (
        <p className="mt-4 text-sm text-muted">Nenhum pedido nos últimos sete dias.</p>
      ) : (
        <div className="mt-5 flex items-end justify-between gap-1.5 sm:gap-3">
          {dias.map((d) => (
            <div
              key={d.key}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              title={`${d.label}: ${d.pedidos} pedido${d.pedidos === 1 ? "" : "s"} · ${formatCents(d.centavos)}`}
            >
              <span className={cn("text-xs font-bold tabular-nums", d.pedidos > 0 ? "text-muted" : "text-transparent")}>{d.pedidos || 0}</span>
              <div className="flex h-24 w-full items-end sm:h-28">
                <div
                  className={cn("w-full rounded-t-md", d.hoje ? "bg-brand" : "bg-brand/35")}
                  // 6% é o toco que mostra "teve pedido, mas pouco"; 2%, o dia vazio
                  style={{ height: `${d.pedidos > 0 ? Math.max(Math.round((d.pedidos / maior) * 100), 6) : 2}%` }}
                />
              </div>
              <span className={cn("truncate text-xs", d.hoje ? "font-extrabold text-ink" : "text-faint")}>{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
