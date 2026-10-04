import "server-only";

import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { formatCents, todayKey } from "@/lib/format";
import { acceptsAddons, addonProblems, addonsPrice, addonsText, MAX_POR_ADDON, type Addon, type AddonPick } from "@/lib/addons";
import { optionsPrice, optionsText, selectionProblems } from "@/lib/options";
import { flavorSlots, flavorsText, pizzaPrice, pizzaProblems, type PizzaFlavor } from "@/lib/pizza";

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

export type ItemDoTotem = {
  productId: string;
  quantity: number;
  notes?: string | null;
  optionIds?: string[];
  /** sabores da pizza montada, na ordem em que o cliente escolheu */
  flavorIds?: string[];
  /** acompanhamentos somados ao prato, com quantidade de cada */
  addons?: AddonPick[];
};

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
      allowAddons: true,
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

  // O totem mostra o cardápio inteiro, o mesmo do link -- pizza montada
  // inclusive. O catálogo de sabores só é buscado quando alguma linha é
  // pizza, como na criação do pedido do site.
  const temPizza = itens.some((i) => flavorSlots(porId.get(i.productId) ?? {}));
  const sabores: PizzaFlavor[] = temPizza
    ? (
        await db.product.findMany({
          where: { restaurantId, category: { pizzaFlavors: true, active: true } },
          orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
          select: {
            id: true,
            name: true,
            description: true,
            priceCents: true,
            promoPriceCents: true,
            available: true,
            category: { select: { id: true, name: true } },
            optionGroups: {
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { options: { orderBy: { sortOrder: "asc" }, select: { name: true, priceCents: true, available: true } } },
            },
          },
        })
      ).map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        priceCents: f.promoPriceCents ?? f.priceCents,
        available: f.available,
        sizes: (f.optionGroups[0]?.options ?? []).map((o) => ({ name: o.name, priceCents: o.priceCents, available: o.available })),
        categoryId: f.category.id,
        categoryName: f.category.name,
      }))
    : [];

  // Acompanhamentos, pela mesma razão: o cardápio do totem é o mesmo do
  // link, e o cliente do balcão vê a mesma lista de arroz e farofa dentro
  // do prato. O preço de cada um vem daqui, do banco.
  const temAddon = itens.some((i) => (i.addons ?? []).length > 0);
  const addons: Addon[] = temAddon
    ? (
        await db.product.findMany({
          where: { restaurantId, category: { addons: true, active: true } },
          orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
          select: { id: true, name: true, priceCents: true, promoPriceCents: true, available: true },
        })
      ).map((a) => ({ id: a.id, name: a.name, priceCents: a.promoPriceCents ?? a.priceCents, available: a.available }))
    : [];

  const linhas = itens.map((item) => {
    const produto = porId.get(item.productId);
    if (!produto || !produto.category.active) throw new TotemError("Um item saiu do cardápio. Comece o pedido de novo.");
    if (!produto.available) throw new TotemError(`"${produto.name}" acabou. Escolha outro item.`);

    const problemas = selectionProblems(produto.optionGroups, item.optionIds ?? []);
    if (problemas.length) throw new TotemError(`"${produto.name}" mudou no cardápio (${problemas[0]}). Escolha de novo.`);

    // pizza montada: os sabores são conferidos aqui, e o preço é o do mais
    // caro entre eles -- nunca a soma nem a média
    const vagas = flavorSlots(produto);
    const tamanho = vagas ? (produto.optionGroups[0]?.options.find((o) => (item.optionIds ?? []).includes(o.id))?.name ?? null) : null;
    if (vagas) {
      const ruins = pizzaProblems(sabores, item.flavorIds ?? [], vagas, tamanho);
      if (ruins.length) throw new TotemError(`"${produto.name}": ${ruins[0]}`);
    } else if ((item.flavorIds ?? []).length) {
      throw new TotemError(`"${produto.name}" não é uma pizza de sabores. Comece o pedido de novo.`);
    }

    const escolhasDeAddon = (item.addons ?? []).filter((a) => a.quantity > 0 && a.quantity <= MAX_POR_ADDON);
    if (escolhasDeAddon.length && !acceptsAddons(produto)) {
      throw new TotemError(`"${produto.name}" não aceita acompanhamento. Comece o pedido de novo.`);
    }
    const addonsRuins = addonProblems(addons, escolhasDeAddon);
    if (addonsRuins.length) throw new TotemError(`"${produto.name}": ${addonsRuins[0]}`);

    const base = vagas ? pizzaPrice(sabores, item.flavorIds ?? [], tamanho) : (produto.promoPriceCents ?? produto.priceCents);
    const unitario = base + optionsPrice(produto.optionGroups, item.optionIds ?? []) + addonsPrice(addons, escolhasDeAddon);
    const escolhas = [
      vagas ? flavorsText(sabores, item.flavorIds ?? [], vagas) : null,
      optionsText(produto.optionGroups, item.optionIds ?? []),
      addonsText(addons, escolhasDeAddon),
    ].filter(Boolean);

    return {
      productId: produto.id,
      productName: produto.name,
      optionsText: escolhas.length ? escolhas.join(" · ") : null,
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
  /** comer no local (true) ou levar (false) */
  comerAqui: boolean;
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
        dineIn: params.comerAqui,
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
            note: `Pedido feito no totem (${params.comerAqui ? "comer aqui" : "para viagem"}) e pago ${params.forma === "PIX" ? "por Pix" : "na maquininha"}`,
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
