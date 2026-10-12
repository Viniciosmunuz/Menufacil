import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { todayKey } from "@/lib/format";

// Mexer na mesa depois que ela já está de pé: apagar a comanda inteira,
// trocar a mesa de lugar e mandar item de uma mesa para outra.
//
// São as três coisas que acontecem no salão e que nenhuma tela resolvia:
// a mesa aberta por engano, o grupo que mudou de mesa no meio do jantar e
// o prato lançado na mesa errada. Até aqui o jeito era apagar item por
// item e lançar tudo de novo do outro lado -- com o preço de hoje, não o
// da hora do pedido.
//
// Quem pode é o dono e o Garçom II. A conferência de quem chamou fica na
// ação; aqui mora o que acontece com os dados.

/** oito caracteres, como o código público dos outros pedidos */
const codigo = () => randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

export type Resultado = { ok: true } | { ok: false; error: string };

/** a comanda aberta desta mesa, com o que já foi recebido */
async function comandaAberta(restaurantId: string, comandaId: string) {
  return db.comanda.findFirst({
    where: { id: comandaId, restaurantId, fechadaAt: null },
    select: {
      id: true,
      mesaId: true,
      orders: { where: { status: { not: "CANCELED" } }, select: { id: true } },
      pagamentos: { select: { id: true } },
    },
  });
}

/**
 * Apaga a comanda inteira e devolve a mesa.
 *
 * Mesa aberta por engano, cliente que desistiu antes de a cozinha
 * começar, comanda duplicada na correria: o que havia era apagar item por
 * item e depois liberar a mesa.
 *
 * Os pedidos vão para cancelado em vez de sumir do banco -- a cozinha já
 * pode ter impresso, e o relatório do dia precisa mostrar que aquilo foi
 * cancelado, não que nunca existiu. O que some mesmo são os recebimentos:
 * dinheiro lançado numa conta que foi apagada vira caixa sobrando no
 * fechamento.
 */
export async function apagarComanda(restaurantId: string, comandaId: string, userId: string): Promise<Resultado> {
  const c = await comandaAberta(restaurantId, comandaId);
  if (!c) return { ok: false, error: "Mesa não encontrada." };

  await db.$transaction([
    ...c.orders.map((o) =>
      db.order.update({
        where: { id: o.id },
        data: {
          status: "CANCELED",
          statusEvents: { create: { status: "CANCELED", note: "Comanda apagada", changedByUserId: userId } },
        },
        select: { id: true },
      }),
    ),
    db.pagamentoComanda.deleteMany({ where: { comandaId: c.id } }),
    db.comanda.update({
      where: { id: c.id },
      data: { fechadaAt: new Date(), status: "LIVRE", descontoCents: 0, servicoCents: 0 },
      select: { id: true },
    }),
  ]);

  return { ok: true };
}

/**
 * Leva a comanda inteira para outra mesa.
 *
 * O grupo trocou de mesa, ou a comanda foi aberta na mesa errada. A
 * comanda é a mesma -- itens, pagamentos, hora de abertura e garçom
 * continuam de pé --, só muda onde ela está.
 *
 * A mesa de destino precisa estar livre. Juntar duas comandas numa mesa
 * só é outra conversa (a conta de quem estava lá some de vista), e o
 * caminho para isso é mover os itens, abaixo.
 */
export async function trocarDeMesa(restaurantId: string, comandaId: string, mesaDestinoId: string): Promise<Resultado> {
  const c = await comandaAberta(restaurantId, comandaId);
  if (!c) return { ok: false, error: "Mesa não encontrada." };
  if (c.mesaId === mesaDestinoId) return { ok: false, error: "A comanda já está nessa mesa." };

  const destino = await db.mesa.findFirst({
    where: { id: mesaDestinoId, restaurantId },
    select: { id: true, numero: true, nome: true, comandas: { where: { fechadaAt: null }, select: { id: true }, take: 1 } },
  });
  if (!destino) return { ok: false, error: "Mesa de destino não encontrada." };
  if (destino.comandas.length > 0) return { ok: false, error: `A ${destino.nome ?? "mesa " + destino.numero} já está ocupada.` };

  await db.comanda.update({ where: { id: c.id }, data: { mesaId: destino.id }, select: { id: true } });
  return { ok: true };
}

/**
 * Manda itens desta comanda para a comanda de outra mesa.
 *
 * O prato lançado na mesa errada, ou a pessoa que mudou de mesa levando o
 * que já pediu. Move o item com o preço que ele tinha quando foi pedido:
 * relançar do outro lado cobraria o preço de agora.
 *
 * Se a mesa de destino ainda não tem comanda aberta, ela nasce aqui --
 * mandar um prato para uma mesa vazia é o mesmo que sentar alguém nela.
 */
export async function moverItens(
  restaurantId: string,
  comandaId: string,
  itemIds: string[],
  mesaDestinoId: string,
  userId: string,
): Promise<Resultado> {
  if (itemIds.length === 0) return { ok: false, error: "Escolha o que vai mudar de mesa." };

  const c = await comandaAberta(restaurantId, comandaId);
  if (!c) return { ok: false, error: "Mesa não encontrada." };
  if (c.mesaId === mesaDestinoId) return { ok: false, error: "Os itens já estão nessa mesa." };

  const destino = await db.mesa.findFirst({
    where: { id: mesaDestinoId, restaurantId },
    select: { id: true, numero: true, tipo: true, comandas: { where: { fechadaAt: null }, select: { id: true }, take: 1 } },
  });
  if (!destino) return { ok: false, error: "Mesa de destino não encontrada." };

  const itens = await db.orderItem.findMany({
    where: { id: { in: itemIds }, order: { restaurantId, origin: "SALAO", comandaId: c.id, status: { not: "CANCELED" } } },
    select: {
      id: true,
      productId: true,
      productName: true,
      unitPriceCents: true,
      quantity: true,
      totalCents: true,
      notes: true,
      optionsText: true,
      order: { select: { id: true, subtotalCents: true, totalCents: true, _count: { select: { items: true } } } },
    },
  });
  if (itens.length === 0) return { ok: false, error: "Item não encontrado nesta mesa." };

  const soma = itens.reduce((s, i) => s + i.totalCents, 0);

  await db.$transaction(async (tx) => {
    const destinoComandaId =
      destino.comandas[0]?.id ??
      (
        await tx.comanda.create({
          data: { restaurantId, mesaId: destino.id, garcomUserId: userId, status: "OCUPADA" },
          select: { id: true },
        })
      ).id;

    // a mesa de destino recebe os itens num pedido só: para a cozinha eles
    // já saíram, e o que importa agora é de quem é a conta. A numeração é
    // a mesma instrução do lançamento, que trava a linha do restaurante.
    const hoje = todayKey();
    const [{ orderSeq }] = await tx.$queryRaw<{ orderSeq: number }[]>`
      UPDATE "Restaurant"
      SET "orderSeq" = CASE WHEN "orderSeqDay" = ${hoje} THEN "orderSeq" + 1 ELSE 1 END,
          "orderSeqDay" = ${hoje}
      WHERE id = ${restaurantId}
      RETURNING "orderSeq"
    `;
    const cliente = await tx.customer.upsert({
      where: { whatsapp: "00000000000" },
      update: {},
      create: { name: "Salão", whatsapp: "00000000000" },
      select: { id: true },
    });
    const rotulo = destino.tipo === "BALCAO" ? "Balcão" : "Mesa";

    await tx.order.create({
      data: {
        restaurantId,
        comandaId: destinoComandaId,
        number: orderSeq,
        code: codigo(),
        customerId: cliente.id,
        customerName: `${rotulo} ${destino.numero}`,
        customerWhatsapp: "00000000000",
        type: "PICKUP",
        origin: "SALAO",
        // já estava em preparo na mesa de origem: mudar de conta não
        // devolve o prato para a fila da cozinha
        status: "PREPARING",
        paymentMethod: "CASH",
        subtotalCents: soma,
        deliveryFeeCents: 0,
        totalCents: soma,
        statusEvents: { create: { status: "PREPARING", note: "Itens vindos de outra mesa", changedByUserId: userId } },
        items: {
          create: itens.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            unitPriceCents: i.unitPriceCents,
            quantity: i.quantity,
            totalCents: i.totalCents,
            notes: i.notes,
            optionsText: i.optionsText,
          })),
        },
      },
      select: { id: true },
    });

    // e saem da conta de origem, pedido por pedido
    for (const i of itens) {
      await tx.orderItem.delete({ where: { id: i.id }, select: { id: true } });
      const sobrando = await tx.orderItem.count({ where: { orderId: i.order.id } });
      if (sobrando === 0) {
        await tx.order.update({
          where: { id: i.order.id },
          data: {
            status: "CANCELED",
            statusEvents: { create: { status: "CANCELED", note: "Itens mudaram de mesa", changedByUserId: userId } },
          },
          select: { id: true },
        });
        continue;
      }
      await tx.order.update({
        where: { id: i.order.id },
        data: {
          subtotalCents: { decrement: i.totalCents },
          totalCents: { decrement: i.totalCents },
        },
        select: { id: true },
      });
    }
  });

  return { ok: true };
}


export type MesaDestino = { id: string; rotulo: string; ocupada: boolean };

/**
 * As mesas para onde dá para mandar a comanda ou os itens.
 *
 * Vêm todas, com a marca de ocupada: a mesa ocupada não serve para trocar
 * a comanda de lugar, mas serve para mover itens -- é o caso de duas
 * pessoas da mesma turma sentadas em mesas diferentes.
 */
export async function mesasParaDestino(restaurantId: string, exceto: string): Promise<MesaDestino[]> {
  const mesas = await db.mesa.findMany({
    where: { restaurantId, ativa: true, id: { not: exceto } },
    orderBy: [{ tipo: "asc" }, { numero: "asc" }],
    select: { id: true, numero: true, nome: true, tipo: true, comandas: { where: { fechadaAt: null }, select: { id: true }, take: 1 } },
  });

  return mesas.map((m) => ({
    id: m.id,
    rotulo: m.nome ?? `${m.tipo === "BALCAO" ? "Balcão" : "Mesa"} ${m.numero}`,
    ocupada: m.comandas.length > 0,
  }));
}
