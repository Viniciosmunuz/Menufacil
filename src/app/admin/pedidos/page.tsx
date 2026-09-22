import { ChevronLeft, ChevronRight, ExternalLink, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { OrderActions } from "@/components/panel/order-actions";
import { OrderStepActions } from "@/components/panel/order-step-actions";
import { OrderDrawer, editableOrder, orderSummarySelect } from "@/components/panel/order-summary";
import { PageHeader } from "@/components/panel/page-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { ORDER_STATUSES, isOrderStatus, orderStatusLabel } from "@/lib/labels";
import { requireAdmin } from "@/server/auth/dal";

import { deleteOrder, stepOrder, updateOrder } from "./actions";

export const metadata: Metadata = { title: "Pedidos" };

const PAGE_SIZE = 30;

// Todos os pedidos da plataforma, de todos os restaurantes. Cada linha abre
// como gaveta com os detalhes, e o admin pode editar ou excluir o pedido.
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
      select: { ...orderSummarySelect, restaurant: { select: { id: true, name: true } } },
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
      <PageHeader title="Pedidos" description="Todos os pedidos da plataforma. Toque em um pedido para ver os detalhes, editar ou excluir." />

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
                <OrderDrawer
                  order={o}
                  subtitle={`${o.restaurant.name} · ${o.type === "DELIVERY" ? "Entrega" : "Retirada"} · ${formatDateTime(o.createdAt)}`}
                >
                  <OrderStepActions order={o} action={stepOrder} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <OrderActions order={editableOrder(o)} updateAction={updateOrder} deleteAction={deleteOrder} />
                    <Link href={`/painel/${o.restaurant.id}/pedidos/${o.id}`} className={buttonClasses("ghost", "sm")}>
                      <ExternalLink className="size-4" aria-hidden="true" />
                      Abrir no painel do restaurante
                    </Link>
                  </div>
                </OrderDrawer>
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
