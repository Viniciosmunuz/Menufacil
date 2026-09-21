import "server-only";

import { after } from "next/server";

import type { OrderStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import { orderToRestaurant, paymentInstructions } from "./messages";
import { processWhatsAppQueue } from "./processor";
import { queueStatusMessage } from "./queue";
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

async function loadOrder(orderId: string) {
  return db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: { select: { productName: true, quantity: true, totalCents: true, notes: true } },
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
  /** "NOVO PEDIDO #..." para o restaurante (o pedido novo já faz isso; aqui é o reenvio) */
  async sendOrderMessage(orderId: string) {
    const order = await loadOrder(orderId);
    if (!order.restaurant.whatsapp) throw new Error("O restaurante não tem WhatsApp cadastrado.");
    const content = orderToRestaurant(order, order.restaurant);
    await db.whatsAppMessage.create({
      data: {
        restaurantId: order.restaurantId,
        orderId,
        kind: "ORDER_TO_RESTAURANT",
        provider: activeProvider(order.restaurant.whatsappIntegration),
        toPhone: order.restaurant.whatsapp,
        body: content.body,
        templateName: content.templateName,
        templateParams: content.templateParams,
      },
    });
    scheduleWhatsAppDelivery(orderId);
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
