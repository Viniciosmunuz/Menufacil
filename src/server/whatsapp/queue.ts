import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus, WhatsAppMessageKind } from "@/generated/prisma/enums";

import { orderStatusUpdate, orderToRestaurant, paymentInstructions, type MessageContent } from "./messages";
import { activeProvider } from "./providers";

// Fila de saída (tabela WhatsAppMessage). Quem cria o pedido ou muda o
// status só grava aqui, dentro da mesma transação; o envio de verdade é do
// processador (processor.ts). Assim o pedido nunca depende da Meta estar no
// ar, e toda mensagem fica registrada com o resultado.

type Tx = Prisma.TransactionClient;

async function enqueue(
  tx: Tx,
  params: { restaurantId: string; orderId: string; kind: WhatsAppMessageKind; toPhone: string | null; content: MessageContent },
) {
  if (!params.toPhone) return null;
  const integration = await tx.whatsAppIntegration.findUnique({ where: { restaurantId: params.restaurantId } });
  const toRestaurant = params.kind === "ORDER_TO_RESTAURANT";
  if (integration && ((toRestaurant && !integration.notifyRestaurant) || (!toRestaurant && !integration.notifyCustomer))) {
    return null; // o restaurante desligou este aviso
  }
  return tx.whatsAppMessage.create({
    data: {
      restaurantId: params.restaurantId,
      orderId: params.orderId,
      kind: params.kind,
      provider: activeProvider(integration),
      toPhone: params.toPhone,
      body: params.content.body,
      templateName: params.content.templateName,
      templateParams: params.content.templateParams,
    },
  });
}

type OrderRow = Parameters<typeof orderToRestaurant>[0] & { restaurantId: string };
type RestaurantRow = Parameters<typeof orderToRestaurant>[1] & { whatsapp: string | null };

/** pedido novo: aviso para o restaurante e instruções do Pix para o cliente */
export async function queueNewOrderMessages(tx: Tx, { order, restaurant }: { order: OrderRow; restaurant: RestaurantRow }) {
  await enqueue(tx, {
    restaurantId: restaurant.id,
    orderId: order.id,
    kind: "ORDER_TO_RESTAURANT",
    toPhone: restaurant.whatsapp,
    content: orderToRestaurant(order, restaurant),
  });
  await enqueue(tx, {
    restaurantId: restaurant.id,
    orderId: order.id,
    kind: "PAYMENT_INSTRUCTIONS",
    toPhone: order.customerWhatsapp,
    content: paymentInstructions(order, restaurant),
  });
}

/** status que valem aviso para o cliente */
export const NOTIFY_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"];

export async function queueStatusMessage(
  tx: Tx,
  params: {
    order: { id: string; restaurantId: string; number: number; code: string; customerName: string; customerWhatsapp: string; type: "DELIVERY" | "PICKUP" };
    restaurant: { name: string };
    status: OrderStatus;
  },
) {
  if (!NOTIFY_STATUSES.includes(params.status)) return null;
  return enqueue(tx, {
    restaurantId: params.order.restaurantId,
    orderId: params.order.id,
    kind: "ORDER_STATUS",
    toPhone: params.order.customerWhatsapp,
    content: orderStatusUpdate(params.order, params.restaurant, params.status),
  });
}
