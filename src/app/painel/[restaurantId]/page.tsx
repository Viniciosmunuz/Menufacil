import { CheckCircle2, ChevronRight, Clock, PackageX, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatCard } from "@/components/panel/stat-card";
import { WeekChart } from "@/components/panel/week-chart";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { TIME_ZONE, formatCents, startOfDaysAgo, startOfToday } from "@/lib/format";
import { OPEN_ORDER_STATUSES, restaurantStatusLabel, restaurantStatusTone } from "@/lib/labels";
import { EXCLUDE_UNPAID } from "@/lib/order-flow";
import { isOpenNow, todayLabel } from "@/lib/opening-hours";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { activationChecklist } from "@/server/restaurants/checklist";
import { hojeContraOntem, semanaDePedidos, variacao } from "@/server/stats";

import { OpenNowCard } from "./open-now-card";
import { StatusCard } from "./status-card";

export const metadata: Metadata = { title: "Início" };

/** "Bom dia" de verdade: a hora é a de Manaus, não a do servidor em UTC */
function saudacao() {
  const hora = Number(new Date().toLocaleString("pt-BR", { hour: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE }));
  if (hora < 12) return "Bom dia!";
  return hora < 18 ? "Boa tarde!" : "Boa noite!";
}

export default async function RestaurantDashboardPage({ params }: PageProps<"/painel/[restaurantId]">) {
  const { restaurantId } = await params;
  const { restaurant, viaAdmin } = await requireRestaurantAccess(restaurantId);

  const escopo = { restaurantId: restaurant.id };
  const hoje = startOfToday();
  const todayWhere = { ...escopo, createdAt: { gte: hoje } };

  const [dia, semana, inProgress, completedToday, esgotados, topProducts, checklist, details] = await Promise.all([
    hojeContraOntem(escopo),
    semanaDePedidos(escopo),
    // "em andamento" é trabalho esperando alguém, então o pedido do 100%
    // Delivery que parou na tela do Pix fica de fora: carrinho abandonado
    // não é fila, e somado dia após dia viraria um número que ninguém
    // consegue zerar. Ele continua aparecendo na lista de Pedidos, onde dá
    // para olhar e cancelar.
    db.order.count({ where: { ...escopo, status: { in: OPEN_ORDER_STATUSES }, ...EXCLUDE_UNPAID } }),
    db.order.count({ where: { ...todayWhere, status: "COMPLETED" } }),
    // o esquecimento mais comum do balcão: marcar esgotado e nunca religar
    db.product.count({ where: { ...escopo, available: false } }),
    // os campeões do mês, não de sempre: é o mês que diz o que comprar amanhã
    db.orderItem.groupBy({
      by: ["productName"],
      where: { order: { ...escopo, status: { not: "CANCELED" }, createdAt: { gte: startOfDaysAgo(30) } } },
      _sum: { quantity: true, totalCents: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    activationChecklist(restaurant.id),
    db.restaurant.findUniqueOrThrow({
      where: { id: restaurant.id },
      select: { openMode: true, openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } } },
    }),
  ]);

  const base = `/painel/${restaurant.id}`;
  const ticket = dia.hoje > 0 ? Math.round(dia.centavosHoje / dia.hoje) : 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{saudacao()}</h1>
          <p className="mt-1 text-muted">{restaurant.name}</p>
        </div>
        <Badge tone={restaurantStatusTone[restaurant.status]}>{restaurantStatusLabel[restaurant.status]}</Badge>
      </div>

      <StatusCard
        restaurantId={restaurant.id}
        slug={restaurant.slug}
        status={restaurant.status}
        checklist={checklist.items}
        ready={checklist.ready}
        viaAdmin={viaAdmin}
      />

      <OpenNowCard
        restaurantId={restaurant.id}
        open={isOpenNow(details.openMode, details.openingHours)}
        openMode={details.openMode}
        today={todayLabel(details.openingHours)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pedidos hoje"
          value={dia.hoje}
          icon={<ReceiptText />}
          href={`${base}/pedidos?ver=todos`}
          variacao={variacao(dia.hoje, dia.ontem)}
          hint={`Ontem, até agora: ${dia.ontem}`}
        />
        <StatCard label="Esperando você" value={inProgress} icon={<Clock />} href={`${base}/pedidos`} hint="Pedidos em andamento" />
        <StatCard label="Concluídos hoje" value={completedToday} icon={<CheckCircle2 />} href={`${base}/pedidos?ver=concluidos`} />
        <StatCard
          label="Vendido hoje"
          value={formatCents(dia.centavosHoje)}
          icon={<Wallet />}
          variacao={variacao(dia.centavosHoje, dia.centavosOntem)}
          hint={ticket > 0 ? `Ticket médio: ${formatCents(ticket)}` : `Ontem: ${formatCents(dia.centavosOntem)}`}
        />
      </div>

      <WeekChart dias={semana} titulo="Últimos sete dias" descricao="Quantos pedidos entraram em cada dia." />

      {esgotados > 0 && (
        <Card className="flex flex-wrap items-center gap-4 border-warning/40">
          <span className="grid size-11 shrink-0 place-items-center rounded-control bg-warning/15 text-warning">
            <PackageX className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">
              {esgotados} produto{esgotados === 1 ? "" : "s"} esgotado{esgotados === 1 ? "" : "s"}
            </p>
            <p className="text-sm text-muted">
              {esgotados === 1 ? "Ele não aparece" : "Eles não aparecem"} para o cliente. Chegou mercadoria? É só religar no cardápio.
            </p>
          </div>
          <Link href={`${base}/cardapio`} className={buttonClasses("secondary", "sm")}>
            Ver cardápio
          </Link>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold">Mais pedidos no mês</h2>
            <p className="text-sm text-muted">Os campeões dos últimos 30 dias.</p>
          </div>
          <TrendingUp className="size-5 text-faint" aria-hidden="true" />
        </div>
        {topProducts.length === 0 ? (
          <p className="mt-3 text-muted">Assim que chegarem os primeiros pedidos, os produtos mais vendidos aparecem aqui.</p>
        ) : (
          <ol className="mt-4 flex flex-col divide-y divide-line">
            {topProducts.map((p, i) => (
              <li key={p.productName} className="flex items-center justify-between gap-3 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={
                      i === 0
                        ? "grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-brand-ink"
                        : "grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-sm text-muted"
                    }
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 truncate font-semibold">{p.productName}</span>
                </span>
                <span className="shrink-0 text-right text-sm">
                  <span className="block font-extrabold tabular-nums">{p._sum.quantity ?? 0}x</span>
                  <span className="block text-muted tabular-nums">{formatCents(p._sum.totalCents ?? 0)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        <Link href={`${base}/cardapio`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">
          Ver o cardápio
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </Card>
    </div>
  );
}
