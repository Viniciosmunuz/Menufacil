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
    case "CONFIRMED":
      return { to: "PREPARING", label: "Começar o preparo" };
    case "PREPARING":
      return { to: "READY", label: type === "PICKUP" ? "Pronto para retirar" : "Marcar como pronto" };
    case "READY":
      return type === "DELIVERY" ? { to: "OUT_FOR_DELIVERY", label: "Saiu para entrega" } : { to: "COMPLETED", label: "Cliente retirou" };
    case "OUT_FOR_DELIVERY":
      return { to: "COMPLETED", label: "Entregue" };
    default:
      return null;
  }
}
