import type { CardType, OrderType, PaymentMethod } from "@/generated/prisma/enums";

import { formatCents, formatPhone } from "./format";
import { paymentText } from "./payment";

// Via do pedido para a impressora térmica. Só texto, em 32 colunas: cabe na
// bobina de 58 mm e também fica certinho na de 80 mm. A mesma via vai para
// a impressão pelo computador (a página /via) e para o celular (RawBT).

export const TICKET_WIDTH = 32;

export type TicketOrder = {
  number: number;
  createdAt: Date | string;
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
  paymentMethod: PaymentMethod;
  payment: { cardType: CardType | null; changeForCents: number | null } | null;
  items: { productName: string; optionsText: string | null; quantity: number; totalCents: number; notes: string | null }[];
};

const divider = "-".repeat(TICKET_WIDTH);

const center = (text: string) => {
  const room = Math.max(0, TICKET_WIDTH - text.length);
  return " ".repeat(Math.floor(room / 2)) + text;
};

/** rótulo à esquerda e valor à direita, na mesma linha */
const row = (label: string, value: string) => {
  const room = Math.max(1, TICKET_WIDTH - label.length - value.length);
  return label + " ".repeat(room) + value;
};

/** quebra o texto sem cortar palavra, com recuo nas linhas seguintes */
function wrap(text: string, indent = ""): string[] {
  const out: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const prefix = out.length === 0 ? "" : indent;
    if (current && (prefix + current + " " + word).length > TICKET_WIDTH) {
      out.push((out.length === 0 ? "" : indent) + current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) out.push((out.length === 0 ? "" : indent) + current);
  return out;
}

const clock = (date: Date | string) =>
  new Date(date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function ticketLines(o: TicketOrder, restaurantName: string): string[] {
  const delivery = o.type === "DELIVERY";
  const lines: string[] = [
    center(restaurantName.toUpperCase()),
    center(`PEDIDO #${o.number}`),
    center(clock(o.createdAt)),
    center(delivery ? "ENTREGA" : "RETIRADA"),
    divider,
  ];

  for (const i of o.items) {
    lines.push(...wrap(`${i.quantity}x ${i.productName}`, "   "));
    if (i.optionsText) lines.push(...wrap(i.optionsText, "     ").map((l, n) => (n === 0 ? `   ${l}` : l)));
    if (i.notes) lines.push(...wrap(`Obs.: ${i.notes}`, "     ").map((l, n) => (n === 0 ? `   ${l}` : l)));
    lines.push(row("", formatCents(i.totalCents)));
  }

  lines.push(divider, row("Subtotal", formatCents(o.subtotalCents)));
  if (delivery) lines.push(row("Entrega", o.deliveryFeeCents > 0 ? formatCents(o.deliveryFeeCents) : "Gratis"));
  lines.push(row("TOTAL", formatCents(o.totalCents)), divider);

  lines.push(...wrap(paymentText({ method: o.paymentMethod, cardType: o.payment?.cardType })));
  if (o.paymentMethod === "CASH") {
    lines.push(
      o.payment?.changeForCents
        ? `Troco para ${formatCents(o.payment.changeForCents)} (${formatCents(o.payment.changeForCents - o.totalCents)})`
        : "Sem troco",
    );
  }
  if (o.paymentMethod === "CARD") lines.push(delivery ? "Levar a maquininha" : "Pagar no balcao");

  lines.push(divider, ...wrap(`Cliente: ${o.customerName}`), formatPhone(o.customerWhatsapp));
  if (delivery) {
    lines.push("", ...wrap(`${o.deliveryStreet ?? ""}, ${o.deliveryNumber ?? ""}`.trim()));
    if (o.deliveryNeighborhood) lines.push(...wrap(o.deliveryNeighborhood));
    if (o.deliveryComplement) lines.push(...wrap(`Compl.: ${o.deliveryComplement}`));
    if (o.deliveryReference) lines.push(...wrap(`Ref.: ${o.deliveryReference}`));
  }
  if (o.notes) lines.push(divider, ...wrap(`Obs.: ${o.notes}`));

  return lines;
}

/** a via em texto puro, do jeito que a impressora recebe */
export const ticketText = (o: TicketOrder, restaurantName: string) => `${ticketLines(o, restaurantName).join("\n")}\n\n\n`;
