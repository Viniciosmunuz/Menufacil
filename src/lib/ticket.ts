import type { CardType, OrderType, PaymentMethod } from "@/generated/prisma/enums";

import { formatCents, formatPhone } from "./format";
import { paymentText } from "./payment";

// Via do pedido para a impressora térmica. Só texto, na largura da bobina
// que o restaurante usa: 48 colunas na de 80 mm (o padrão) e 32 na de 58
// mm. A mesma via vai para a impressão pelo computador (a página /via),
// para o celular (RawBT) e para o Print Fácil.
//
// O desenho é pensado para quem lê correndo, de pé, no balcão: blocos
// separados por linhas, título de cada bloco em maiúsculas, valores
// alinhados à direita e cada escolha do produto em sua própria linha.

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

const clock = (date: Date | string) =>
  new Date(date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function ticketLines(o: TicketOrder, restaurantName: string, paper: number = DEFAULT_PAPER): string[] {
  const width = columnsFor(paper);
  const forte = "=".repeat(width);
  const fraco = "-".repeat(width);
  const margem = " "; // um respiro nas bordas do papel

  const meio = (texto: string) => {
    const sobra = Math.max(0, width - texto.length);
    return " ".repeat(Math.floor(sobra / 2)) + texto;
  };

  /** rótulo à esquerda, valor à direita, com margem nos dois lados */
  const entre = (esquerda: string, direita: string) => {
    const sobra = Math.max(1, width - esquerda.length - direita.length - margem.length * 2);
    return margem + esquerda + " ".repeat(sobra) + direita + margem;
  };

  /**
   * Quebra o texto sem cortar palavra. O recuo entra em todas as linhas e a
   * continuação ganha um degrau a mais, para se ver onde a frase continua.
   */
  const texto = (conteudo: string, recuo = 0, degrau = 0) => {
    const primeira = margem + " ".repeat(recuo);
    const seguinte = margem + " ".repeat(recuo + degrau);
    const saida: string[] = [];
    let atual = "";
    for (const palavra of conteudo.split(/\s+/).filter(Boolean)) {
      const prefixo = saida.length === 0 ? primeira : seguinte;
      if (atual && (prefixo + atual + " " + palavra).length > width - margem.length) {
        saida.push(prefixo + atual);
        atual = palavra;
      } else {
        atual = atual ? `${atual} ${palavra}` : palavra;
      }
    }
    if (atual) saida.push((saida.length === 0 ? primeira : seguinte) + atual);
    return saida;
  };

  const titulo = (nome: string) => [fraco, `${margem}${nome}`];
  const delivery = o.type === "DELIVERY";
  const lines: string[] = [];

  // cabeçalho: o restaurante, o número e como o cliente recebe
  lines.push(forte, meio(restaurantName.toUpperCase()), forte);
  lines.push(entre(`PEDIDO #${o.number}`, clock(o.createdAt)));
  lines.push(`${margem}${delivery ? "ENTREGA" : "RETIRADA NO LOCAL"}`);
  lines.push(forte);

  // itens: quantidade destacada, preço à direita, escolhas embaixo
  for (const item of o.items) {
    const quantidade = `${item.quantity}x`;
    const nome = `${quantidade.padEnd(4)}${item.productName}`;
    const valor = formatCents(item.totalCents);
    // só na mesma linha quando sobram dois espaços entre o nome e o preço
    if (nome.length + valor.length + 4 <= width) {
      lines.push(entre(nome, valor));
    } else {
      lines.push(...texto(nome, 0, 4), entre("", valor));
    }
    // cada escolha em uma linha: "Tamanho: Grande", "Sabor: Calabresa"
    for (const escolha of (item.optionsText ?? "").split(" · ").filter(Boolean)) {
      lines.push(...texto(escolha, 4, 2));
    }
    if (item.notes) lines.push(...texto(`Obs.: ${item.notes}`, 4, 2));
  }

  // contas
  lines.push(fraco, entre("Subtotal", formatCents(o.subtotalCents)));
  if (delivery) lines.push(entre("Entrega", o.deliveryFeeCents > 0 ? formatCents(o.deliveryFeeCents) : "Grátis"));
  lines.push(entre("TOTAL", formatCents(o.totalCents)), forte);

  // pagamento
  const troco = o.paymentMethod === "CASH" ? (o.payment?.changeForCents ?? null) : null;
  lines.push(`${margem}PAGAMENTO`);
  lines.push(...texto(paymentText({ method: o.paymentMethod, cardType: o.payment?.cardType, changeForCents: troco })));
  if (troco) lines.push(entre("Levar de troco", formatCents(troco - o.totalCents)));
  if (o.paymentMethod === "CARD") lines.push(...texto(delivery ? "Levar a maquininha" : "Pagar no balcão"));
  if (o.paymentMethod === "PIX") lines.push(...texto("Conferir o comprovante no WhatsApp"));

  // cliente
  lines.push(...titulo("CLIENTE"));
  lines.push(...texto(o.customerName), ...texto(formatPhone(o.customerWhatsapp)));

  // para onde vai
  if (delivery) {
    lines.push(...titulo("ENTREGAR EM"));
    lines.push(...texto(`${o.deliveryStreet ?? ""}, ${o.deliveryNumber ?? ""}`.trim()));
    if (o.deliveryNeighborhood) lines.push(...texto(o.deliveryNeighborhood));
    if (o.deliveryComplement) lines.push(...texto(o.deliveryComplement));
    if (o.deliveryReference) lines.push(...texto(`Ref.: ${o.deliveryReference}`));
  }

  // o que o cliente pediu por escrito
  if (o.notes) {
    lines.push(...titulo("OBSERVAÇÃO DO PEDIDO"));
    lines.push(...texto(o.notes));
  }

  lines.push(forte);
  return lines;
}

/** a via em texto puro, do jeito que a impressora recebe */
export const ticketText = (o: TicketOrder, restaurantName: string, paper: number = DEFAULT_PAPER) =>
  `${ticketLines(o, restaurantName, paper).join("\n")}\n\n\n`;
