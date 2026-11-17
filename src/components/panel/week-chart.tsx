"use client";

import { LineChart, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { DiaDaSemana } from "@/server/stats";

// Os sete últimos dias numa curva, como gráfico de cotação.
//
// Eram barras até 15/11/2026; ele pediu a cara de gráfico da bolsa. É uma
// linha com a área preenchida embaixo, e não velas: vela precisa de
// abertura, máxima, mínima e fechamento, e um dia de vendas é um número só.
//
// Feito com um SVG de duas linhas: sem biblioteca de gráfico e
// acompanhando o tema. O que importa aqui não é precisão de milímetro, é
// enxergar o ritmo da semana -- que dia enche, que dia esvazia.
//
// São duas leituras do mesmo período, e misturá-las numa escala só mente:
// o dia de 15 pedidos pequenos e o de 6 pedidos grandes trocam de lugar
// conforme a pergunta. Por isso a chave em cima, e uma coisa de cada vez.
//
// O valor de cada dia vem ao tocar. Ele já estava calculado e só aparecia
// no balãozinho do navegador, que no celular não existe -- e é no celular
// que o dono olha isto.

type Medida = "pedidos" | "vendas";

/** "Sáb, 04/10" a partir da chave "2026-10-04" */
function comData(d: DiaDaSemana) {
  const dia = `${d.label.charAt(0).toUpperCase()}${d.label.slice(1)}`;
  return `${dia}, ${d.key.slice(8, 10)}/${d.key.slice(5, 7)}`;
}

/** "R$ 1,2 mil" -- no eixo não cabe o valor inteiro */
function curto(centavos: number) {
  const reais = centavos / 100;
  if (reais >= 1000) return `${(reais / 1000).toFixed(reais >= 10000 ? 0 : 1).replace(".", ",")} mil`;
  return String(Math.round(reais));
}

export function WeekChart({ dias, titulo, descricao }: { dias: DiaDaSemana[]; titulo: string; descricao?: string }) {
  // guarda a chave, não o objeto: assim a seleção sobrevive a um dado novo
  // chegando do servidor sem apontar para um dia que já saiu da janela
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [medida, setMedida] = useState<Medida>("pedidos");

  const vendas = medida === "vendas";
  const valorDe = (d: DiaDaSemana) => (vendas ? d.centavos : d.pedidos);

  const maior = Math.max(...dias.map(valorDe), 1);
  const totalPedidos = dias.reduce((soma, d) => soma + d.pedidos, 0);
  const totalCentavos = dias.reduce((soma, d) => soma + d.centavos, 0);
  const dia = dias.find((d) => d.key === escolhido) ?? null;

  // três linhas de referência, do topo ao chão
  const marcas = [1, 0.5, 0].map((p) => ({ p, texto: vendas ? curto(maior * p) : String(Math.round(maior * p)) }));

  // Onde cada valor cai, em % da altura. O maior dia não encosta no teto:
  // sobra uma folga em cima para o número dele caber.
  const FOLGA = 16;
  const altura = (proporcao: number) => 100 - proporcao * (100 - FOLGA);
  const pontos = dias.map((d, i) => {
    const valor = valorDe(d);
    return {
      d,
      valor,
      x: ((i + 0.5) / dias.length) * 100,
      y: altura(valor / maior),
      aceso: d.key === escolhido || (!escolhido && d.hoje),
    };
  });
  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const marcado = pontos.find((p) => p.d.key === escolhido) ?? null;

  // a variação do dia escolhido sobre o dia anterior, na medida que está à vista
  const anterior = dia ? dias[dias.findIndex((d) => d.key === dia.key) - 1] : undefined;
  const variacao =
    dia && anterior && valorDe(anterior) > 0 ? Math.round(((valorDe(dia) - valorDe(anterior)) / valorDe(anterior)) * 100) : null;

  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-faint">
            <LineChart className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg leading-tight font-extrabold">{titulo}</h2>
            {descricao && <p className="text-sm text-muted">{descricao}</p>}
          </div>
        </div>

        <div className="flex shrink-0 rounded-full border border-line bg-surface-2 p-0.5" role="group" aria-label="O que mostrar no gráfico">
          {(["pedidos", "vendas"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMedida(m)}
              aria-pressed={medida === m}
              className={cn(
                "min-h-9 rounded-full px-3.5 text-sm font-bold transition-colors",
                medida === m ? "bg-brand-soft text-brand" : "text-muted hover:text-ink",
              )}
            >
              {m === "pedidos" ? "Pedidos" : "Vendas"}
            </button>
          ))}
        </div>
      </div>

      {totalPedidos === 0 ? (
        <p className="mt-5 text-sm text-muted">Nenhum pedido nos últimos sete dias.</p>
      ) : (
        <>
          <div className="mt-5 flex gap-2.5">
            {/* o eixo: três números discretos, na altura das linhas */}
            <div className="relative h-32 w-9 shrink-0 text-right text-[0.65rem] leading-none font-bold text-faint tabular-nums sm:h-36">
              {marcas.map((m) => (
                <span key={m.p} className="absolute right-0 -translate-y-1/2" style={{ top: `${altura(m.p)}%` }}>
                  {m.texto}
                </span>
              ))}
            </div>

            <div className="relative min-w-0 flex-1">
              <div className="relative h-32 sm:h-36">
                {/* as linhas de referência, atrás da curva */}
                <div aria-hidden="true" className="absolute inset-0">
                  {marcas.map((m) => (
                    <span
                      key={m.p}
                      className={cn("absolute inset-x-0 border-t", m.p === 0 ? "border-line-strong" : "border-dashed border-line")}
                      style={{ top: `${altura(m.p)}%` }}
                    />
                  ))}
                </div>

                {/* A curva e a área embaixo dela. O desenho estica com o
                    cartão (por isso o traço não escala), e os pontos são
                    HTML por cima: esticado, um círculo de SVG vira oval. */}
                <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                  <defs>
                    <linearGradient id="semana-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${linha} L ${pontos[pontos.length - 1].x} 100 L ${pontos[0].x} 100 Z`} fill="url(#semana-area)" />
                  <path
                    d={linha}
                    fill="none"
                    stroke="var(--color-brand)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                {/* a linha de prumo do dia escolhido, como no gráfico da bolsa */}
                {marcado && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 border-l border-dashed border-brand/50"
                    style={{ left: `${marcado.x}%` }}
                  />
                )}

                {pontos.map((p) => (
                  <span key={p.d.key} aria-hidden="true" className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                    <span
                      className={cn(
                        "block rounded-full border-2 border-brand transition-all",
                        p.aceso ? "size-3.5 bg-brand ring-4 ring-brand/15" : "size-2.5 bg-surface",
                      )}
                    />
                    <span
                      className={cn(
                        "absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 text-[0.7rem] leading-none font-extrabold whitespace-nowrap tabular-nums",
                        p.aceso ? "text-ink" : "text-muted",
                      )}
                    >
                      {vendas ? curto(p.valor) : p.valor}
                    </span>
                  </span>
                ))}

                {/* um botão por dia, na coluna inteira: o dedo não precisa acertar o ponto */}
                <div className="absolute inset-0 flex">
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
                        className="h-full min-w-0 flex-1 cursor-pointer rounded-control hover:bg-brand/5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                      />
                    );
                  })}
                </div>
              </div>

              <div className="mt-2 flex">
                {dias.map((d) => (
                  <span
                    key={d.key}
                    className={cn(
                      "min-w-0 flex-1 truncate text-center text-xs",
                      d.key === escolhido || (!escolhido && d.hoje) ? "font-extrabold text-ink" : "text-faint",
                    )}
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
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
                <span className="flex items-center gap-2">
                  {variacao !== null && variacao !== 0 && (
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-extrabold tabular-nums",
                        variacao > 0 ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink",
                      )}
                      title="Sobre o dia anterior"
                    >
                      {variacao > 0 ? <TrendingUp className="size-3.5" aria-hidden="true" /> : <TrendingDown className="size-3.5" aria-hidden="true" />}
                      {variacao > 0 ? "+" : ""}
                      {variacao}%
                    </span>
                  )}
                  <span className="font-extrabold text-ink tabular-nums">{formatCents(dia.centavos)}</span>
                </span>
              </>
            ) : (
              <>
                <span className="text-faint">Toque num dia para ver o detalhe.</span>
                <span className="text-muted">
                  <span className="font-extrabold text-ink tabular-nums">{formatCents(totalCentavos)}</span> · {totalPedidos} na semana
                </span>
              </>
            )}
          </p>
        </>
      )}
    </Card>
  );
}
