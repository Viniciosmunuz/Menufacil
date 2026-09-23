"use server";

import type { OrderStatus, OrderType, PaymentMethod } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export type OrderSummary = {
  code: string;
  number: number;
  status: OrderStatus;
  type: OrderType;
  paymentMethod: PaymentMethod;
  totalCents: number;
  createdAt: string;
  restaurantName: string;
  restaurantSlug: string;
};

const CODES = 20;

/**
 * Andamento dos pedidos guardados no aparelho. O código é o mesmo do link do
 * pedido: quem tem o código já podia abrir a página, então isto não mostra
 * nada novo. Só devolve o que serve para a lista.
 */
export async function ordersByCode(codes: string[]): Promise<OrderSummary[]> {
  const wanted = [...new Set(codes)].filter((c) => typeof c === "string" && /^[a-z0-9]{4,32}$/i.test(c)).slice(0, CODES);
  if (wanted.length === 0) return [];

  const orders = await db.order.findMany({
    where: { code: { in: wanted } },
    orderBy: { createdAt: "desc" },
    select: {
      code: true,
      number: true,
      status: true,
      type: true,
      paymentMethod: true,
      totalCents: true,
      createdAt: true,
      restaurant: { select: { name: true, slug: true } },
    },
  });

  return orders.map((o) => ({
    code: o.code,
    number: o.number,
    status: o.status,
    type: o.type,
    paymentMethod: o.paymentMethod,
    totalCents: o.totalCents,
    createdAt: o.createdAt.toISOString(),
    restaurantName: o.restaurant.name,
    restaurantSlug: o.restaurant.slug,
  }));
}
