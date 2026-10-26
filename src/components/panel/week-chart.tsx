"use client";

import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import type { DiaDaSemana } from "@/server/stats";

// Os sete últimos dias em barras.
//
// Feito com divs e altura em porcentagem: sem biblioteca de gráfico e
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
  // as barras sobem depois da primeira pintura, em vez de já nascerem de pé
  const [subiu, setSubiu] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSubiu(true), 30);
    return () => clearTimeout(t);
  }, []);

  const vendas = medida === "vendas";
  const valorDe = (d: DiaDaSemana) => (vendas ? d.centavos : d.pedidos);

  const maior = Math.max(...dias.map(valorDe), 1);
  const totalPedidos = dias.reduce((soma, d) => soma + d.pedidos, 0);
  const totalCentavos = dias.reduce((soma, d) => soma + d.centavos, 0);
  const dia = dias.find((d) => d.key === escolhido) ?? null;

  // três linhas de referência, do topo ao chão
  const marcas = [1, 0.5, 0].map((p) => ({ p, texto: vendas ? curto(maior * p) : String(Math.round(maior * p)) }));

  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
            <BarChart3 className="size-5" aria-hidden="true" />
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
            {/* o eixo: três números discretos, alinhados às linhas */}
            <div className="flex h-32 w-9 shrink-0 flex-col justify-between py-px text-right text-[0.65rem] leading-none font-bold text-faint tabular-nums sm:h-36">
              {marcas.map((m) => (
                <span key={m.p}>{m.texto}</span>
              ))}
            </div>

            <div className="relative min-w-0 flex-1">
              {/* as linhas de referência, atrás das barras */}
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-32 sm:h-36">
                {marcas.map((m) => (
                  <span
                    key={m.p}
                    className={cn("absolute inset-x-0 border-t", m.p === 0 ? "border-line-strong" : "border-line")}
                    style={{ top: `${(1 - m.p) * 100}%` }}
                  />
                ))}
              </div>

              <div className="relative flex h-32 items-end justify-between gap-1.5 sm:h-36 sm:gap-3">
                {dias.map((d) => {
                  const selecionado = d.key === escolhido;
                  const valor = valorDe(d);
                  const aceso = selecionado || (!escolhido && d.hoje);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      // tocar de novo no mesmo dia volta ao total da semana: é o
                      // caminho que a mão tenta antes de procurar um "fechar"
                      onClick={() => setEscolhido(selecionado ? null : d.key)}
                      aria-pressed={selecionado}
                      aria-label={`${comData(d)}: ${d.pedidos} pedido${d.pedidos === 1 ? "" : "s"}, ${formatCents(d.centavos)}`}
                      className="group flex h-full min-w-0 flex-1 cursor-pointer flex-col justify-end rounded-t-control focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                      <span
                        className={cn(
                          "mb-1 text-[0.7rem] leading-none font-extrabold tabular-nums transition-colors",
                          valor > 0 ? (aceso ? "text-ink" : "text-muted") : "text-transparent",
                        )}
                      >
                        {vendas ? curto(valor) : valor || 0}
                      </span>
                      <span
                        className={cn(
                          "w-full rounded-t-md transition-[height,background-color] duration-500 ease-out",
                          aceso ? "bg-brand" : escolhido ? "bg-brand/20" : "bg-brand/35 group-hover:bg-brand/55",
                        )}
                        // 6% é o toco que mostra "teve movimento, mas pouco"; 2%, o dia vazio
                        style={{ height: subiu ? `${valor > 0 ? Math.max(Math.round((valor / maior) * 100), 6) : 2}%` : "2%" }}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex justify-between gap-1.5 sm:gap-3">
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
                <span className="font-extrabold text-ink tabular-nums">{formatCents(dia.centavos)}</span>
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
