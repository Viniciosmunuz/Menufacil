import type { OrderStatus, PaymentStatus, RestaurantStatus } from "@/generated/prisma/enums";

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: "A receber",
  PROOF_SENT: "Comprovante enviado",
  CONFIRMED: "Confirmado",
  REFUNDED: "Estornado",
  CANCELED: "Cancelado",
};

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

export const RESTAURANT_STATUSES = Object.keys(restaurantStatusLabel) as RestaurantStatus[];

export function isRestaurantStatus(value: unknown): value is RestaurantStatus {
  return typeof value === "string" && value in restaurantStatusLabel;
}

export const ORDER_STATUSES = Object.keys(orderStatusLabel) as OrderStatus[];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && value in orderStatusLabel;
}

export const orderStatusTone: Record<OrderStatus, "info" | "success" | "warning" | "danger" | "neutral" | "brand"> = {
  NEW: "brand",
  AWAITING_PAYMENT: "warning",
  PAYMENT_SENT: "warning",
  CONFIRMED: "info",
  PREPARING: "info",
  READY: "success",
  OUT_FOR_DELIVERY: "info",
  COMPLETED: "neutral",
  CANCELED: "danger",
};
