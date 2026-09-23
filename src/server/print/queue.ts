import "server-only";

import { db } from "@/lib/db";
import { OPEN_ORDER_STATUSES } from "@/lib/labels";
import { ticketLines, ticketText } from "@/lib/ticket";

// A fila do Print Fácil: os pedidos que ainda não saíram no papel daquele
// restaurante. O "printedAt" é a trava contra imprimir duas vezes — o
// programa só marca depois que a impressora aceitou a via.

/** pedido velho não sai do nada quando o programa liga depois de horas */
const WINDOW_HOURS = 12;
const BATCH = 10;

const ticketSelect = {
  id: true,
  number: true,
  code: true,
  createdAt: true,
  type: true,
  customerName: true,
  customerWhatsapp: true,
  deliveryStreet: true,
  deliveryNumber: true,
  deliveryComplement: true,
  deliveryNeighborhood: true,
  deliveryReference: true,
  notes: true,
  subtotalCents: true,
  deliveryFeeCents: true,
  totalCents: true,
  paymentMethod: true,
  payment: { select: { cardType: true, changeForCents: true } },
  items: { orderBy: { id: "asc" }, select: { productName: true, optionsText: true, quantity: true, totalCents: true, notes: true } },
} as const;

export function pendingOrders(restaurantId: string) {
  return db.order.findMany({
    where: {
      restaurantId,
      printedAt: null,
      status: { in: [...OPEN_ORDER_STATUSES] },
      createdAt: { gte: new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true, number: true, createdAt: true },
  });
}

/** a via pronta: o mesmo texto que sai pela impressão do navegador */
export async function orderTicket(restaurantId: string, orderId: string) {
  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId },
    select: { ...ticketSelect, restaurant: { select: { name: true, receiptWidth: true } } },
  });
  if (!order) return null;

  return {
    id: order.id,
    numero: order.number,
    codigo: order.code,
    criadoEm: order.createdAt.toISOString(),
    // texto pronto para a impressora comum; as linhas soltas servem para o
    // ESC/POS depois, sem ter que refazer a formatação
    // a largura vem do painel: 80 mm por padrão, 58 mm para bobina estreita
    papel_mm: order.restaurant.receiptWidth,
    texto: ticketText(order, order.restaurant.name, order.restaurant.receiptWidth),
    linhas: ticketLines(order, order.restaurant.name, order.restaurant.receiptWidth),
  };
}

/** só marca quem ainda não estava marcado: dois programas não duplicam a via */
export async function markOrderPrinted(restaurantId: string, orderId: string) {
  const { count } = await db.order.updateMany({
    where: { id: orderId, restaurantId, printedAt: null },
    data: { printedAt: new Date() },
  });
  return { marcado: count > 0 };
}
