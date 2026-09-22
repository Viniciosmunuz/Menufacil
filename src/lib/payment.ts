import type { CardType, OrderType, PaymentMethod } from "@/generated/prisma/enums";

import { formatCents } from "./format";

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
};

/** "Cartão de débito", "Dinheiro, troco para R$ 100,00", "Pix" */
export function paymentText(p: PaymentChoice) {
  if (p.method === "CARD") return p.cardType ? `Cartão de ${cardTypeLabel[p.cardType].toLowerCase()}` : "Cartão";
  if (p.method === "CASH") return p.changeForCents ? `Dinheiro, troco para ${formatCents(p.changeForCents)}` : "Dinheiro, sem troco";
  return "Pix";
}

/** o que o restaurante precisa saber para receber (maquininha, troco) */
export function paymentHint(p: PaymentChoice, type: OrderType, totalCents: number) {
  if (p.method === "CARD") return type === "DELIVERY" ? "Levar a maquininha na entrega." : "Pagamento no balcão, na retirada.";
  if (p.method === "CASH") {
    if (!p.changeForCents) return type === "DELIVERY" ? "Pago em dinheiro na entrega, sem troco." : "Pago em dinheiro na retirada, sem troco.";
    return `Levar ${formatCents(p.changeForCents - totalCents)} de troco.`;
  }
  return null;
}
