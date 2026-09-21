import { ChevronRight, Plus, Search, Star, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import type { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { RESTAURANT_STATUSES, isRestaurantStatus, restaurantStatusLabel, restaurantStatusTone } from "@/lib/labels";
import { requireAdmin } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Restaurantes" };

export default async function AdminRestaurantsPage({ searchParams }: PageProps<"/admin/restaurantes">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const status = isRestaurantStatus(sp.status) ? sp.status : null;

  const where: Prisma.RestaurantWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { slug: { contains: q.toLowerCase() } },
            { owners: { some: { user: { email: { contains: q, mode: "insensitive" } } } } },
          ],
        }
      : {}),
  };

  const [restaurants, grouped] = await Promise.all([
    db.restaurant.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        status: true,
        featured: true,
        owners: { select: { user: { select: { email: true } } }, take: 2 },
        _count: { select: { products: true, orders: true } },
      },
    }),
    db.restaurant.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countBy = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);

  const tabHref = (s: string | null) => {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/admin/restaurantes${qs ? `?${qs}` : ""}`;
  };

  const tabs = [
    { key: null, label: "Todos", count: total },
    ...RESTAURANT_STATUSES.map((s) => ({ key: s, label: restaurantStatusLabel[s], count: countBy[s] ?? 0 })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Restaurantes"
        description="Cadastre, implante e libere os restaurantes da plataforma."
        actions={
          <Link href="/admin/restaurantes/novo" className={buttonClasses("primary")}>
            <Plus className="size-4" aria-hidden="true" />
            Novo restaurante
          </Link>
        }
      />

      <form className="relative" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-faint" aria-hidden="true" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome, cidade ou e-mail do dono"
          aria-label="Buscar restaurantes"
          className="pl-12"
        />
      </form>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filtrar por status">
        {tabs.map((t) => {
          const active = t.key === status;
          return (
            <Link
              key={t.key ?? "all"}
              href={tabHref(t.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold",
                active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted hover:text-ink",
              )}
            >
              {t.label}
              <span className="tabular-nums opacity-70">{t.count}</span>
            </Link>
          );
        })}
      </nav>

      {restaurants.length === 0 ? (
        <EmptyState icon={<Store />} title={q || status ? "Nenhum restaurante encontrado" : "Nenhum restaurante ainda"}>
          {q || status ? "Tente outra busca ou outro filtro." : "Cadastre o primeiro restaurante para começar a implantação."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {restaurants.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/restaurantes/${r.id}`}
                className="group flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-4 hover:border-line-strong sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-extrabold">{r.name}</span>
                    {r.featured && (
                      <Star className="size-4 fill-brand text-brand" aria-label="Em destaque" />
                    )}
                    <Badge tone={restaurantStatusTone[r.status]}>{restaurantStatusLabel[r.status]}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">
                    {[r.city, r.state].filter(Boolean).join(" - ") || "Cidade não informada"}
                    {" · "}
                    {r.owners.length ? r.owners.map((o) => o.user.email).join(", ") : "sem dono ainda"}
                  </p>
                </div>
                <div className="hidden shrink-0 gap-6 text-right text-sm sm:flex">
                  <div>
                    <p className="font-extrabold tabular-nums">{r._count.products}</p>
                    <p className="text-faint">produtos</p>
                  </div>
                  <div>
                    <p className="font-extrabold tabular-nums">{r._count.orders}</p>
                    <p className="text-faint">pedidos</p>
                  </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-faint group-hover:text-ink" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
