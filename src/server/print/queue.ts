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

  const paper = order.restaurant.receiptWidth;
  return {
    id: order.id,
    numero: order.number,
    codigo: order.code,
    criadoEm: order.createdAt.toISOString(),
    // a largura vem do painel: 80 mm por padrão, 58 mm para bobina estreita
    papel_mm: paper,
    // texto pronto, para a impressora comum do Windows
    texto: ticketText(order, order.restaurant.name, paper),
    linhas: ticketLines(order, order.restaurant.name, paper),
    // os mesmos dados em partes, para a térmica ESC/POS dar destaque ao
    // número do pedido, ao total e ao que o cliente escreveu
    dados: {
      restaurante: order.restaurant.name,
      numero: order.number,
      criado_em: order.createdAt.toISOString(),
      tipo: order.type,
      cliente: { nome: order.customerName, whatsapp: order.customerWhatsapp },
      endereco: {
        rua: order.deliveryStreet,
        numero: order.deliveryNumber,
        complemento: order.deliveryComplement,
        bairro: order.deliveryNeighborhood,
        referencia: order.deliveryReference,
      },
      itens: order.items.map((i) => ({
        quantidade: i.quantity,
        nome: i.productName,
        opcoes: (i.optionsText ?? "").split(" · ").filter(Boolean),
        observacao: i.notes,
        total_centavos: i.totalCents,
      })),
      subtotal_centavos: order.subtotalCents,
      entrega_centavos: order.deliveryFeeCents,
      total_centavos: order.totalCents,
      pagamento: {
        forma: order.paymentMethod,
        cartao: order.payment?.cardType ?? null,
        troco_para_centavos: order.payment?.changeForCents ?? null,
      },
      observacao: order.notes,
    },
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
