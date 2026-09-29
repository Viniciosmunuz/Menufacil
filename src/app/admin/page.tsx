import { ChevronRight, Crown, MessageSquareText, Moon, ReceiptText, Store, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SectionTitle } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
import { WeekChart } from "@/components/panel/week-chart";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatCents, formatWhen, startOfDaysAgo } from "@/lib/format";
import { restaurantStatusLabel, restaurantStatusTone } from "@/lib/labels";
import { requireAdmin } from "@/server/auth/dal";
import { hojeContraOntem, semanaDePedidos, variacao } from "@/server/stats";

export const metadata: Metadata = { title: "Visão geral" };

/** quantos dias parado já contam como "sumiu" */
const DIAS_PARADO = 7;

export default async function AdminOverviewPage() {
  await requireAdmin();
  const mes = startOfDaysAgo(30);

  const [dia, semana, active, inSetup, openLeads, attention, ranking, ativos] = await Promise.all([
    hojeContraOntem(),
    semanaDePedidos(),
    db.restaurant.count({ where: { status: "ACTIVE" } }),
    db.restaurant.count({ where: { status: { in: ["DRAFT", "PENDING_REVIEW"] } } }),
    db.restaurantLead.count({ where: { handled: false } }),
    // aguardando aprovação primeiro, depois os em implantação mais recentes
    db.restaurant.findMany({
      where: { status: { in: ["PENDING_REVIEW", "DRAFT"] } },
      orderBy: [{ status: "desc" }, { updatedAt: "desc" }],
      take: 6,
      select: { id: true, name: true, city: true, status: true, _count: { select: { products: true } } },
    }),
    // quem mais vendeu no mês: é isso que diz onde a plataforma está de pé
    db.order.groupBy({
      by: ["restaurantId"],
      where: { status: { not: "CANCELED" }, createdAt: { gte: mes } },
      _count: { _all: true },
      _sum: { totalCents: true },
      orderBy: { _sum: { totalCents: "desc" } },
      take: 5,
    }),
    // no ar, com a data do último pedido: quem parou precisa de uma ligação
    db.restaurant.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        city: true,
        orders: { where: { status: { not: "CANCELED" } }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
  ]);

  // o ranking pode trazer restaurante que já saiu do ar: os nomes vêm dos
  // ids que ele devolveu, não só dos que estão ativos agora
  const doRanking = await db.restaurant.findMany({
    where: { id: { in: ranking.map((r) => r.restaurantId) } },
    select: { id: true, name: true },
  });
  const nomes = new Map(doRanking.map((r) => [r.id, r.name]));
  const limite = startOfDaysAgo(DIAS_PARADO).getTime();
  const parados = ativos
    .map((r) => ({ id: r.id, name: r.name, city: r.city, ultimo: r.orders[0]?.createdAt ?? null }))
    .filter((r) => !r.ultimo || r.ultimo.getTime() < limite)
    .sort((a, b) => (a.ultimo?.getTime() ?? 0) - (b.ultimo?.getTime() ?? 0));

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
        <StatCard label="Restaurantes ativos" value={active} icon={<Store />} href="/admin/restaurantes?status=ACTIVE" hint={`${inSetup} em implantação`} />
        <StatCard
          label="Pedidos hoje"
          value={dia.hoje}
          icon={<ReceiptText />}
          href="/admin/pedidos"
          variacao={variacao(dia.hoje, dia.ontem)}
          hint={`Ontem, até agora: ${dia.ontem}`}
        />
        <StatCard
          label="Vendido hoje"
          value={formatCents(dia.centavosHoje)}
          icon={<Wallet />}
          variacao={variacao(dia.centavosHoje, dia.centavosOntem)}
          hint="Soma de todos os restaurantes"
        />
        <StatCard
          label="Contatos novos"
          value={openLeads}
          icon={<MessageSquareText />}
          href="/admin/contatos"
          hint="Restaurantes interessados"
        />
      </div>

      <WeekChart dias={semana} titulo="Últimos sete dias" descricao="Pedidos de toda a plataforma, dia a dia." />

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

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Crown className="size-5 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-extrabold">Quem mais vendeu</h2>
              <p className="text-sm text-muted">Nos últimos 30 dias.</p>
            </div>
          </div>
          {ranking.length === 0 ? (
            <p className="mt-3 text-muted">Nenhum pedido no período.</p>
          ) : (
            <ol className="mt-4 flex flex-col divide-y divide-line">
              {ranking.map((r, i) => (
                <li key={r.restaurantId} className="flex items-center justify-between gap-3 py-3">
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
                    <Link href={`/admin/restaurantes/${r.restaurantId}`} className="min-w-0 truncate font-semibold hover:text-brand">
                      {nomes.get(r.restaurantId) ?? "Restaurante removido"}
                    </Link>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block font-extrabold tabular-nums">{formatCents(r._sum.totalCents ?? 0)}</span>
                    <span className="block text-muted tabular-nums">{r._count._all} pedidos</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className={parados.length > 0 ? "border-warning/40" : undefined}>
          <div className="flex items-center gap-2">
            <Moon className={parados.length > 0 ? "size-5 shrink-0 text-warning" : "size-5 shrink-0 text-faint"} aria-hidden="true" />
            <div>
              <h2 className="text-lg font-extrabold">Parados</h2>
              <p className="text-sm text-muted">No ar, mas sem pedido há mais de {DIAS_PARADO} dias.</p>
            </div>
          </div>
          {parados.length === 0 ? (
            <p className="mt-3 text-muted">Nenhum. Todos os restaurantes no ar venderam esta semana.</p>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {parados.slice(0, 6).map((r) => (
                <li key={r.id} className="py-3">
                  <Link href={`/admin/restaurantes/${r.id}`} className="group flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold group-hover:text-brand">{r.name}</span>
                      <span className="block truncate text-sm text-muted">{r.city ?? "Cidade não informada"}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm text-muted">
                      {r.ultimo ? `Último: ${formatWhen(r.ultimo)}` : "Nunca vendeu"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
