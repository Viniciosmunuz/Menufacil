import { ChevronRight, MessageSquareText, ReceiptText, Store, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SectionTitle } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatCents, startOfToday } from "@/lib/format";
import { restaurantStatusLabel, restaurantStatusTone } from "@/lib/labels";
import { requireAdmin } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Visão geral" };

export default async function AdminOverviewPage() {
  await requireAdmin();
  const today = startOfToday();

  const [active, inSetup, ordersToday, revenueToday, openLeads, attention] = await Promise.all([
    db.restaurant.count({ where: { status: "ACTIVE" } }),
    db.restaurant.count({ where: { status: { in: ["DRAFT", "PENDING_REVIEW"] } } }),
    db.order.count({ where: { createdAt: { gte: today }, status: { not: "CANCELED" } } }),
    db.order.aggregate({
      _sum: { totalCents: true },
      where: { createdAt: { gte: today }, status: { not: "CANCELED" } },
    }),
    db.restaurantLead.count({ where: { handled: false } }),
    // aguardando aprovação primeiro, depois os em implantação mais recentes
    db.restaurant.findMany({
      where: { status: { in: ["PENDING_REVIEW", "DRAFT"] } },
      orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
      take: 6,
      select: { id: true, name: true, city: true, status: true, _count: { select: { products: true } } },
    }),
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Restaurantes ativos" value={active} icon={<Store />} hint={`${inSetup} em implantação`} />
        <StatCard label="Pedidos hoje" value={ordersToday} icon={<ReceiptText />} />
        <StatCard label="Vendido hoje" value={formatCents(revenueToday._sum.totalCents ?? 0)} icon={<Wallet />} hint="Soma de todos os restaurantes" />
        <StatCard label="Contatos novos" value={openLeads} icon={<MessageSquareText />} hint="Restaurantes interessados" />
      </div>

      {attention.length > 0 && (
        <section>
          <SectionTitle description="Aguardando aprovação ou ainda em implantação.">Precisa de atenção</SectionTitle>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {attention.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/restaurantes/${r.id}`}
                  className="group flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 hover:border-line-strong"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold">{r.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {r.city ?? "Cidade não informada"} · {r._count.products} produto{r._count.products === 1 ? "" : "s"}
                    </span>
                  </span>
                  <Badge tone={restaurantStatusTone[r.status]}>{restaurantStatusLabel[r.status]}</Badge>
                  <ChevronRight className="size-5 shrink-0 text-faint group-hover:text-ink" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
