import type { OrderOrigin, OrderStatus, OrderType, PaymentMethod } from "@/generated/prisma/enums";

// Caminho do atendimento de um pedido, do pagamento até a entrega. No Pix,
// o primeiro passo é conferir o pagamento; no cartão e no dinheiro, aceitar
// o pedido (o pagamento acontece na entrega ou no balcão).
//
// O 100% Delivery tem um caminho próprio, mais longo, porque ali o cliente
// acompanha tudo por uma tela que se atualiza sozinha: cada passo que o
// balcão toca aparece na mão dele na hora. No WhatsApp isso não existia --
// o cliente só sabia o que mandassem contar, então o atendimento pulava do
// aceite direto para a saída.

export const FINAL_ORDER_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELED"];

/** o pedido veio do fluxo 100% Delivery? */
export const isFullDelivery = (origin: OrderOrigin | null | undefined) => origin === "FULL_DELIVERY";

/**
 * Filtro do Prisma que tira da lista o pedido do 100% Delivery que ainda
 * está esperando o Pix.
 *
 * Ele existe no banco desde que o cliente confirmou, e aparece para ele na
 * página dele -- mas não entra na fila da impressora nem toca o sino do
 * balcão. Comanda de pedido não pago é comida saindo de graça, e sino a cada
 * carrinho abandonado faz o balcão desligar o som.
 *
 * Nenhum outro pedido é afetado: o do WhatsApp e o do totem continuam
 * entrando na hora em que nascem, como sempre.
 */
export const EXCLUDE_UNPAID = { NOT: { origin: "FULL_DELIVERY" as const, status: "AWAITING_PAYMENT" as const } };

/**
 * Próximo passo de um pedido do 100% Delivery.
 *
 * Em AWAITING_PAYMENT não há passo nenhum: o dinheiro ainda não entrou, e
 * quem diz que entrou é o Mercado Pago, nunca um botão do painel. O balcão
 * vê "aguardando pagamento" e espera.
 */
function nextFullDeliveryStep(status: OrderStatus, type: OrderType): { to: OrderStatus; label: string } | null {
  switch (status) {
    case "AWAITING_PAYMENT":
      return null;
    // pago: o restaurante abre o pedido, e é isso que manda a comanda para
    // a impressora e começa a contar o tempo para o cliente
    case "PAID":
    case "NEW":
    case "PAYMENT_SENT":
      return { to: "CONFIRMED", label: "Receber pedido" };
    case "CONFIRMED":
      return { to: "PREPARING", label: "Começar o preparo" };
    case "PREPARING":
      return { to: "READY", label: type === "DELIVERY" ? "Pronto para sair" : "Pronto para retirar" };
    case "READY":
      return type === "DELIVERY" ? { to: "OUT_FOR_DELIVERY", label: "Saiu para entrega" } : { to: "COMPLETED", label: "Cliente retirou" };
    case "OUT_FOR_DELIVERY":
      return { to: "COMPLETED", label: "Entregue" };
    default:
      return null;
  }
}

/** o próximo passo, para o botão principal do atendimento */
export function nextOrderStep(
  status: OrderStatus,
  type: OrderType,
  method: PaymentMethod,
  origin?: OrderOrigin | null,
): { to: OrderStatus; label: string } | null {
  if (isFullDelivery(origin)) return nextFullDeliveryStep(status, type);

  switch (status) {
    case "NEW":
    case "AWAITING_PAYMENT":
    case "PAID":
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

/** os passos que o cliente vê na página do pedido, no 100% Delivery */
export function fullDeliverySteps(type: OrderType, pagoNaEntrega: boolean): { status: OrderStatus[]; label: string }[] {
  return [
    pagoNaEntrega
      ? { status: ["NEW"] as OrderStatus[], label: "Pedido feito" }
      : { status: ["AWAITING_PAYMENT"] as OrderStatus[], label: "Aguardando pagamento" },
    ...(pagoNaEntrega ? [] : [{ status: ["PAID", "PAYMENT_SENT"] as OrderStatus[], label: "Pagamento confirmado" }]),
    { status: ["CONFIRMED"], label: "Recebido pelo restaurante" },
    { status: ["PREPARING"], label: "Em preparo" },
    { status: ["READY"], label: type === "DELIVERY" ? "Pronto, saindo para entrega" : "Pronto para retirar" },
    ...(type === "DELIVERY" ? [{ status: ["OUT_FOR_DELIVERY"] as OrderStatus[], label: "Saiu para entrega" }] : []),
    { status: ["COMPLETED"], label: type === "DELIVERY" ? "Entregue" : "Retirado" },
  ];
}
