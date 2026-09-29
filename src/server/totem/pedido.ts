import "server-only";

import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { formatCents, todayKey } from "@/lib/format";
import { optionsPrice, optionsText, selectionProblems } from "@/lib/options";

// O pedido feito no totem.
//
// Ele vira um pedido igual aos outros, e isso é de propósito: assim
// aparece na aba Pedidos, sai na impressora do balcão que já está ligada
// ali e entra nos números da visão geral, sem nenhuma tela nova para o
// dono aprender. O que o separa é a coluna "origin", que a lista e a via
// mostram como "Totem".
//
// O preço nunca vem do totem: é recalculado aqui com o cardápio do banco,
// pela mesma razão que o pedido do site é recalculado no servidor.
//
// Esta pasta não conversa com o módulo do WhatsApp: nenhuma mensagem é
// enfileirada para um pedido do totem, porque o cliente está no balcão.

export class TotemError extends Error {}

export type ItemDoTotem = { productId: string; quantity: number; notes?: string | null; optionIds?: string[] };

const MAX_LINHAS = 40;
const MAX_QTD = 50;

/** código público do pedido, no mesmo formato dos outros */
function codigoDoPedido() {
  const alfabeto = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(12), (b) => alfabeto[b % alfabeto.length]).join("");
}

export type Conta = {
  linhas: {
    productId: string;
    productName: string;
    optionsText: string | null;
    unitPriceCents: number;
    quantity: number;
    notes: string | null;
    totalCents: number;
  }[];
  subtotalCents: number;
  totalCents: number;
};

/**
 * Confere o carrinho do totem contra o cardápio e devolve a conta.
 *
 * É chamado duas vezes: antes de mandar a cobrança para a maquininha e de
 * novo na hora de gravar o pedido. Entre uma e outra alguém pode ter
 * esgotado um produto no painel, e é melhor descobrir antes de imprimir.
 */
export async function conferirCarrinho(restaurantId: string, itens: ItemDoTotem[]): Promise<Conta> {
  if (!Array.isArray(itens) || itens.length === 0) throw new TotemError("O carrinho está vazio.");
  if (itens.length > MAX_LINHAS) throw new TotemError("Pedido com itens demais.");

  for (const item of itens) {
    if (!item?.productId || typeof item.productId !== "string") throw new TotemError("Item inválido no carrinho.");
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QTD) {
      throw new TotemError("Quantidade inválida.");
    }
  }

  const ids = [...new Set(itens.map((i) => i.productId))];
  const produtos = await db.product.findMany({
    where: { id: { in: ids }, restaurantId },
    select: {
      id: true,
      name: true,
      priceCents: true,
      promoPriceCents: true,
      available: true,
      pizzaFlavors: true,
      category: { select: { active: true } },
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          minSelect: true,
          maxSelect: true,
          halfHalf: true,
          halfFromOptionId: true,
          options: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, priceCents: true, available: true } },
        },
      },
    },
  });
  const porId = new Map(produtos.map((p) => [p.id, p]));

  const linhas = itens.map((item) => {
    const produto = porId.get(item.productId);
    if (!produto || !produto.category.active) throw new TotemError("Um item saiu do cardápio. Comece o pedido de novo.");
    if (!produto.available) throw new TotemError(`"${produto.name}" acabou. Escolha outro item.`);
    // A pizza montada por sabores tem tela própria no cardápio do link. No
    // totem ela ainda não existe, e adivinhar o preço aqui sairia errado.
    if (produto.pizzaFlavors) throw new TotemError(`"${produto.name}" só pode ser pedido no balcão. Chame o atendente.`);

    const problemas = selectionProblems(produto.optionGroups, item.optionIds ?? []);
    if (problemas.length) throw new TotemError(`"${produto.name}" mudou no cardápio (${problemas[0]}). Escolha de novo.`);

    const base = produto.promoPriceCents ?? produto.priceCents;
    const unitario = base + optionsPrice(produto.optionGroups, item.optionIds ?? []);
    const escolhas = optionsText(produto.optionGroups, item.optionIds ?? []);

    return {
      productId: produto.id,
      productName: produto.name,
      optionsText: escolhas || null,
      unitPriceCents: unitario,
      quantity: item.quantity,
      notes: (item.notes ?? "").trim().slice(0, 140) || null,
      totalCents: unitario * item.quantity,
    };
  });

  const subtotalCents = linhas.reduce((soma, l) => soma + l.totalCents, 0);
  if (subtotalCents <= 0) throw new TotemError("O carrinho está vazio.");

  // o totem é balcão: não tem taxa de entrega
  return { linhas, subtotalCents, totalCents: subtotalCents };
}

/**
 * Cliente do balcão: uma linha só por restaurante, porque Order exige um
 * cliente e no totem ninguém digita telefone. O nome que a pessoa escreveu
 * na tela vai no próprio pedido, que é onde o balcão lê.
 */
function clienteDoBalcao(restaurantId: string, nomeDoRestaurante: string) {
  const chave = `totem-${restaurantId}`;
  return db.customer.upsert({
    where: { whatsapp: chave },
    update: {},
    create: { name: `Totem · ${nomeDoRestaurante}`.slice(0, 80), whatsapp: chave },
    select: { id: true },
  });
}

/**
 * Grava o pedido já pago (cartão na maquininha ou Pix pelo QR). Entra
 * como CONFIRMED porque o dinheiro já entrou: para a cozinha, é pedido
 * para fazer agora.
 */
export async function criarPedidoDoTotem(params: {
  restaurantId: string;
  nome: string;
  itens: ItemDoTotem[];
  observacao?: string | null;
  /** como foi pago: cartão na maquininha ou Pix pelo QR da tela */
  forma: "CARD" | "PIX";
}) {
  const restaurante = await db.restaurant.findUnique({
    where: { id: params.restaurantId },
    select: { id: true, name: true, status: true, totemEnabled: true, minOrderCents: true },
  });
  if (!restaurante) throw new TotemError("Restaurante não encontrado.");
  if (!restaurante.totemEnabled) throw new TotemError("O totem não está liberado para este restaurante.");
  if (restaurante.status !== "ACTIVE") throw new TotemError("Este restaurante não está recebendo pedidos.");

  const conta = await conferirCarrinho(restaurante.id, params.itens);
  if (conta.subtotalCents < restaurante.minOrderCents) {
    throw new TotemError(`O pedido mínimo é ${formatCents(restaurante.minOrderCents)}.`);
  }

  const cliente = await clienteDoBalcao(restaurante.id, restaurante.name);
  const nome = params.nome.trim().slice(0, 80) || "Cliente do totem";

  return db.$transaction(async (tx) => {
    const hoje = todayKey();
    // Mesma numeração das outras comandas: #1 a cada dia, numa instrução
    // só, para dois totens nunca tirarem o mesmo número.
    const [{ orderSeq }] = await tx.$queryRaw<{ orderSeq: number }[]>`
      UPDATE "Restaurant"
      SET "orderSeq" = CASE WHEN "orderSeqDay" = ${hoje} THEN "orderSeq" + 1 ELSE 1 END,
          "orderSeqDay" = ${hoje}
      WHERE id = ${restaurante.id}
      RETURNING "orderSeq"
    `;

    return tx.order.create({
      data: {
        restaurantId: restaurante.id,
        number: orderSeq,
        code: codigoDoPedido(),
        customerId: cliente.id,
        customerName: nome,
        // ninguém digita WhatsApp no balcão; a via e o painel já tratam o vazio
        customerWhatsapp: "",
        type: "PICKUP",
        origin: "TOTEM",
        paymentMethod: params.forma,
        // o dinheiro já entrou (cartão ou Pix): para a cozinha, é para fazer
        status: "CONFIRMED",
        notes: (params.observacao ?? "").trim().slice(0, 300) || null,
        subtotalCents: conta.subtotalCents,
        deliveryFeeCents: 0,
        totalCents: conta.totalCents,
        items: { create: conta.linhas },
        statusEvents: {
          create: {
            status: "CONFIRMED",
            note: params.forma === "PIX" ? "Pedido feito no totem e pago por Pix" : "Pedido feito no totem e pago na maquininha",
          },
        },
        payment: {
          create: { method: params.forma, status: "CONFIRMED", amountCents: conta.totalCents, confirmedAt: new Date() },
        },
      },
      select: { id: true, number: true, code: true, totalCents: true, createdAt: true },
    });
  });
}
