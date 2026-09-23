import "server-only";

import { randomBytes } from "node:crypto";

import { z } from "zod";

import type { OrderType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatCents, todayKey } from "@/lib/format";
import { isOpenNow } from "@/lib/opening-hours";
import { optionsPrice, optionsText, selectionProblems } from "@/lib/options";
import { optionalText, parseMoneyToCents, phone, text } from "@/lib/validation";
import { queueNewOrderMessages } from "@/server/whatsapp/queue";

// Criação do pedido feito pelo cliente no site. Nada que vem do navegador é
// confiado: preço, taxa, disponibilidade e se o restaurante está aberto são
// conferidos aqui, com os dados do banco.

const MAX_LINES = 40;
const MAX_QTY = 50;
const RECENT_WINDOW_MS = 10 * 60 * 1000;
const MAX_RECENT_ORDERS = 5;

export class OrderError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

const itemsSchema = z
  .array(
    z.object({
      productId: z.string({ error: "Item inválido no carrinho." }).min(1, "Item inválido no carrinho.").max(40, "Item inválido no carrinho."),
      quantity: z
        .number({ error: "Quantidade inválida." })
        .int("Quantidade inválida.")
        .min(1, "Quantidade inválida.")
        .max(MAX_QTY, `Quantidade acima do permitido (máximo ${MAX_QTY} de cada).`),
      notes: z.string().trim().max(140, "Observação muito longa.").optional().default(""),
      optionIds: z.array(z.string().max(40), { error: "Opção inválida no carrinho." }).max(30).optional().default([]),
    }),
    { error: "Carrinho inválido." },
  )
  .min(1, "Seu carrinho está vazio.")
  .max(MAX_LINES, "Pedido com itens demais.");

export const checkoutSchema = z
  .object({
    customerName: text("Informe seu nome.", 80),
    customerWhatsapp: phone,
    type: z.enum(["DELIVERY", "PICKUP"], { error: "Escolha entrega ou retirada." }),
    street: optionalText(120),
    number: optionalText(20),
    complement: optionalText(80),
    neighborhood: optionalText(80),
    reference: optionalText(120),
    notes: optionalText(300),
    paymentMethod: z.enum(["PIX", "CARD", "CASH"], { error: "Escolha a forma de pagamento." }),
    cardType: z.enum(["CREDIT", "DEBIT"]).optional().catch(undefined),
    needsChange: z.enum(["nao", "sim"]).optional().catch(undefined),
    changeFor: optionalText(20),
  })
  .superRefine((v, ctx) => {
    if (v.paymentMethod === "CARD" && !v.cardType) {
      ctx.addIssue({ code: "custom", path: ["cardType"], message: "Escolha crédito ou débito." });
    }
    if (v.paymentMethod === "CASH") {
      if (!v.needsChange) ctx.addIssue({ code: "custom", path: ["needsChange"], message: "Diga se precisa de troco." });
      if (v.needsChange === "sim") {
        const cents = parseMoneyToCents(v.changeFor);
        if (cents === null || Number.isNaN(cents) || cents <= 0 || cents > 10_000_00) {
          ctx.addIssue({ code: "custom", path: ["changeFor"], message: "Informe para quanto é o troco. Ex.: 100,00" });
        }
      }
    }
    if (v.type !== "DELIVERY") return;
    if (!v.street) ctx.addIssue({ code: "custom", path: ["street"], message: "Informe a rua." });
    if (!v.number) ctx.addIssue({ code: "custom", path: ["number"], message: "Informe o número (ou s/n)." });
    if (!v.neighborhood) ctx.addIssue({ code: "custom", path: ["neighborhood"], message: "Informe o bairro." });
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function parseItems(raw: unknown) {
  let data: unknown;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new OrderError("Não consegui ler o carrinho. Atualize a página e tente de novo.");
  }
  const parsed = itemsSchema.safeParse(data);
  if (!parsed.success) throw new OrderError(parsed.error.issues[0]?.message ?? "Carrinho inválido.");
  return parsed.data;
}

/** código público do pedido (vai no link de acompanhamento): difícil de adivinhar */
function orderCode() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(12), (b) => alphabet[b % alphabet.length]).join("");
}

export async function placeOrder(params: {
  slug: string;
  input: CheckoutInput;
  items: z.infer<typeof itemsSchema>;
}) {
  const { input, items } = params;

  const restaurant = await db.restaurant.findUnique({
    where: { slug: params.slug },
    include: { openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } } },
  });
  if (!restaurant || restaurant.status !== "ACTIVE") throw new OrderError("Este restaurante não está recebendo pedidos.");
  if (!isOpenNow(restaurant.openMode, restaurant.openingHours)) {
    throw new OrderError("O restaurante fechou agora há pouco. Seu carrinho continua guardado.");
  }
  const type = input.type as OrderType;
  if (type === "DELIVERY" && !restaurant.deliveryEnabled) throw new OrderError("Este restaurante não faz entrega.", "type");
  if (type === "PICKUP" && !restaurant.pickupEnabled) throw new OrderError("Este restaurante não tem retirada no local.", "type");
  const method = input.paymentMethod;
  const accepted = method === "PIX" ? !!restaurant.pixKey : method === "CARD" ? restaurant.acceptsCard : restaurant.acceptsCash;
  if (!accepted) throw new OrderError("O restaurante não aceita essa forma de pagamento. Escolha outra.", "paymentMethod");

  // produtos: deste restaurante, disponíveis, em categoria visível
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await db.product.findMany({
    where: { id: { in: ids }, restaurantId: restaurant.id },
    select: {
      id: true,
      name: true,
      priceCents: true,
      promoPriceCents: true,
      available: true,
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
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = items.map((item) => {
    const product = byId.get(item.productId);
    if (!product || !product.category.active) {
      throw new OrderError("Um item do carrinho saiu do cardápio. Confira o carrinho e tente de novo.");
    }
    if (!product.available) throw new OrderError(`"${product.name}" esgotou. Tire do carrinho para continuar.`);
    // opções conferidas com o banco: o preço vem daqui, não do carrinho
    const problems = selectionProblems(product.optionGroups, item.optionIds);
    if (problems.length) {
      throw new OrderError(`"${product.name}" mudou no cardápio (${problems[0]}). Tire do carrinho e escolha de novo.`);
    }
    const unit = (product.promoPriceCents ?? product.priceCents) + optionsPrice(product.optionGroups, item.optionIds);
    return {
      productId: product.id,
      productName: product.name,
      optionsText: optionsText(product.optionGroups, item.optionIds),
      unitPriceCents: unit,
      quantity: item.quantity,
      notes: item.notes || null,
      totalCents: unit * item.quantity,
    };
  });

  const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  if (subtotalCents < restaurant.minOrderCents) {
    throw new OrderError(`O pedido mínimo deste restaurante é ${formatCents(restaurant.minOrderCents)}.`);
  }
  const deliveryFeeCents = type === "DELIVERY" ? restaurant.deliveryFeeCents : 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  const changeForCents = method === "CASH" && input.needsChange === "sim" ? parseMoneyToCents(input.changeFor) : null;
  if (changeForCents !== null && changeForCents < totalCents) {
    throw new OrderError(`O troco precisa ser para um valor igual ou maior que o total (${formatCents(totalCents)}).`, "changeFor");
  }
  // Pix: espera o pagamento; cartão e dinheiro: pagos na entrega ou no balcão
  const initialStatus = method === "PIX" ? "AWAITING_PAYMENT" : "NEW";

  // freio contra envio repetido/abuso: poucos pedidos por WhatsApp em 10 min
  const recent = await db.order.count({
    where: { customerWhatsapp: input.customerWhatsapp, createdAt: { gte: new Date(Date.now() - RECENT_WINDOW_MS) } },
  });
  if (recent >= MAX_RECENT_ORDERS) {
    throw new OrderError("Você fez vários pedidos em pouco tempo. Aguarde alguns minutos ou fale com o restaurante.");
  }

  const order = await db.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { whatsapp: input.customerWhatsapp },
      update: { name: input.customerName },
      create: { name: input.customerName, whatsapp: input.customerWhatsapp },
    });
    const address =
      type === "DELIVERY"
        ? await tx.address.create({
            data: {
              customerId: customer.id,
              street: input.street!,
              number: input.number!,
              complement: input.complement,
              neighborhood: input.neighborhood!,
              reference: input.reference,
              city: restaurant.city,
            },
          })
        : null;

    const today = todayKey();
    // número da comanda: recomeça em 1 a cada dia, como a comanda de papel.
    // Tudo numa instrução só, que trava a linha do restaurante: dois pedidos
    // ao mesmo tempo nunca saem com o mesmo número.
    const [{ orderSeq }] = await tx.$queryRaw<{ orderSeq: number }[]>`
      UPDATE "Restaurant"
      SET "orderSeq" = CASE WHEN "orderSeqDay" = ${today} THEN "orderSeq" + 1 ELSE 1 END,
          "orderSeqDay" = ${today}
      WHERE id = ${restaurant.id}
      RETURNING "orderSeq"
    `;

    const created = await tx.order.create({
      data: {
        restaurantId: restaurant.id,
        number: orderSeq,
        code: orderCode(),
        customerId: customer.id,
        customerName: input.customerName,
        customerWhatsapp: input.customerWhatsapp,
        addressId: address?.id,
        deliveryStreet: address?.street,
        deliveryNumber: address?.number,
        deliveryComplement: address?.complement,
        deliveryNeighborhood: address?.neighborhood,
        deliveryReference: address?.reference,
        type,
        paymentMethod: method,
        status: initialStatus,
        notes: input.notes,
        subtotalCents,
        deliveryFeeCents,
        totalCents,
        items: { create: lines },
        statusEvents: { create: { status: initialStatus, note: "Pedido feito pelo site" } },
        payment: {
          create: {
            method,
            status: "PENDING",
            amountCents: totalCents,
            ...(method === "PIX" ? { pixKey: restaurant.pixKey, pixKeyType: restaurant.pixKeyType } : {}),
            cardType: method === "CARD" ? (input.cardType ?? null) : null,
            changeForCents,
          },
        },
      },
      include: { items: true, payment: { select: { cardType: true, changeForCents: true } } },
    });

    // as instruções do Pix entram na fila junto com o pedido; ao restaurante,
    // o pedido chega pelo WhatsApp do próprio cliente (página do pedido)
    await queueNewOrderMessages(tx, { order: created, restaurant });
    return created;
  });

  return order;
}
