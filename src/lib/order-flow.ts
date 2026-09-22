import type { OrderStatus, OrderType } from "@/generated/prisma/enums";

// Caminho do atendimento de um pedido, do pagamento até a entrega.

export const FINAL_ORDER_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELED"];

/** o próximo passo, para o botão principal do atendimento */
export function nextOrderStep(status: OrderStatus, type: OrderType): { to: OrderStatus; label: string } | null {
  switch (status) {
    case "NEW":
    case "AWAITING_PAYMENT":
    case "PAYMENT_SENT":
      return { to: "CONFIRMED", label: "Confirmar pagamento" };
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
