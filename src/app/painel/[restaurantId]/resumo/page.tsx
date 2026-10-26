import { Banknote, CalendarDays, CreditCard, QrCode, Trophy, Wallet } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { competenciaLabel } from "@/lib/cobranca";
import { db } from "@/lib/db";
import { formatCents, startOfDaysAgo } from "@/lib/format";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { fechamentoDoDia, mesAteAgora, type LinhaDoFechamento } from "@/server/stats";

export const metadata: Metadata = { title: "Resumo mensal" };

// O mês e o caixa do dia, fora da tela de Início.
//
// São três perguntas que o dono faz sentado, não no meio do movimento:
// quanto entrou no mês, que dias renderam mais, e quanto tem em cada forma
// de pagamento para fechar a noite. Na tela inicial elas disputavam espaço
// com o que precisa de decisão agora.
//
// Os produtos vêm junto porque respondem a pergunta seguinte -- o que
// comprar amanhã -- e porque é a mesma sessão de pensar.

const DIAS_DO_RANKING = 30;

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "sex, 17/10": o dia da semana é o que o dono lembra, a data confirma */
function rotulo(key: string) {
  const [ano, mes, dia] = key.split("-").map(Number);
  const semana = DIAS[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  return `${semana}, ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}

const NOME = { PIX: "Pix", CASH: "Dinheiro", CARD: "Cartão" } as const;
const ICONE = { PIX: QrCode, CASH: Banknote, CARD: CreditCard } as const;
const ONDE: Record<LinhaDoFechamento["onde"], string> = {
  "na-conta": "já na conta",
  "a-confirmar": "ainda não confirmado",
  "em-maos": "recebido na entrega",
};

function Numero({ icone, fundo, rotulo: r, valor, apoio }: { icone: ReactNode; fundo: string; rotulo: string; valor: string; apoio?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
      <span className={`grid size-11 shrink-0 place-items-center rounded-full text-white ${fundo}`}>{icone}</span>
      <div className="min-w-0">
        <p className="text-[0.8rem] leading-tight font-bold text-muted">{r}</p>
        <p className="mt-0.5 text-[1.5rem] leading-none font-extrabold tabular-nums">{valor}</p>
        {apoio && <p className="mt-1 text-[0.7rem] text-muted">{apoio}</p>}
      </div>
    </div>
  );
}

export default async function ResumoPage({ params }: PageProps<"/painel/[restaurantId]/resumo">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);

  const escopo = { restaurantId: restaurant.id };
  // o salão tem o caixa dele: aqui é o delivery, como no resto desta área
  const semSalao = { ...escopo, origin: { not: "SALAO" as const } };

  const [mes, horarios, produtos] = await Promise.all([
    mesAteAgora(escopo),
    db.restaurant.findUniqueOrThrow({
      where: { id: restaurant.id },
      select: { openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } } },
    }),
    db.orderItem.groupBy({
      by: ["productName"],
      where: { order: { ...semSalao, status: { not: "CANCELED" }, createdAt: { gte: startOfDaysAgo(DIAS_DO_RANKING) } } },
      _sum: { quantity: true, totalCents: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 20,
    }),
  ]);

  const fechamento = await fechamentoDoDia(escopo, horarios.openingHours);
  const nome = competenciaLabel(mes.competencia);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Fechamento e resumo mensal"
        description="Vendas, pedidos e resultados do período."
        back={{ href: `/painel/${restaurant.id}`, label: "Visão geral" }}
        actions={
          <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold text-muted first-letter:uppercase">
            {nome}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Numero
          icone={<Wallet className="size-5" aria-hidden="true" />}
          fundo="bg-brand"
          rotulo="Faturado no mês"
          valor={formatCents(mes.centavos)}
          apoio={`${mes.pedidos} ${mes.pedidos === 1 ? "pedido" : "pedidos"}`}
        />
        <Numero
          icone={<CalendarDays className="size-5" aria-hidden="true" />}
          fundo="bg-info"
          rotulo="Ticket médio do mês"
          valor={mes.pedidos > 0 ? formatCents(Math.round(mes.centavos / mes.pedidos)) : "—"}
          apoio="Por pedido"
        />
        <Numero
          icone={<Trophy className="size-5" aria-hidden="true" />}
          fundo="bg-success"
          rotulo="Dia de mais pedidos"
          valor={mes.maisPedidos ? rotulo(mes.maisPedidos.key) : "—"}
          apoio={mes.maisPedidos ? `${mes.maisPedidos.pedidos} ${mes.maisPedidos.pedidos === 1 ? "pedido" : "pedidos"}` : undefined}
        />
        <Numero
          icone={<Trophy className="size-5" aria-hidden="true" />}
          fundo="bg-[#6366f1]"
          rotulo="Dia que mais vendeu"
          valor={mes.maisVendido ? rotulo(mes.maisVendido.key) : "—"}
          apoio={mes.maisVendido ? formatCents(mes.maisVendido.centavos) : undefined}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <Wallet className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg leading-tight font-extrabold">Fechamento do dia</h2>
              <p className="text-sm text-muted">Onde está o dinheiro de hoje.</p>
            </div>
          </div>

          {fechamento.totalPedidos === 0 ? (
            <p className="text-sm text-muted">Nenhum pedido hoje ainda.</p>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-line">
                {fechamento.linhas.map((l) => {
                  const Icone = ICONE[l.method];
                  return (
                    <li key={`${l.method}:${l.onde}`} className="flex items-center gap-3 py-3 first:pt-0">
                      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-3 text-muted">
                        <Icone className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{NOME[l.method]}</span>
                        <span className="block text-sm text-muted">
                          {ONDE[l.onde]} · {l.pedidos} {l.pedidos === 1 ? "pedido" : "pedidos"}
                        </span>
                      </span>
                      <span className="shrink-0 font-extrabold tabular-nums">{formatCents(l.centavos)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                <span className="font-extrabold">Total do dia</span>
                <span className="text-xl font-extrabold tabular-nums">{formatCents(fechamento.totalCentavos)}</span>
              </div>
              {/* o que está em mãos é o que alguém vai contar e guardar; o Pix
                  já está na conta e não precisa de conferência de gaveta */}
              <p className="text-sm text-muted">Pedido cancelado e pedido que ainda espera o Pix não entram nesta conta.</p>
            </>
          )}
        </Card>

        <Card id="produtos" className="flex scroll-mt-6 flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <Trophy className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg leading-tight font-extrabold">Produtos mais vendidos</h2>
              <p className="text-sm text-muted">Ranking e faturamento por item, nos últimos {DIAS_DO_RANKING} dias.</p>
            </div>
          </div>

          {produtos.length === 0 ? (
            <p className="text-sm text-muted">Assim que chegarem os primeiros pedidos, os produtos aparecem aqui.</p>
          ) : (
            <ol className="flex flex-col divide-y divide-line">
              {produtos.map((p, i) => (
                <li key={p.productName} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={
                        i === 0
                          ? "grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-ink"
                          : "grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold text-muted"
                      }
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 truncate text-sm font-semibold">{p.productName}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-extrabold tabular-nums">{p._sum.quantity ?? 0}x</span>
                    <span className="block text-xs text-muted tabular-nums">{formatCents(p._sum.totalCents ?? 0)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
