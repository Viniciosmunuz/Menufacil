import type { CardType, OrderType, PaymentMethod } from "@/generated/prisma/enums";

import { formatCents, formatPhone } from "./format";
import { paymentText } from "./payment";

// Via do pedido para a impressora térmica. Só texto, na largura da bobina
// que o restaurante usa: 48 colunas na de 80 mm (o padrão) e 32 na de 58
// mm. A mesma via vai para a impressão pelo computador (a página /via),
// para o celular (RawBT) e para o Print Fácil.

/** bobinas que as térmicas do mercado usam, em milímetros */
export const PAPER_WIDTHS = [80, 58] as const;
export type PaperWidth = (typeof PAPER_WIDTHS)[number];
export const DEFAULT_PAPER = 80;

/** quantas letras cabem na linha, na fonte normal da térmica */
export const columnsFor = (paper: number) => (paper === 58 ? 32 : 48);

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

const center = (text: string, width: number) => {
  const room = Math.max(0, width - text.length);
  return " ".repeat(Math.floor(room / 2)) + text;
};

/** rótulo à esquerda e valor à direita, na mesma linha */
const row = (label: string, value: string, width: number) => {
  const room = Math.max(1, width - label.length - value.length);
  return label + " ".repeat(room) + value;
};

/** quebra o texto sem cortar palavra, com recuo nas linhas seguintes */
function wrap(text: string, width: number, indent = ""): string[] {
  const out: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const prefix = out.length === 0 ? "" : indent;
    if (current && (prefix + current + " " + word).length > width) {
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

export function ticketLines(o: TicketOrder, restaurantName: string, paper: number = DEFAULT_PAPER): string[] {
  const width = columnsFor(paper);
  const divider = "-".repeat(width);
  const meio = (texto: string) => center(texto, width);
  const linha = (rotulo: string, valor: string) => row(rotulo, valor, width);
  const quebra = (texto: string, indent = "") => wrap(texto, width, indent);
  const delivery = o.type === "DELIVERY";

  const lines: string[] = [
    meio(restaurantName.toUpperCase()),
    meio(`PEDIDO #${o.number}`),
    meio(clock(o.createdAt)),
    meio(delivery ? "ENTREGA" : "RETIRADA"),
    divider,
  ];

  for (const i of o.items) {
    // na bobina larga o preço cabe na mesma linha do item
    const titulo = `${i.quantity}x ${i.productName}`;
    const valor = formatCents(i.totalCents);
    if (titulo.length + valor.length + 2 <= width) {
      lines.push(linha(titulo, valor));
    } else {
      lines.push(...quebra(titulo, "   "), linha("", valor));
    }
    if (i.optionsText) lines.push(...quebra(i.optionsText, "     ").map((l, n) => (n === 0 ? `   ${l}` : l)));
    if (i.notes) lines.push(...quebra(`Obs.: ${i.notes}`, "     ").map((l, n) => (n === 0 ? `   ${l}` : l)));
  }

  lines.push(divider, linha("Subtotal", formatCents(o.subtotalCents)));
  if (delivery) lines.push(linha("Entrega", o.deliveryFeeCents > 0 ? formatCents(o.deliveryFeeCents) : "Gratis"));
  lines.push(linha("TOTAL", formatCents(o.totalCents)), divider);

  lines.push(...quebra(paymentText({ method: o.paymentMethod, cardType: o.payment?.cardType })));
  if (o.paymentMethod === "CASH") {
    lines.push(
      o.payment?.changeForCents
        ? `Troco para ${formatCents(o.payment.changeForCents)} (${formatCents(o.payment.changeForCents - o.totalCents)})`
        : "Sem troco",
    );
  }
  if (o.paymentMethod === "CARD") lines.push(delivery ? "Levar a maquininha" : "Pagar no balcao");

  lines.push(divider, ...quebra(`Cliente: ${o.customerName}`), formatPhone(o.customerWhatsapp));
  if (delivery) {
    lines.push("", ...quebra(`${o.deliveryStreet ?? ""}, ${o.deliveryNumber ?? ""}`.trim()));
    if (o.deliveryNeighborhood) lines.push(...quebra(o.deliveryNeighborhood));
    if (o.deliveryComplement) lines.push(...quebra(`Compl.: ${o.deliveryComplement}`));
    if (o.deliveryReference) lines.push(...quebra(`Ref.: ${o.deliveryReference}`));
  }
  if (o.notes) lines.push(divider, ...quebra(`Obs.: ${o.notes}`));

  return lines;
}

/** a via em texto puro, do jeito que a impressora recebe */
export const ticketText = (o: TicketOrder, restaurantName: string, paper: number = DEFAULT_PAPER) =>
  `${ticketLines(o, restaurantName, paper).join("\n")}\n\n\n`;
