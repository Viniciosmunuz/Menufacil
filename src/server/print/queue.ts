import "server-only";

import type { PrintRole } from "@/generated/prisma/enums";

import { db } from "@/lib/db";
import { OPEN_ORDER_STATUSES } from "@/lib/labels";
import { pedeSecao } from "@/lib/nomes-parecidos";
import { EXCLUDE_UNPAID } from "@/lib/order-flow";
import { receiptLines, receiptText, ticketLines, ticketText } from "@/lib/ticket";

import { secoesQuePedemDestaque } from "./secoes";

// A fila do Print Fácil: os pedidos que ainda não saíram no papel daquele
// restaurante. O "printedAt" é a trava contra imprimir duas vezes — o
// programa só marca depois que a impressora aceitou a via.
//
// Um pedido de totem rende dois papéis, em duas impressoras diferentes:
//
// - COMANDA: a cozinha, na impressora do computador do balcão. É a via de
//   sempre, com tudo que o cozinheiro precisa.
// - SENHA: o recibo do cliente, na impressora do próprio tablet. Sai só com
//   o que ele pediu, quanto pagou e a senha.
//
// Cada papel tem a sua trava (printedAt e senhaPrintedAt), então um não
// atrapalha o outro: a cozinha não deixa de receber porque o tablet já
// imprimiu, e nenhum dos dois sai duas vezes. Quem não tem totem continua
// como sempre — toda impressora nasce COMANDA.

/** pedido velho não sai do nada quando o programa liga depois de horas */
const WINDOW_HOURS = 12;
const BATCH = 10;

const ticketSelect = {
  id: true,
  number: true,
  code: true,
  createdAt: true,
  type: true,
  dineIn: true,
  origin: true,
  customerName: true,
  customerWhatsapp: true,
  deliveryStreet: true,
  deliveryNumber: true,
  deliveryComplement: true,
  deliveryNeighborhood: true,
  deliveryReference: true,
  notes: true,
  subtotalCents: true,
  deliveryFeeCents: true,
  totalCents: true,
  paymentMethod: true,
  payment: { select: { cardType: true, changeForCents: true } },
  items: {
    orderBy: { id: "asc" },
    select: {
      productName: true,
      optionsText: true,
      quantity: true,
      totalCents: true,
      notes: true,
      product: { select: { category: { select: { name: true } } } },
    },
  },
} as const;

/** o que falta sair naquela impressora, conforme o papel dela */
const aindaNaoSaiu = (role: PrintRole) =>
  role === "SENHA"
    ? // a impressora de senha só olha pedido de totem: pedido de delivery
      // não tem senha para o cliente levar
      { origin: "TOTEM" as const, senhaPrintedAt: null }
    : { printedAt: null };

export function pendingOrders(restaurantId: string, role: PrintRole = "COMANDA") {
  return db.order.findMany({
    where: {
      restaurantId,
      ...aindaNaoSaiu(role),
      status: { in: [...OPEN_ORDER_STATUSES] },
      // 100% Delivery: a via só sai depois que o Mercado Pago confirmou
      ...EXCLUDE_UNPAID,
      createdAt: { gte: new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true, number: true, createdAt: true, printRuns: true },
  });
}

/** a via pronta: o mesmo texto que sai pela impressão do navegador */
export async function orderTicket(restaurantId: string, orderId: string, role: PrintRole = "COMANDA") {
  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId },
    select: { ...ticketSelect, restaurant: { select: { name: true, receiptWidth: true } } },
  });
  if (!order) return null;

  const paper = order.restaurant.receiptWidth;
  // só pedido de totem tem recibo de cliente; se a impressora de senha
  // pedir a via de um pedido de delivery, sai a comanda normal
  const senha = role === "SENHA" && order.origin === "TOTEM";
  const monta = senha ? { linhas: receiptLines, texto: receiptText } : { linhas: ticketLines, texto: ticketText };
  // quais pratos precisam dizer a seção; o recibo do cliente não leva seção
  const secoes = senha ? undefined : await secoesQuePedemDestaque(restaurantId);

  return {
    id: order.id,
    numero: order.number,
    codigo: order.code,
    criadoEm: order.createdAt.toISOString(),
    // a largura vem do painel: 80 mm por padrão, 58 mm para bobina estreita
    papel_mm: paper,
    // qual dos dois papéis é este, para a térmica dar o destaque certo
    papel: senha ? ("senha" as const) : ("comanda" as const),
    // texto pronto, para a impressora comum do Windows
    texto: monta.texto(order, order.restaurant.name, paper, secoes),
    linhas: monta.linhas(order, order.restaurant.name, paper, secoes),
    // os mesmos dados em partes, para a térmica ESC/POS dar destaque ao
    // número do pedido, ao total e ao que o cliente escreveu
    dados: {
      papel: senha ? ("senha" as const) : ("comanda" as const),
      restaurante: order.restaurant.name,
      numero: order.number,
      criado_em: order.createdAt.toISOString(),
      tipo: order.type,
      origem: order.origin,
      comer_aqui: order.dineIn,
      cliente: { nome: order.customerName, whatsapp: order.customerWhatsapp },
      endereco: {
        rua: order.deliveryStreet,
        numero: order.deliveryNumber,
        complemento: order.deliveryComplement,
        bairro: order.deliveryNeighborhood,
        referencia: order.deliveryReference,
      },
      itens: order.items.map((i) => ({
        quantidade: i.quantity,
        nome: i.productName,
        // A seção entra como a primeira "opção" do item, e não como campo
        // novo, de propósito: o programa do balcão já imprime a lista de
        // opções, então a seção aparece na comanda sem ninguém precisar
        // atualizar o Menu Fácil para PC nem o aplicativo do totem.
        opcoes: [
          ...(i.product?.category?.name && pedeSecao(secoes, i.productName)
            ? [`[${i.product.category.name.toUpperCase()}]`]
            : []),
          ...(i.optionsText ?? "").split(" · ").filter(Boolean),
        ],
        observacao: i.notes,
        total_centavos: i.totalCents,
      })),
      subtotal_centavos: order.subtotalCents,
      entrega_centavos: order.deliveryFeeCents,
      total_centavos: order.totalCents,
      pagamento: {
        forma: order.paymentMethod,
        cartao: order.payment?.cardType ?? null,
        troco_para_centavos: order.payment?.changeForCents ?? null,
      },
      observacao: order.notes,
    },
  };
}

/** só marca quem ainda não estava marcado: dois programas não duplicam a via */
export async function markOrderPrinted(restaurantId: string, orderId: string, role: PrintRole = "COMANDA") {
  const agora = new Date();
  const { count } = await db.order.updateMany({
    where: { id: orderId, restaurantId, ...aindaNaoSaiu(role) },
    data: role === "SENHA" ? { senhaPrintedAt: agora } : { printedAt: agora },
  });
  return { marcado: count > 0 };
}
