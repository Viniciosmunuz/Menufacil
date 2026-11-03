import "server-only";

import { db } from "@/lib/db";

// O que o entregador vê no celular.
//
// Tudo é filtrado por restaurante e, no que é dele, pelo próprio cadastro:
// a consulta nunca recebe só o id do pedido vindo da tela. Um entregador
// não vê o pedido de outro restaurante nem a entrega que não é dele, e
// isso é resolvido aqui, e não por esconder botão.

/** os campos que a lista mostra; o detalhe pede mais */
const naLista = {
  id: true,
  number: true,
  customerName: true,
  deliveryStreet: true,
  deliveryNumber: true,
  deliveryNeighborhood: true,
  totalCents: true,
  paymentMethod: true,
  createdAt: true,
  atribuidoEm: true,
} as const;

export type EntregaNaLista = {
  id: string;
  number: number;
  customerName: string;
  deliveryStreet: string | null;
  deliveryNumber: string | null;
  deliveryNeighborhood: string | null;
  totalCents: number;
  paymentMethod: "PIX" | "CARD" | "CASH";
  createdAt: Date;
  atribuidoEm: Date | null;
};

/** meia-noite de hoje, para contar o dia do entregador */
function comecoDoDia() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

/** os pedidos que este entregador está levando agora */
export function minhasEntregas(restaurantId: string, entregadorId: string) {
  return db.order.findMany({
    where: { restaurantId, entregadorId, status: "OUT_FOR_DELIVERY" },
    orderBy: { atribuidoEm: "asc" },
    select: naLista,
  });
}

/**
 * Os pedidos que saíram do restaurante e ainda não têm quem leve.
 *
 * É a fila que os dois entregadores disputam. Com um só em serviço ela
 * fica vazia: o pedido já sai no nome dele.
 */
export function entregasLivres(restaurantId: string) {
  return db.order.findMany({
    where: { restaurantId, type: "DELIVERY", status: "OUT_FOR_DELIVERY", entregadorId: null },
    orderBy: { createdAt: "asc" },
    select: naLista,
  });
}

/** o que ele já entregou; `desde` limita a janela do histórico */
export function entregasFeitas(restaurantId: string, entregadorId: string, desde: Date, limite = 50) {
  return db.order.findMany({
    where: { restaurantId, entregadorId, status: { in: ["COMPLETED", "CANCELED"] }, updatedAt: { gte: desde } },
    orderBy: { updatedAt: "desc" },
    take: limite,
    select: { ...naLista, status: true, updatedAt: true },
  });
}

/** quantas ele fechou hoje */
export function fechadasHoje(restaurantId: string, entregadorId: string) {
  return db.order.count({
    where: { restaurantId, entregadorId, status: "COMPLETED", updatedAt: { gte: comecoDoDia() } },
  });
}

/**
 * Um pedido, para a tela de detalhe.
 *
 * Só abre o que é dele ou o que ainda está livre -- e sempre dentro do
 * restaurante a que ele pertence. Qualquer outro id devolve nada, e a tela
 * responde 404.
 */
export function pedidoDoEntregador(restaurantId: string, entregadorId: string, orderId: string) {
  return db.order.findFirst({
    where: {
      id: orderId,
      restaurantId,
      type: "DELIVERY",
      OR: [{ entregadorId }, { entregadorId: null, status: "OUT_FOR_DELIVERY" }],
    },
    select: {
      id: true,
      number: true,
      status: true,
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
      entregadorId: true,
      atribuidoEm: true,
      createdAt: true,
      items: { orderBy: { id: "asc" }, select: { id: true, productName: true, optionsText: true, quantity: true, totalCents: true, notes: true } },
      payment: { select: { status: true, cardType: true, changeForCents: true } },
      destinoLat: true,
      destinoLng: true,
      destinoEm: true,
      restaurant: { select: { street: true, number: true, neighborhood: true, city: true, state: true } },
    },
  });
}

export type PedidoDoEntregador = NonNullable<Awaited<ReturnType<typeof pedidoDoEntregador>>>;

/** o endereço de entrega numa linha, do jeito que se diz em voz alta */
export function enderecoEmLinha(p: {
  deliveryStreet: string | null;
  deliveryNumber: string | null;
  deliveryNeighborhood: string | null;
}) {
  const rua = [p.deliveryStreet, p.deliveryNumber].filter(Boolean).join(", ");
  return [rua, p.deliveryNeighborhood].filter(Boolean).join(" - ");
}

/**
 * O link que abre a rota no aplicativo de mapa do próprio celular.
 *
 * Não se desenha mapa aqui: o entregador já tem o Google Maps ou o Waze
 * instalado, com a voz, o trânsito e os atalhos que ele conhece. O que
 * falta é o endereço chegar lá sem ele digitar na rua.
 */
export function linkDaRota(endereco: string, cidade?: string | null) {
  const destino = [endereco, cidade].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}&travelmode=driving`;
}
