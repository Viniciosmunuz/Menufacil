import type { OrderStatus, OrderType, PaymentMethod } from "@/generated/prisma/enums";

// Caminho do atendimento de um pedido, do pagamento até a entrega. No Pix,
// o primeiro passo é conferir o pagamento; no cartão e no dinheiro, aceitar
// o pedido (o pagamento acontece na entrega ou no balcão).

export const FINAL_ORDER_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELED"];

/** o próximo passo, para o botão principal do atendimento */
export function nextOrderStep(status: OrderStatus, type: OrderType, method: PaymentMethod): { to: OrderStatus; label: string } | null {
  switch (status) {
    case "NEW":
    case "AWAITING_PAYMENT":
    case "PAYMENT_SENT":
      return { to: "CONFIRMED", label: method === "PIX" ? "Confirmar pagamento" : "Aceitar pedido" };
    // aceito o pedido, o próximo toque é o que interessa ao cliente: saiu
    // para entrega ou, na retirada, pronto para buscar
    case "CONFIRMED":
    case "PREPARING":
      return type === "DELIVERY" ? { to: "OUT_FOR_DELIVERY", label: "Saiu para entrega" } : { to: "READY", label: "Pronto para retirar" };
    case "READY":
      return type === "DELIVERY" ? { to: "OUT_FOR_DELIVERY", label: "Saiu para entrega" } : { to: "COMPLETED", label: "Cliente retirou" };
    case "OUT_FOR_DELIVERY":
      return { to: "COMPLETED", label: "Entregue" };
    default:
      return null;
  }
}
