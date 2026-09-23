import { ChevronLeft, ChevronRight, ExternalLink, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { OrderActions } from "@/components/panel/order-actions";
import { OrderStepActions } from "@/components/panel/order-step-actions";
import { OrderDrawer, editableOrder, orderSummarySelect } from "@/components/panel/order-summary";
import { PageHeader } from "@/components/panel/page-header";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { OrderStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { nextStatusNotice } from "@/server/whatsapp/messages";
import { formatDateTime } from "@/lib/format";
import { OPEN_ORDER_STATUSES } from "@/lib/labels";
import { requireRestaurantAccess } from "@/server/auth/dal";

import { stepRestaurantOrder, updateRestaurantOrder } from "./actions";

export const metadata: Metadata = { title: "Pedidos" };

const PAGE_SIZE = 30;

const FILTERS = {
  andamento: { label: "Em andamento", statuses: OPEN_ORDER_STATUSES, empty: "Nenhum pedido esperando você agora." },
  concluidos: { label: "Concluídos", statuses: ["COMPLETED"] as OrderStatus[], empty: "Nenhum pedido concluído ainda." },
  cancelados: { label: "Cancelados", statuses: ["CANCELED"] as OrderStatus[], empty: "Nenhum pedido cancelado." },
  todos: { label: "Todos", statuses: null, empty: "Os pedidos feitos pelos clientes aparecem aqui." },
} as const;
type FilterKey = keyof typeof FILTERS;
const isFilter = (v: unknown): v is FilterKey => typeof v === "string" && v in FILTERS;

// Pedidos do restaurante: cada um abre como gaveta, com o próximo passo do
// atendimento à mão. A página se atualiza sozinha para mostrar pedido novo.
export default async function RestaurantOrdersPage({ params, searchParams }: PageProps<"/painel/[restaurantId]/pedidos">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  const sp = await searchParams;
  const filter: FilterKey = isFilter(sp.ver) ? sp.ver : "andamento";
  const page = Math.max(1, Number.parseInt(typeof sp.pagina === "string" ? sp.pagina : "1", 10) || 1);
  const statuses = FILTERS[filter].statuses;
  const where = { restaurantId: restaurant.id, ...(statuses ? { status: { in: [...statuses] } } : {}) };

  const [orders, total, byStatus] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: orderSummarySelect }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], where: { restaurantId: restaurant.id }, _count: { _all: true } }),
  ]);

  const countOf = (key: FilterKey) => {
    const list = FILTERS[key].statuses;
    return byStatus.filter((g) => !list || (list as readonly OrderStatus[]).includes(g.status)).reduce((sum, g) => sum + g._count._all, 0);
  };
  const base = `/painel/${restaurant.id}/pedidos`;
  const href = (key: FilterKey, p = 1) => {
    const qs = new URLSearchParams();
    if (key !== "andamento") qs.set("ver", key);
    if (p > 1) qs.set("pagina", String(p));
    const s = qs.toString();
    return s ? `${base}?${s}` : base;
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hidden = { restaurantId: restaurant.id };

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={30} />
      <PageHeader title="Pedidos" description="Toque em um pedido para ver os detalhes e seguir o atendimento." />

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="Filtrar pedidos">
        {(Object.keys(FILTERS) as FilterKey[]).map((key) => (
          <Link
            key={key}
            href={href(key)}
            aria-current={key === filter ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold",
              key === filter ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
            )}
          >
            {FILTERS[key].label}
            <span className="tabular-nums opacity-80">{countOf(key)}</span>
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState icon={<ReceiptText />} title="Nada por aqui">
          {FILTERS[filter].empty}
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {orders.map((o) => (
              <li key={o.id}>
                <OrderDrawer order={o} subtitle={`${o.type === "DELIVERY" ? "Entrega" : "Retirada"} · ${formatDateTime(o.createdAt)}`}>
                  <OrderStepActions order={o} action={stepRestaurantOrder} hidden={hidden} notifyHref={nextStatusNotice(o, restaurant)} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <OrderActions order={editableOrder(o)} updateAction={updateRestaurantOrder} hidden={hidden} />
                    <Link href={`${base}/${o.id}`} className={buttonClasses("ghost", "sm")}>
                      <ExternalLink className="size-4" aria-hidden="true" />
                      Abrir pedido
                    </Link>
                  </div>
                </OrderDrawer>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav className="flex items-center justify-between gap-2" aria-label="Páginas">
              {page > 1 ? (
                <Link href={href(filter, page - 1)} className={buttonClasses("secondary", "sm")}>
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
                <Link href={href(filter, page + 1)} className={buttonClasses("secondary", "sm")}>
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
