import { MessageSquareText, ReceiptText, Store, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatCard } from "@/components/panel/stat-card";
import { buttonClasses } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { requireAdmin } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Visão geral" };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const today = startOfToday();

  const [active, inSetup, ordersToday, revenueToday, openLeads] = await Promise.all([
    db.restaurant.count({ where: { status: "ACTIVE" } }),
    db.restaurant.count({ where: { status: { in: ["DRAFT", "PENDING_REVIEW"] } } }),
    db.order.count({ where: { createdAt: { gte: today }, status: { not: "CANCELED" } } }),
    db.order.aggregate({
      _sum: { totalCents: true },
      where: { createdAt: { gte: today }, status: { not: "CANCELED" } },
    }),
    db.restaurantLead.count({ where: { handled: false } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Visão geral</h1>
          <p className="mt-1 text-muted">Como a plataforma está hoje.</p>
        </div>
        <Link href="/admin/restaurantes/novo" className={buttonClasses("primary")}>
          Novo restaurante
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Restaurantes ativos" value={active} icon={<Store />} hint={`${inSetup} em implantação`} />
        <StatCard label="Pedidos hoje" value={ordersToday} icon={<ReceiptText />} />
        <StatCard label="Vendido hoje" value={formatCents(revenueToday._sum.totalCents ?? 0)} icon={<Wallet />} hint="Soma de todos os restaurantes" />
        <StatCard label="Contatos novos" value={openLeads} icon={<MessageSquareText />} hint="Restaurantes interessados" />
      </div>
    </div>
  );
}
