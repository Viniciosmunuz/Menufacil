import "server-only";

import type { OrderStatus, OrderType, PixKeyType } from "@/generated/prisma/enums";
import { formatCents, formatPhone } from "@/lib/format";
import { orderStatusLabel } from "@/lib/labels";
import { formatPixKey, pixKeyTypeLabel } from "@/lib/pix";
import { appUrl } from "@/lib/site";

// Conteúdo das mensagens. Cada mensagem tem duas formas:
// - body: texto completo e organizado (usado no mock, no registro e em
//   conversas já abertas na janela de 24h);
// - template + params: o modelo aprovado pela Meta, obrigatório para a
//   empresa iniciar a conversa. Parâmetro de modelo não aceita quebra de
//   linha, por isso os itens vão numa linha só.

export type MessageContent = {
  body: string;
  templateName: string;
  templateParams: string[];
};

type OrderForMessage = {
  id: string;
  number: number;
  code: string;
  type: OrderType;
  customerName: string;
  customerWhatsapp: string;
  deliveryStreet: string | null;
  deliveryNumber: string | null;
  deliveryComplement: string | null;
  deliveryNeighborhood: string | null;
  deliveryReference: string | null;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  items: { productName: string; quantity: number; totalCents: number; notes: string | null }[];
};

type RestaurantForMessage = {
  id: string;
  name: string;
  pixKey: string | null;
  pixKeyType: PixKeyType | null;
  pixHolderName: string | null;
  paymentInstructions: string | null;
};

const template = (key: string, fallback: string) => process.env[`WHATSAPP_TEMPLATE_${key}`] || fallback;

/** parâmetro de modelo: uma linha, sem espaços repetidos, até 1024 letras */
function param(value: string | null | undefined) {
  const clean = (value ?? "").replace(/\s+/g, " ").trim();
  return (clean || "-").slice(0, 1000);
}

function addressLine(o: OrderForMessage) {
  if (o.type !== "DELIVERY") return "Retirada no local";
  return [`${o.deliveryStreet ?? ""}, ${o.deliveryNumber ?? ""}`, o.deliveryNeighborhood].filter(Boolean).join(" - ");
}

export const trackingUrl = (code: string) => `${appUrl()}/pedido/${code}`;
export const panelOrderUrl = (restaurantId: string, orderId: string) => `${appUrl()}/painel/${restaurantId}/pedidos/${orderId}`;

/** "NOVO PEDIDO #1024" para o WhatsApp do restaurante */
export function orderToRestaurant(o: OrderForMessage, r: RestaurantForMessage): MessageContent {
  const type = o.type === "DELIVERY" ? "Entrega" : "Retirada no local";
  const lines = [
    `*NOVO PEDIDO #${o.number}*`,
    r.name,
    "",
    `*Cliente:* ${o.customerName}`,
    `*WhatsApp:* ${formatPhone(o.customerWhatsapp)}`,
    `*Tipo:* ${type}`,
    "",
    "*Itens*",
    ...o.items.flatMap((i) => [
      `${i.quantity}x ${i.productName} — ${formatCents(i.totalCents)}`,
      ...(i.notes ? [`   _Obs.: ${i.notes}_`] : []),
    ]),
    "",
    `Subtotal: ${formatCents(o.subtotalCents)}`,
    ...(o.type === "DELIVERY" ? [`Taxa de entrega: ${formatCents(o.deliveryFeeCents)}`] : []),
    `*Total: ${formatCents(o.totalCents)}*`,
    "",
    "*Pagamento:* Pix (aguardando comprovante do cliente)",
    ...(o.type === "DELIVERY"
      ? [
          `*Endereço:* ${addressLine(o)}`,
          ...(o.deliveryComplement ? [`Complemento: ${o.deliveryComplement}`] : []),
          ...(o.deliveryReference ? [`Referência: ${o.deliveryReference}`] : []),
        ]
      : []),
    ...(o.notes ? [`*Observações:* ${o.notes}`] : []),
    "",
    `Ver no painel: ${panelOrderUrl(r.id, o.id)}`,
  ];

  const itemsInline = o.items
    .map((i) => `${i.quantity}x ${i.productName}${i.notes ? ` (${i.notes})` : ""}`)
    .join("; ");

  return {
    body: lines.join("\n"),
    templateName: template("NEW_ORDER", "novo_pedido"),
    templateParams: [
      String(o.number),
      o.customerName,
      formatPhone(o.customerWhatsapp),
      type,
      itemsInline,
      formatCents(o.subtotalCents),
      formatCents(o.deliveryFeeCents),
      formatCents(o.totalCents),
      "Pix",
      addressLine(o) + (o.deliveryComplement ? ` (${o.deliveryComplement})` : "") + (o.deliveryReference ? ` - Ref.: ${o.deliveryReference}` : ""),
      o.notes ?? "",
      panelOrderUrl(r.id, o.id),
    ].map(param),
  };
}

/** o pedido que o próprio cliente manda ao restaurante (link wa.me da página do pedido) */
export function orderFromCustomer(o: OrderForMessage, r: { name: string }) {
  const delivery = o.type === "DELIVERY";
  return [
    `Olá, ${r.name}! Quero fazer este pedido:`,
    "",
    `*Pedido #${o.number}*`,
    ...o.items.flatMap((i) => [
      `${i.quantity}x ${i.productName} — ${formatCents(i.totalCents)}`,
      ...(i.notes ? [`   _Obs.: ${i.notes}_`] : []),
    ]),
    "",
    `Subtotal: ${formatCents(o.subtotalCents)}`,
    ...(delivery ? [`Taxa de entrega: ${o.deliveryFeeCents > 0 ? formatCents(o.deliveryFeeCents) : "Grátis"}`] : []),
    `*Total: ${formatCents(o.totalCents)}*`,
    "",
    delivery ? `*Entrega:* ${addressLine(o)}` : "*Retirada no local*",
    ...(delivery && o.deliveryComplement ? [`Complemento: ${o.deliveryComplement}`] : []),
    ...(delivery && o.deliveryReference ? [`Referência: ${o.deliveryReference}`] : []),
    ...(o.notes ? [`*Observações:* ${o.notes}`] : []),
    "",
    `*Nome:* ${o.customerName}`,
    `*WhatsApp:* ${formatPhone(o.customerWhatsapp)}`,
    "",
    "*Pagamento:* Pix. Assim que pagar, mando o comprovante aqui.",
    "",
    `Acompanhar o pedido: ${trackingUrl(o.code)}`,
  ].join("\n");
}

export const waMeLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

/** instruções do Pix para o cliente, logo depois do pedido */
export function paymentInstructions(o: OrderForMessage, r: RestaurantForMessage): MessageContent {
  const keyType = r.pixKeyType ? pixKeyTypeLabel[r.pixKeyType] : "Chave";
  const key = r.pixKey ? formatPixKey(r.pixKeyType, r.pixKey) : "";
  const lines = [
    `Olá, ${o.customerName}! Recebemos seu pedido *#${o.number}* em *${r.name}*.`,
    "",
    `*Total: ${formatCents(o.totalCents)}*`,
    "",
    "*Pague com Pix*",
    `${keyType}: ${key}`,
    ...(r.pixHolderName ? [`Nome: ${r.pixHolderName}`] : []),
    ...(r.paymentInstructions ? ["", r.paymentInstructions] : []),
    "",
    "Após realizar o pagamento, envie o comprovante pelo WhatsApp do restaurante.",
    "",
    `Acompanhe seu pedido: ${trackingUrl(o.code)}`,
  ];
  return {
    body: lines.join("\n"),
    templateName: template("PAYMENT", "instrucoes_pix"),
    templateParams: [o.customerName, String(o.number), r.name, formatCents(o.totalCents), keyType, key, r.pixHolderName ?? "", trackingUrl(o.code)].map(param),
  };
}

/** aviso de mudança de status para o cliente */
export function orderStatusUpdate(
  o: { number: number; code: string; customerName: string; type: OrderType },
  r: { name: string },
  status: OrderStatus,
): MessageContent {
  const label = orderStatusLabel[status];
  const extra: Partial<Record<OrderStatus, string>> = {
    CONFIRMED: "Pagamento confirmado. Obrigado!",
    PREPARING: "Seu pedido já está sendo preparado.",
    READY: o.type === "PICKUP" ? "Pode vir buscar!" : "Já já sai para entrega.",
    OUT_FOR_DELIVERY: "Seu pedido está a caminho.",
    COMPLETED: "Bom apetite! Obrigado pela preferência.",
    CANCELED: "Se tiver dúvida, fale com o restaurante.",
  };
  const lines = [
    `Pedido *#${o.number}* em *${r.name}*: ${label.toLowerCase()}.`,
    ...(extra[status] ? [extra[status]!] : []),
    "",
    `Acompanhe: ${trackingUrl(o.code)}`,
  ];
  return {
    body: lines.join("\n"),
    templateName: template("STATUS", "status_pedido"),
    templateParams: [o.customerName, String(o.number), r.name, label, trackingUrl(o.code)].map(param),
  };
}
