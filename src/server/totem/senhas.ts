import "server-only";

import { db } from "@/lib/db";

// O que aparece no painel de senhas do segundo monitor.
//
// Só pedido de balcão (retirada, que é o caso do totem). Senha de horas
// atrás não fica na tela atrapalhando quem chegou agora, mesmo que ninguém
// tenha marcado como entregue.
//
// Entram três momentos, porque a tela mostra os três: o que está no fogo,
// o que já pode ser retirado, e o que acabou de sair -- este último fica
// pouco tempo, só para quem perdeu a chamada se achar.

const HORAS_NA_TELA = 4;
/** quanto tempo uma senha já retirada ainda aparece em "últimos pedidos" */
const MINUTOS_APOS_RETIRAR = 30;

export type SenhaNaTela = {
  id: string;
  number: number;
  status: "PREPARING" | "READY" | "COMPLETED";
  customerName: string;
  /** quando mudou de estado pela última vez; ordena os "últimos pedidos" */
  em: Date;
};

export async function senhasDoSalao(restaurantId: string): Promise<SenhaNaTela[]> {
  const desde = new Date(Date.now() - HORAS_NA_TELA * 60 * 60 * 1000);
  const retiradoDesde = new Date(Date.now() - MINUTOS_APOS_RETIRAR * 60 * 1000);

  const pedidos = await db.order.findMany({
    where: {
      restaurantId,
      type: "PICKUP",
      createdAt: { gte: desde },
      OR: [
        { status: { in: ["PREPARING", "READY"] } },
        // o retirado sai da tela sozinho, pelo horário em que foi entregue
        { status: "COMPLETED", updatedAt: { gte: retiradoDesde } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, number: true, status: true, customerName: true, updatedAt: true },
  });

  return pedidos.map((p) => ({
    id: p.id,
    number: p.number,
    status: p.status as "PREPARING" | "READY" | "COMPLETED",
    customerName: p.customerName,
    em: p.updatedAt,
  }));
}
