import "server-only";

import { after } from "next/server";

import type { OrderType } from "@/generated/prisma/enums";

import { avisarPedidoNovo } from "./avisos";

// O aviso sai depois que o cliente já viu a tela do pedido dele. Esperar a
// resposta do Google para só então responder ao cliente deixaria a compra
// mais lenta por um motivo que não é dele — e se o aviso falhar, o pedido
// já está no sistema do mesmo jeito.
export function agendarAvisoDePedido(pedido: {
  id: string;
  number: number;
  restaurantId: string;
  type: OrderType;
  totalCents: number;
  customerName: string;
}) {
  after(async () => {
    try {
      await avisarPedidoNovo(pedido);
    } catch (erro) {
      console.error("[avisos] não deu para avisar o restaurante:", erro);
    }
  });
}
