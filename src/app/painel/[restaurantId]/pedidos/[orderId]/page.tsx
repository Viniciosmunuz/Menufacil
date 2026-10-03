import { ExternalLink, MessagesSquare, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderActions } from "@/components/panel/order-actions";
import { OrderStepActions } from "@/components/panel/order-step-actions";
import { OrderSummary, editableOrder, orderSummarySelect } from "@/components/panel/order-summary";
import { PageHeader, SectionTitle } from "@/components/panel/page-header";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { nextStatusNotice } from "@/server/whatsapp/messages";
import { formatDateTime } from "@/lib/format";
import { orderStatusLabel, orderStatusTone } from "@/lib/labels";
import { FINAL_ORDER_STATUSES, isFullDelivery } from "@/lib/order-flow";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { conversaDoPedido } from "@/server/chat/chat";

import { stepRestaurantOrder, updateRestaurantOrder } from "../actions";
import { ChatDoPedido } from "./chat-card";

export const metadata: Metadata = { title: "Pedido", robots: { index: false, follow: false } };

// Um pedido do restaurante: é para cá que aponta o "Ver no painel" da
// mensagem de WhatsApp de pedido novo.
export default async function RestaurantOrderPage({ params }: PageProps<"/painel/[restaurantId]/pedidos/[orderId]">) {
  const { restaurantId, orderId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);

  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId: restaurant.id },
    select: {
      ...orderSummarySelect,
      code: true,
      statusEvents: {
        orderBy: { createdAt: "asc" },
        select: { id: true, status: true, note: true, createdAt: true, changedBy: { select: { name: true } } },
      },
    },
  });
  if (!order) notFound();

  const final = FINAL_ORDER_STATUSES.includes(order.status);
  const hidden = { restaurantId: restaurant.id };
  // a conversa existe só no 100% Delivery: é ela que substitui o WhatsApp
  const conversa = isFullDelivery(order.origin) ? await conversaDoPedido(order.id) : null;

  return (
    <div className="flex flex-col gap-6">
      {!final && <AutoRefresh seconds={30} />}
      <PageHeader
        back={{ href: `/painel/${restaurant.id}/pedidos`, label: "Pedidos" }}
        title={`Pedido #${order.number}`}
        description={`${order.customerName} · ${order.type === "DELIVERY" ? "Entrega" : "Retirada"} · ${formatDateTime(order.createdAt)}`}
        actions={
          <Badge tone={orderStatusTone[order.status]} className="h-8 px-4 text-sm">
            {orderStatusLabel[order.status]}
          </Badge>
        }
      />

      <Card>
        <SectionTitle
          description={
            final
              ? undefined
              : conversa
                ? "Cada passo que você toca aqui aparece na tela do cliente na hora. Ele não precisa de aviso nenhum por fora."
                : "Aceitar o pedido abre o WhatsApp com o aviso e o link de acompanhamento para o cliente."
          }
        >
          Atendimento
        </SectionTitle>
        {final ? (
          <p className="text-muted">{order.status === "CANCELED" ? "Este pedido foi cancelado." : "Pedido concluído."}</p>
        ) : (
          <OrderStepActions order={order} action={stepRestaurantOrder} hidden={hidden} size="md" notify={nextStatusNotice(order, restaurant)} />
        )}
      </Card>

      <Card>
        <OrderSummary order={order} />
      </Card>

      {conversa && (
        <Card id="conversa" className="scroll-mt-4">
          <SectionTitle
            description="Amarrada a este pedido. O cliente vê e responde na mesma tela em que acompanha o andamento."
          >
            <span className="flex flex-wrap items-center gap-2">
              <MessagesSquare className="size-5 text-brand" aria-hidden="true" />
              Conversa com {order.customerName}
              {conversa.naoLidasDoRestaurante > 0 && (
                <Badge tone="brand">
                  {conversa.naoLidasDoRestaurante === 1 ? "1 nova" : `${conversa.naoLidasDoRestaurante} novas`}
                </Badge>
              )}
            </span>
          </SectionTitle>
          <ChatDoPedido
            restaurantId={restaurant.id}
            orderId={order.id}
            mensagens={conversa.mensagens.map((m) => ({ ...m, em: m.em.toISOString() }))}
            naoLidas={conversa.naoLidasDoRestaurante}
            fechada={final}
          />
        </Card>
      )}

      <Card>
        <SectionTitle>Histórico</SectionTitle>
        <ol className="flex flex-col gap-3 text-sm">
          {order.statusEvents.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3 last:border-0 last:pb-0">
              <span>
                <span className="font-bold">{orderStatusLabel[e.status]}</span>
                {(e.note || e.changedBy) && (
                  <span className="text-muted">
                    {" · "}
                    {[e.note, e.changedBy?.name].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              <span className="text-faint tabular-nums">{formatDateTime(e.createdAt)}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <OrderActions order={editableOrder(order)} updateAction={updateRestaurantOrder} hidden={hidden} />
        <span className="flex flex-wrap items-center gap-2">
          <a
            href={`/painel/${restaurant.id}/pedidos/${order.id}/via`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("secondary", "sm")}
          >
            <Printer className="size-4" aria-hidden="true" />
            Imprimir via
          </a>
          <Link href={`/pedido/${order.code}`} target="_blank" className={buttonClasses("ghost", "sm")}>
            <ExternalLink className="size-4" aria-hidden="true" />
            Ver como o cliente vê
          </Link>
        </span>
      </div>
    </div>
  );
}
