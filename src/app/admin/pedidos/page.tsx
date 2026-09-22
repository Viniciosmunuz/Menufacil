import { ChevronDown, ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
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
import { formatCents, formatDateTime, formatPhone } from "@/lib/format";
import { ORDER_STATUSES, isOrderStatus, orderStatusLabel, orderStatusTone, paymentStatusLabel } from "@/lib/labels";
import { requireAdmin } from "@/server/auth/dal";

import { OrderActions } from "./order-actions";

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
      select: {
        id: true,
        number: true,
        customerName: true,
        customerWhatsapp: true,
        type: true,
        status: true,
        notes: true,
        deliveryStreet: true,
        deliveryNumber: true,
        deliveryComplement: true,
        deliveryNeighborhood: true,
        deliveryReference: true,
        subtotalCents: true,
        deliveryFeeCents: true,
        totalCents: true,
        createdAt: true,
        restaurant: { select: { id: true, name: true } },
        items: { orderBy: { id: "asc" }, select: { id: true, productName: true, quantity: true, totalCents: true, notes: true } },
        payment: { select: { status: true } },
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
            {orders.map((o) => {
              const delivery = o.type === "DELIVERY";
              return (
                <li key={o.id}>
                  <details className="drawer group rounded-card border border-line bg-surface open:border-line-strong">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 rounded-card px-4 py-3 hover:bg-surface-2/60 sm:px-5 [&::-webkit-details-marker]:hidden">
                      <span className="w-16 font-extrabold tabular-nums">#{o.number}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{o.customerName}</span>
                        <span className="block truncate text-sm text-muted">
                          {o.restaurant.name} · {delivery ? "Entrega" : "Retirada"} · {formatDateTime(o.createdAt)}
                        </span>
                      </span>
                      <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</Badge>
                      <span className="w-24 text-right font-extrabold tabular-nums">{formatCents(o.totalCents)}</span>
                      <ChevronDown className="size-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                    </summary>

                    <div className="flex flex-col gap-5 border-t border-line px-4 py-4 sm:px-5">
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="flex flex-col gap-2">
                          <h3 className="text-sm font-bold text-muted">Itens</h3>
                          <ul className="flex flex-col gap-1.5 text-sm">
                            {o.items.map((i) => (
                              <li key={i.id} className="flex justify-between gap-3">
                                <span className="min-w-0">
                                  <span className="font-bold">{i.quantity}x</span> {i.productName}
                                  {i.notes && <span className="block text-muted">Obs.: {i.notes}</span>}
                                </span>
                                <span className="shrink-0 tabular-nums">{formatCents(i.totalCents)}</span>
                              </li>
                            ))}
                          </ul>
                          <dl className="flex flex-col gap-1 border-t border-line pt-2 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-muted">Subtotal</dt>
                              <dd className="tabular-nums">{formatCents(o.subtotalCents)}</dd>
                            </div>
                            {delivery && (
                              <div className="flex justify-between">
                                <dt className="text-muted">Taxa de entrega</dt>
                                <dd className="tabular-nums">{o.deliveryFeeCents > 0 ? formatCents(o.deliveryFeeCents) : "Grátis"}</dd>
                              </div>
                            )}
                            <div className="flex justify-between font-extrabold">
                              <dt>Total</dt>
                              <dd className="tabular-nums">{formatCents(o.totalCents)}</dd>
                            </div>
                          </dl>
                        </div>

                        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                          <div>
                            <dt className="font-bold text-muted">Cliente</dt>
                            <dd className="font-bold">{o.customerName}</dd>
                            <dd>
                              <a href={`https://wa.me/${o.customerWhatsapp}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                                {formatPhone(o.customerWhatsapp)}
                              </a>
                            </dd>
                          </div>
                          <div>
                            <dt className="font-bold text-muted">{delivery ? "Entrega em" : "Retirada"}</dt>
                            <dd>{delivery ? `${o.deliveryStreet}, ${o.deliveryNumber} - ${o.deliveryNeighborhood}` : "No restaurante"}</dd>
                            {o.deliveryComplement && <dd className="text-muted">{o.deliveryComplement}</dd>}
                            {o.deliveryReference && <dd className="text-muted">Ref.: {o.deliveryReference}</dd>}
                          </div>
                          <div>
                            <dt className="font-bold text-muted">Pagamento</dt>
                            <dd>Pix · {o.payment ? paymentStatusLabel[o.payment.status] : "sem registro"}</dd>
                          </div>
                          {o.notes && (
                            <div>
                              <dt className="font-bold text-muted">Observações</dt>
                              <dd>{o.notes}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      <OrderActions
                        order={{
                          id: o.id,
                          type: o.type,
                          status: o.status,
                          customerName: o.customerName,
                          customerWhatsapp: formatPhone(o.customerWhatsapp),
                          street: o.deliveryStreet ?? "",
                          number: o.deliveryNumber ?? "",
                          complement: o.deliveryComplement ?? "",
                          neighborhood: o.deliveryNeighborhood ?? "",
                          reference: o.deliveryReference ?? "",
                          notes: o.notes ?? "",
                        }}
                      />
                    </div>
                  </details>
                </li>
              );
            })}
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
