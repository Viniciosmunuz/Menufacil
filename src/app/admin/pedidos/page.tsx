import { ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatCents, formatDateTime } from "@/lib/format";
import { ORDER_STATUSES, isOrderStatus, orderStatusLabel, orderStatusTone } from "@/lib/labels";
import { requireAdmin } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Pedidos" };

const PAGE_SIZE = 30;

// Todos os pedidos da plataforma, de todos os restaurantes. O atendimento
// de cada pedido acontece no painel do restaurante.
export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  await requireAdmin();
  const sp = await searchParams;
  const restaurantId = typeof sp.restaurante === "string" && sp.restaurante ? sp.restaurante : null;
  const status = isOrderStatus(sp.status) ? sp.status : null;
  const page = Math.max(1, Number.parseInt(typeof sp.pagina === "string" ? sp.pagina : "1", 10) || 1);

  const where: Prisma.OrderWhereInput = {
    ...(restaurantId ? { restaurantId } : {}),
    ...(status ? { status } : {}),
  };

  const [orders, total, restaurants] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        number: true,
        customerName: true,
        type: true,
        status: true,
        totalCents: true,
        createdAt: true,
        restaurant: { select: { id: true, name: true } },
      },
    }),
    db.order.count({ where }),
    db.restaurant.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (restaurantId) params.set("restaurante", restaurantId);
    if (status) params.set("status", status);
    if (p > 1) params.set("pagina", String(p));
    const qs = params.toString();
    return `/admin/pedidos${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pedidos" description="Todos os pedidos da plataforma. O atendimento acontece no painel de cada restaurante." />

      <form className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Select name="restaurante" defaultValue={restaurantId ?? ""} aria-label="Restaurante">
          <option value="">Todos os restaurantes</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={status ?? ""} aria-label="Status">
          <option value="">Todos os status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {orderStatusLabel[s]}
            </option>
          ))}
        </Select>
        <SubmitButton variant="secondary" pendingText="Filtrando...">
          Filtrar
        </SubmitButton>
      </form>

      {orders.length === 0 ? (
        <EmptyState icon={<ReceiptText />} title="Nenhum pedido encontrado">
          {restaurantId || status ? "Tente outro filtro." : "Os pedidos feitos pelos clientes aparecem aqui."}
        </EmptyState>
      ) : (
        <>
          <p className="text-sm text-muted">
            {total} pedido{total === 1 ? "" : "s"}
          </p>
          <ul className="flex flex-col gap-2">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/painel/${o.restaurant.id}/pedidos/${o.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-line bg-surface px-4 py-3 hover:border-line-strong sm:px-5"
                >
                  <span className="w-16 font-extrabold tabular-nums">#{o.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{o.customerName}</span>
                    <span className="block truncate text-sm text-muted">
                      {o.restaurant.name} · {o.type === "DELIVERY" ? "Entrega" : "Retirada"} · {formatDateTime(o.createdAt)}
                    </span>
                  </span>
                  <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</Badge>
                  <span className="w-24 text-right font-extrabold tabular-nums">{formatCents(o.totalCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav className="flex items-center justify-between gap-2" aria-label="Páginas">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className={buttonClasses("secondary", "sm")}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Anteriores
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-muted">
                Página {page} de {pages}
              </span>
              {page < pages ? (
                <Link href={pageHref(page + 1)} className={buttonClasses("secondary", "sm")}>
                  Próximos
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
