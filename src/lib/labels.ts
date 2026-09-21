import type { OrderStatus, RestaurantStatus } from "@/generated/prisma/enums";

export const restaurantStatusLabel: Record<RestaurantStatus, string> = {
  DRAFT: "Em implantação",
  PENDING_REVIEW: "Aguardando aprovação",
  ACTIVE: "Ativo",
  INACTIVE: "Desativado",
  BLOCKED: "Bloqueado",
};

export const restaurantStatusTone: Record<RestaurantStatus, "info" | "success" | "warning" | "danger" | "neutral"> = {
  DRAFT: "info",
  PENDING_REVIEW: "warning",
  ACTIVE: "success",
  INACTIVE: "neutral",
  BLOCKED: "danger",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  NEW: "Novo",
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAYMENT_SENT: "Pagamento enviado",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY: "Pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};

/** pedidos que ainda precisam de atenção do restaurante */
export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  "NEW",
  "AWAITING_PAYMENT",
  "PAYMENT_SENT",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
];
