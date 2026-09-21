import { CheckCircle2, Clock, ReceiptText, Wallet } from "lucide-react";
import type { Metadata } from "next";

import { StatCard } from "@/components/panel/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { OPEN_ORDER_STATUSES, restaurantStatusLabel, restaurantStatusTone } from "@/lib/labels";
import { requireRestaurantAccess } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Início" };

export default async function RestaurantDashboardPage({ params }: PageProps<"/painel/[restaurantId]">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayWhere = { restaurantId: restaurant.id, createdAt: { gte: today } };

  const [ordersToday, inProgress, completedToday, soldToday, topProducts] = await Promise.all([
    db.order.count({ where: { ...todayWhere, status: { not: "CANCELED" } } }),
    db.order.count({ where: { restaurantId: restaurant.id, status: { in: OPEN_ORDER_STATUSES } } }),
    db.order.count({ where: { ...todayWhere, status: "COMPLETED" } }),
    db.order.aggregate({ _sum: { totalCents: true }, where: { ...todayWhere, status: { not: "CANCELED" } } }),
    db.orderItem.groupBy({
      by: ["productName"],
      where: { order: { restaurantId: restaurant.id, status: { not: "CANCELED" } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Olá! Aqui está o seu dia.</h1>
          <p className="mt-1 text-muted">{restaurant.name}</p>
        </div>
        <Badge tone={restaurantStatusTone[restaurant.status]}>{restaurantStatusLabel[restaurant.status]}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pedidos hoje" value={ordersToday} icon={<ReceiptText />} />
        <StatCard label="Em andamento" value={inProgress} icon={<Clock />} />
        <StatCard label="Concluídos hoje" value={completedToday} icon={<CheckCircle2 />} />
        <StatCard label="Vendido hoje" value={formatCents(soldToday._sum.totalCents ?? 0)} icon={<Wallet />} />
      </div>

      <Card>
        <h2 className="text-lg font-extrabold">Mais pedidos</h2>
        {topProducts.length === 0 ? (
          <p className="mt-2 text-muted">Os produtos mais pedidos aparecem aqui assim que chegarem os primeiros pedidos.</p>
        ) : (
          <ol className="mt-4 flex flex-col divide-y divide-line">
            {topProducts.map((p, i) => (
              <li key={p.productName} className="flex items-center justify-between gap-4 py-3">
                <span className="flex items-center gap-3 font-semibold">
                  <span className="grid size-7 place-items-center rounded-full bg-surface-3 text-sm text-muted">{i + 1}</span>
                  {p.productName}
                </span>
                <span className="text-muted tabular-nums">{p._sum.quantity ?? 0} vendidos</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
