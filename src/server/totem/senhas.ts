import "server-only";

import { db } from "@/lib/db";

// O que aparece no painel de senhas do segundo monitor.
//
// Só pedido de balcão (retirada, que é o caso do totem), em preparo ou
// pronto. Senha de horas atrás não fica na tela atrapalhando quem chegou
// agora, mesmo que ninguém tenha marcado como entregue.

const HORAS_NA_TELA = 4;

export type SenhaNaTela = {
  id: string;
  number: number;
  status: "PREPARING" | "READY";
  customerName: string;
};

export async function senhasDoSalao(restaurantId: string): Promise<SenhaNaTela[]> {
  const desde = new Date(Date.now() - HORAS_NA_TELA * 60 * 60 * 1000);
  const pedidos = await db.order.findMany({
    where: {
      restaurantId,
      type: "PICKUP",
      status: { in: ["PREPARING", "READY"] },
      createdAt: { gte: desde },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, number: true, status: true, customerName: true },
  });

  return pedidos.map((p) => ({
    id: p.id,
    number: p.number,
    status: p.status as "PREPARING" | "READY",
    customerName: p.customerName,
  }));
}
