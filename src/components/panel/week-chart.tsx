"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { DiaDaSemana } from "@/server/stats";

// Os sete últimos dias em barras.
//
// Feito com divs e altura em porcentagem: sem biblioteca de gráfico e
// acompanhando o tema. O que importa aqui não é precisão de milímetro, é
// enxergar o ritmo da semana — que dia enche, que dia esvazia.
//
// A altura é o número de pedidos; o valor vem ao tocar. O dinheiro de cada
// dia já estava calculado e só aparecia no balãozinho do navegador, que no
// celular não existe -- e é no celular que o dono olha isto. Agora toca-se
// na barra e o valor daquele dia aparece embaixo, sem tirar da vista o
// total da semana.

/** "Sáb, 04/10" a partir da chave "2026-10-04" */
function comData(d: DiaDaSemana) {
  const dia = `${d.label.charAt(0).toUpperCase()}${d.label.slice(1)}`;
  return `${dia}, ${d.key.slice(8, 10)}/${d.key.slice(5, 7)}`;
}

export function WeekChart({ dias, titulo, descricao }: { dias: DiaDaSemana[]; titulo: string; descricao?: string }) {
  // guarda a chave, não o objeto: assim a seleção sobrevive a um dado novo
  // chegando do servidor sem apontar para um dia que já saiu da janela
  const [escolhido, setEscolhido] = useState<string | null>(null);

  const maior = Math.max(...dias.map((d) => d.pedidos), 1);
  const totalPedidos = dias.reduce((soma, d) => soma + d.pedidos, 0);
  const totalCentavos = dias.reduce((soma, d) => soma + d.centavos, 0);
  const dia = dias.find((d) => d.key === escolhido) ?? null;

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
        <>
          <div className="mt-5 flex items-end justify-between gap-1.5 sm:gap-3">
            {dias.map((d) => {
              const selecionado = d.key === escolhido;
              return (
                <button
                  key={d.key}
                  type="button"
                  // tocar de novo no mesmo dia volta ao total da semana: é o
                  // caminho que a mão tenta antes de procurar um "fechar"
                  onClick={() => setEscolhido(selecionado ? null : d.key)}
                  aria-pressed={selecionado}
                  aria-label={`${comData(d)}: ${d.pedidos} pedido${d.pedidos === 1 ? "" : "s"}, ${formatCents(d.centavos)}`}
                  className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-control focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <span className={cn("text-xs font-bold tabular-nums", d.pedidos > 0 ? "text-muted" : "text-transparent")}>{d.pedidos || 0}</span>
                  <div className="flex h-24 w-full items-end sm:h-28">
                    <div
                      className={cn(
                        "w-full rounded-t-md transition-colors",
                        // com um dia escolhido os outros recuam: o destaque
                        // precisa ser do dia que se está olhando, não de hoje
                        selecionado || (!escolhido && d.hoje) ? "bg-brand" : escolhido ? "bg-brand/20" : "bg-brand/35",
                      )}
                      // 6% é o toco que mostra "teve pedido, mas pouco"; 2%, o dia vazio
                      style={{ height: `${d.pedidos > 0 ? Math.max(Math.round((d.pedidos / maior) * 100), 6) : 2}%` }}
                    />
                  </div>
                  <span className={cn("truncate text-xs", selecionado || d.hoje ? "font-extrabold text-ink" : "text-faint")}>{d.label}</span>
                </button>
              );
            })}
          </div>

          {/* a linha existe mesmo sem seleção, com o convite no lugar do
              valor: reservar o espaço evita o card pular a cada toque, e
              sem o convite ninguém descobre que dá para tocar */}
          <p className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-line pt-3 text-sm">
            {dia ? (
              <>
                <span className="text-muted">
                  <span className="font-bold text-ink">{comData(dia)}</span> · {dia.pedidos} pedido{dia.pedidos === 1 ? "" : "s"}
                </span>
                <span className="font-extrabold text-ink tabular-nums">{formatCents(dia.centavos)}</span>
              </>
            ) : (
              <span className="text-faint">Toque num dia para ver quanto entrou.</span>
            )}
          </p>
        </>
      )}
    </Card>
  );
}
