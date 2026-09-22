import "server-only";

import { after } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import { paymentInstructions } from "./messages";
import { processWhatsAppQueue } from "./processor";
import { queueOrderToRestaurant, queueStatusMessage } from "./queue";
import { activeProvider } from "./providers";

// Porta de entrada do WhatsApp para o resto do sistema.
//
//   pedido/status  ->  fila (WhatsAppMessage)  ->  processador  ->  provedor
//   (criação)          (registro)                  (envio)          (mock ou Cloud API)
//
// Os métodos daqui colocam a mensagem na fila e agendam o envio para logo
// depois da resposta (after), sem deixar o cliente esperando a Meta. Um cron
// (/api/whatsapp/processar) pega o que ficou para trás e as novas tentativas.

/** envia o que está na fila assim que a resposta sair */
export function scheduleWhatsAppDelivery(orderId?: string) {
  after(async () => {
    try {
      await processWhatsAppQueue({ orderId, limit: 10 });
    } catch (error) {
      console.error("[whatsapp] falha ao processar a fila:", error);
    }
  });
}

async function loadOrder(orderId: string, client: Prisma.TransactionClient = db) {
  return client.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: { select: { productName: true, optionsText: true, quantity: true, totalCents: true, notes: true } },
      payment: { select: { cardType: true, changeForCents: true } },
      restaurant: {
        select: {
          id: true,
          name: true,
          whatsapp: true,
          pixKey: true,
          pixKeyType: true,
          pixHolderName: true,
          paymentInstructions: true,
          whatsappIntegration: true,
        },
      },
    },
  });
}

export const WhatsAppService = {
  /** "NOVO PEDIDO #..." para o restaurante, uma vez por pedido */
  async sendOrderMessage(orderId: string) {
    const queued = await db.$transaction(async (tx) => {
      // trava o pedido: dois toques ao mesmo tempo não geram duas mensagens
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      const already = await tx.whatsAppMessage.findFirst({ where: { orderId, kind: "ORDER_TO_RESTAURANT" }, select: { id: true } });
      if (already) return false;
      const order = await loadOrder(orderId, tx);
      return !!(await queueOrderToRestaurant(tx, { order, restaurant: order.restaurant }));
    });
    if (queued) scheduleWhatsAppDelivery(orderId);
  },

  /** chave Pix e valor para o cliente pagar */
  async sendPaymentInstructions(orderId: string) {
    const order = await loadOrder(orderId);
    const content = paymentInstructions(order, order.restaurant);
    await db.whatsAppMessage.create({
      data: {
        restaurantId: order.restaurantId,
        orderId,
        kind: "PAYMENT_INSTRUCTIONS",
        provider: activeProvider(order.restaurant.whatsappIntegration),
        toPhone: order.customerWhatsapp,
        body: content.body,
        templateName: content.templateName,
        templateParams: content.templateParams,
      },
    });
    scheduleWhatsAppDelivery(orderId);
  },

  /** aviso de mudança de status para o cliente */
  async sendOrderStatus(orderId: string, status: OrderStatus) {
    const order = await loadOrder(orderId);
    await queueStatusMessage(db, { order, restaurant: order.restaurant, status });
    scheduleWhatsAppDelivery(orderId);
  },
};
