import type { CardType, OrderOrigin, OrderType, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";

import { formatCents } from "./format";
import { isFullDelivery } from "./order-flow";

// Formas de pagamento. Pix é pago antes (chave na página do pedido); cartão
// e dinheiro são pagos na entrega ou no balcão, na retirada.

export const PAYMENT_METHODS: PaymentMethod[] = ["PIX", "CARD", "CASH"];
export const CARD_TYPES: CardType[] = ["CREDIT", "DEBIT"];

export const paymentMethodLabel: Record<PaymentMethod, string> = { PIX: "Pix", CARD: "Cartão", CASH: "Dinheiro" };
export const cardTypeLabel: Record<CardType, string> = { CREDIT: "Crédito", DEBIT: "Débito" };

export type PaymentChoice = {
  method: PaymentMethod;
  cardType?: CardType | null;
  changeForCents?: number | null;
  /** em que pé está a cobrança; sem isto, o Pix do 100% Delivery é tratado como pendente */
  status?: PaymentStatus | null;
};

/** "Cartão de débito", "Dinheiro, troco para R$ 100,00", "Pix" */
export function paymentText(p: PaymentChoice) {
  if (p.method === "CARD") return p.cardType ? `Cartão de ${cardTypeLabel[p.cardType].toLowerCase()}` : "Cartão";
  if (p.method === "CASH") return p.changeForCents ? `Dinheiro, troco para ${formatCents(p.changeForCents)}` : "Dinheiro, sem troco";
  return "Pix";
}

/** o que o restaurante precisa saber para receber (maquininha, troco) */
export function paymentHint(p: PaymentChoice, type: OrderType, totalCents: number, origin?: OrderOrigin | null) {
  // o pedido do totem chega pago: mandar cobrar no balcão faria cobrar duas vezes
  if (origin === "TOTEM") return p.method === "PIX" ? "Pago por Pix no totem." : "Pago no cartão, na maquininha do totem.";
  // 100% Delivery no Pix: quem cobra é o Mercado Pago, e o que o balcão
  // precisa saber é se o dinheiro entrou -- dizer "pago" num pedido que
  // ninguém pagou é o pior erro que esta linha pode cometer. Cartão e
  // dinheiro continuam sendo pagos na entrega, e caem nas regras de baixo.
  if (p.method === "PIX" && isFullDelivery(origin)) {
    if (p.status === "CONFIRMED") return "Pago por Pix, confirmado pelo Mercado Pago.";
    if (p.status === "EXPIRED") return "O Pix venceu sem pagamento. O cliente pode gerar outro na tela do pedido dele.";
    if (p.status === "REJECTED") return "O Pix foi recusado. Nada entrou.";
    if (p.status === "REFUNDED") return "Pix estornado ao cliente.";
    if (p.status === "CANCELED") return "Cobrança cancelada. Nada entrou.";
    return "Esperando o Pix do cliente. O pedido só anda quando o Mercado Pago confirmar.";
  }
  if (p.method === "CARD") return type === "DELIVERY" ? "Levar a maquininha na entrega." : "Pagamento no balcão, na retirada.";
  if (p.method === "CASH") {
    if (!p.changeForCents) return type === "DELIVERY" ? "Pago em dinheiro na entrega, sem troco." : "Pago em dinheiro na retirada, sem troco.";
    return `Levar ${formatCents(p.changeForCents - totalCents)} de troco.`;
  }
  return null;
}
