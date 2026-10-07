import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { todayKey } from "@/lib/format";

// Lançar itens numa mesa.
//
// Cada envio vira um Order com origem SALAO, apontando para a comanda. É o
// mesmo pedido do delivery: mesma numeração do dia, mesma fila de
// impressão, mesmos relatórios. O salão não tem um segundo sistema de
// pedido -- tem um canal a mais no que já existe.
//
// A comanda nasce no primeiro lançamento. Ninguém "abre mesa" como passo
// separado: o garçom toca nos pratos e salva, e a mesa fica aberta porque
// agora tem pedido nela. Um botão de abrir antes de lançar seria um toque
// a mais para dizer o que o lançamento já disse.

export type ItemParaLancar = { produtoId: string; quantidade: number; observacao?: string | null };

export type ResultadoDoLancamento = { ok: true; orderId: string; numero: number } | { ok: false; error: string };

/** oito caracteres, como o código público dos outros pedidos */
const codigo = () => randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

export async function lancarNaMesa(
  restaurantId: string,
  mesaId: string,
  garcomUserId: string,
  itens: ItemParaLancar[],
): Promise<ResultadoDoLancamento> {
  if (itens.length === 0) return { ok: false, error: "Escolha pelo menos um item." };

  const mesa = await db.mesa.findFirst({ where: { id: mesaId, restaurantId, ativa: true }, select: { id: true, numero: true, tipo: true } });
  if (!mesa) return { ok: false, error: "Mesa não encontrada." };

  // os preços vêm do banco, nunca da tela: o que o navegador manda é o que
  // a pessoa escolheu, não quanto custa
  const produtos = await db.product.findMany({
    where: { id: { in: itens.map((i) => i.produtoId) }, restaurantId },
    select: { id: true, name: true, priceCents: true, promoPriceCents: true, available: true },
  });
  const porId = new Map(produtos.map((p) => [p.id, p]));

  const linhas = itens.map((i) => {
    const p = porId.get(i.produtoId);
    if (!p) throw new Error("produto fora deste restaurante");
    const unit = p.promoPriceCents ?? p.priceCents;
    const quantidade = Math.max(1, Math.min(99, Math.floor(i.quantidade)));
    return {
      productId: p.id,
      productName: p.name,
      unitPriceCents: unit,
      quantity: quantidade,
      totalCents: unit * quantidade,
      notes: i.observacao?.trim() || null,
    };
  });

  const esgotado = itens.find((i) => porId.get(i.produtoId)?.available === false);
  if (esgotado) return { ok: false, error: `${porId.get(esgotado.produtoId)?.name} está esgotado.` };

  const subtotal = linhas.reduce((s, l) => s + l.totalCents, 0);
  const rotulo = mesa.tipo === "BALCAO" ? "Balcão" : "Mesa";

  const resultado = await db.$transaction(async (tx) => {
    // a comanda aberta da mesa, ou uma nova
    let comanda = await tx.comanda.findFirst({ where: { mesaId: mesa.id, fechadaAt: null }, select: { id: true } });
    if (!comanda) {
      comanda = await tx.comanda.create({
        data: { restaurantId, mesaId: mesa.id, garcomUserId, status: "OCUPADA" },
        select: { id: true },
      });
    }

    const hoje = todayKey();
    // mesma instrução de numeração do delivery: trava a linha do
    // restaurante, então dois garçons salvando ao mesmo tempo nunca tiram
    // o mesmo número
    const [{ orderSeq }] = await tx.$queryRaw<{ orderSeq: number }[]>`
      UPDATE "Restaurant"
      SET "orderSeq" = CASE WHEN "orderSeqDay" = ${hoje} THEN "orderSeq" + 1 ELSE 1 END,
          "orderSeqDay" = ${hoje}
      WHERE id = ${restaurantId}
      RETURNING "orderSeq"
    `;

    // o "cliente" de uma mesa é a própria mesa: o pedido do salão não tem
    // alguém para avisar depois, e inventar um cadastro por mesa encheria a
    // lista de clientes com "Mesa 7" para sempre
    const cliente = await tx.customer.upsert({
      where: { whatsapp: "00000000000" },
      update: {},
      create: { name: "Salão", whatsapp: "00000000000" },
      select: { id: true },
    });

    const order = await tx.order.create({
      data: {
        restaurantId,
        comandaId: comanda.id,
        number: orderSeq,
        code: codigo(),
        customerId: cliente.id,
        customerName: `${rotulo} ${mesa.numero}`,
        customerWhatsapp: "00000000000",
        type: "PICKUP",
        origin: "SALAO",
        paymentMethod: "CASH",
        // já entra em preparo: no salão não há aceite -- quem lançou foi o
        // próprio restaurante, e a comanda sai direto para a cozinha
        status: "PREPARING",
        subtotalCents: subtotal,
        deliveryFeeCents: 0,
        totalCents: subtotal,
        items: { create: linhas },
        statusEvents: { create: { status: "PREPARING", note: "Lançado no salão", changedByUserId: garcomUserId } },
      },
      select: { id: true, number: true },
    });

    return order;
  });

  return { ok: true, orderId: resultado.id, numero: resultado.number };
}
