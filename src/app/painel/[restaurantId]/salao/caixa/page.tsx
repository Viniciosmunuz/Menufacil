import { ArrowLeft, Banknote, CircleDollarSign, Info, NotebookPen, Printer, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApagarMovimento, BotaoDeMovimento } from "@/components/panel/caixa-movimento";
import { AbasDoRelatorio } from "@/components/panel/abas-do-relatorio";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { cn } from "@/lib/cn";
import { formatCents, formatWhen } from "@/lib/format";
import { requireSalao } from "@/server/auth/dal";
import { resumoDoCaixa } from "@/server/salao/resumo-do-caixa";
import { turnoAberto } from "@/server/salao/turno";

import { FecharCaixaForm } from "../caixa-form";

export const metadata: Metadata = { title: "Resumo do Caixa" };

// O Resumo do Caixa: a prestação de contas do turno, no jeito do Yooga.
//
// Em cima, os quatro números que o caixa confere na frente da gaveta --
// vendas, valor de abertura, entradas e saídas. Embaixo, o relatório da
// noite em três abas, porque são três perguntas diferentes: o que vendi,
// em que forma de pagamento, e o que entrou e saiu de dinheiro à mão.
//
// Esta tela é do dono. O garçom não chega aqui: o painel inteiro exige
// papel de dono no servidor.

export default async function CaixaDoSalaoPage({ params }: PageProps<"/painel/[restaurantId]/salao/caixa">) {
  const { restaurantId } = await params;
  const { restaurant, pode } = await requireSalao(restaurantId);
  const base = `/painel/${restaurant.id}/salao`;

  const turno = await turnoAberto(restaurant.id);
  // sem caixa aberto não há resumo: o salão manda de volta para a abertura
  if (!turno) notFound();

  const r = await resumoDoCaixa(restaurant.id, turno.id);
  if (!r) notFound();

  const cartao = (titulo: string, valor: string, icone: React.ReactNode, cor?: string, rodape?: string) => (
    <div className="flex min-w-0 flex-col gap-1 rounded-card border border-line bg-surface px-4 py-3.5">
      <span className="flex items-center gap-1.5 text-sm text-muted">
        <span className={cn("[&_svg]:size-4", cor)}>{icone}</span>
        {titulo}
      </span>
      <span className="truncate text-2xl font-extrabold tabular-nums">{valor}</span>
      {rodape && <span className="truncate text-xs text-faint">{rodape}</span>}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* o caixa fica aberto nesta tela a noite toda */}
      <AutoRefresh seconds={30} background />

      <div className="flex flex-wrap items-center gap-3">
        <Link href={base} aria-label="Voltar ao salão" className="grid size-10 shrink-0 place-items-center rounded-control border border-line text-muted hover:text-ink">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold">
          Resumo do Caixa
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c3f0d4] px-3 py-1 text-sm font-bold text-[#157f47]">
            <span className="size-2 rounded-full bg-[#1e9a52]" aria-hidden="true" />
            Aberto
          </span>
        </h1>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a
            href={`${base}/caixa/papel`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 items-center gap-2 rounded-control px-3 font-semibold text-ink/80 hover:bg-surface-2"
          >
            <Printer className="size-5" aria-hidden="true" />
            Imprimir
          </a>
          {pode.finalizarMesa && (
            <>
              <BotaoDeMovimento restaurantId={restaurant.id} tipo="ENTRADA" />
              <BotaoDeMovimento restaurantId={restaurant.id} tipo="SAIDA" />
            </>
          )}
        </div>
      </div>

      <p className="-mt-3 text-sm text-muted">
        Aberto {formatWhen(r.abertoAt)}
        {r.abertoPor ? " por " + r.abertoPor : ""}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cartao("Vendas", formatCents(r.vendasCents), <CircleDollarSign />, "text-brand", `${r.vendas.length} ${r.vendas.length === 1 ? "mesa paga" : "mesas pagas"}`)}
        {cartao("Valor de abertura", formatCents(r.aberturaCents), <Wallet />, "text-ink/60", "o troco do começo da noite")}
        {cartao("Entradas", formatCents(r.entradasCents), <TrendingUp />, "text-[#157f47]")}
        {cartao("Saídas", formatCents(r.saidasCents), <TrendingDown />, "text-danger")}
      </div>

      {/* o que tem de haver na gaveta agora: é com este número que o dono
          compara o dinheiro contado */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-card border border-line bg-surface px-5 py-4">
        <span className="flex items-center gap-2 font-bold">
          <Banknote className="size-5 text-ink/60" aria-hidden="true" />
          Deve ter na gaveta
          <span className="font-semibold text-faint">· abertura + dinheiro + entradas − saídas</span>
        </span>
        <span className="text-2xl font-extrabold tabular-nums">{formatCents(r.naGavetaCents)}</span>
      </div>

      {r.anotadoCents > 0 && (
        <p className="flex items-center justify-between gap-3 rounded-control bg-warning/10 px-4 py-3 text-sm font-bold text-warning">
          <span className="flex items-center gap-2">
            <NotebookPen className="size-4" aria-hidden="true" />
            Anotado, a receber
          </span>
          <span className="tabular-nums">{formatCents(r.anotadoCents)}</span>
        </p>
      )}

      {/* fechar é o fim da noite, e por isso fica em vermelho e sozinho */}
      {r.abertas.length === 0 ? (
        <FecharCaixaForm restaurantId={restaurant.id} podeFechar={pode.finalizarMesa} esperadoCents={r.naGavetaCents} />
      ) : (
        <div className="flex flex-col gap-2 rounded-card border border-warning/50 bg-warning/10 p-4">
          <p className="flex items-center gap-2 font-bold text-warning">
            <Info className="size-5 shrink-0" aria-hidden="true" />
            {r.abertas.length === 1 ? "Ainda há uma mesa aberta" : `Ainda há ${r.abertas.length} mesas abertas`}
          </p>
          <p className="text-sm text-muted">Elas precisam ser pagas antes do fechamento.</p>
          <ul className="flex flex-col divide-y divide-line/60">
            {r.abertas.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`${base}/mesa/${m.id}`} className="font-bold hover:underline">
                  {m.rotulo}
                </Link>
                <span className="shrink-0 tabular-nums text-muted">{formatCents(m.centavos)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">Relatório de vendas</h2>
        <AbasDoRelatorio
          vendas={
            r.vendas.length === 0 ? (
              <p className="px-4 py-10 text-center text-muted">Nenhuma mesa paga neste turno.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead className="text-xs tracking-wide text-faint uppercase">
                    <tr className="border-b border-line">
                      <th className="px-4 py-2.5 font-bold">Mesa</th>
                      <th className="px-4 py-2.5 font-bold">Data</th>
                      <th className="px-4 py-2.5 font-bold">Canal</th>
                      <th className="px-4 py-2.5 font-bold">Forma de pagamento</th>
                      <th className="px-4 py-2.5 text-right font-bold">Valor</th>
                      <th className="px-4 py-2.5 font-bold">Vendido por</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {r.vendas.map((v) => (
                      <tr key={v.comandaId}>
                        <td className="px-4 py-3 font-bold">{v.mesa}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted tabular-nums">{formatWhen(v.quando)}</td>
                        <td className="px-4 py-3 text-muted">{v.canal}</td>
                        <td className="px-4 py-3 text-muted">{v.formas}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCents(v.centavos)}</td>
                        <td className="px-4 py-3 truncate text-muted">{v.vendidoPor}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`${base}/conta/${v.comandaId}`} target="_blank" rel="noopener" className="font-bold text-brand hover:underline">
                            Ver detalhes
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          formas={
            r.porForma.length === 0 ? (
              <p className="px-4 py-10 text-center text-muted">Nada recebido neste turno.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {r.porForma.map((l) => (
                  <li key={l.forma} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{l.nome}</span>
                      <span className="block text-sm text-muted">
                        {l.vendas} {l.vendas === 1 ? "recebimento" : "recebimentos"}
                        {l.forma === "ANOTADO" ? " · a casa cobra depois" : ""}
                      </span>
                    </span>
                    <span className={cn("shrink-0 font-extrabold tabular-nums", l.forma === "ANOTADO" && "text-warning")}>{formatCents(l.centavos)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 bg-surface-2 px-4 py-3 font-extrabold">
                  <span>Total recebido</span>
                  <span className="tabular-nums">{formatCents(r.vendasCents)}</span>
                </li>
              </ul>
            )
          }
          movimentacoes={
            r.movimentos.length === 0 ? (
              <p className="px-4 py-10 text-center text-muted">Nenhuma entrada ou saída de dinheiro neste turno.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {r.movimentos.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", m.tipo === "ENTRADA" ? "bg-[#c3f0d4] text-[#157f47]" : "bg-danger/15 text-danger")}>
                      {m.tipo === "ENTRADA" ? <TrendingUp className="size-4" aria-hidden="true" /> : <TrendingDown className="size-4" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{m.motivo}</span>
                      <span className="block text-xs text-faint">
                        {m.quem} · {formatWhen(m.quando)}
                      </span>
                    </span>
                    <span className={cn("shrink-0 font-bold tabular-nums", m.tipo === "ENTRADA" ? "text-[#157f47]" : "text-danger")}>
                      {m.tipo === "ENTRADA" ? "+" : "−"}
                      {formatCents(m.centavos)}
                    </span>
                    {pode.finalizarMesa && <ApagarMovimento restaurantId={restaurant.id} movimentoId={m.id} motivo={m.motivo} />}
                  </li>
                ))}
              </ul>
            )
          }
        />
      </section>
    </div>
  );
}
