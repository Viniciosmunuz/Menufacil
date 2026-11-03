import "server-only";

import type { MotivoDaOcorrencia } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import { setOrderStatus } from "../orders/update-order";

// Quem leva cada pedido, depois que ele saiu.
//
// A atribuição automática (um entregador disponível leva sem precisar
// aceitar) está em ./ao-sair.ts. Aqui ficam as mãos humanas: o dono
// escolhendo a dedo, o entregador pegando um pedido livre, confirmando a
// entrega e contando o que deu errado.
//
// A corrida entre dois celulares é resolvida no banco, não na tela: quem
// assume o pedido faz um UPDATE condicionado a ele ainda estar sem dono. O
// banco garante que só um desses updates encontra a linha; o outro recebe
// zero e vê o recado de que alguém pegou primeiro.

/** o dono escolhendo a dedo quem leva, pelo painel */
export async function atribuirNaMao(restaurantId: string, orderId: string, entregadorId: string | null) {
  const pedido = await db.order.findFirst({ where: { id: orderId, restaurantId, type: "DELIVERY" }, select: { id: true } });
  if (!pedido) return { ok: false as const, error: "Esse pedido não é de entrega." };

  if (entregadorId === null) {
    await db.order.update({ where: { id: orderId }, data: { entregadorId: null, atribuidoEm: null } });
    return { ok: true as const };
  }

  const alvo = await db.entregador.findFirst({ where: { id: entregadorId, restaurantId, ativo: true }, select: { id: true } });
  if (!alvo) return { ok: false as const, error: "Esse entregador não está ativo." };

  // o dono manda: tirar de um para dar a outro é decisão dele, e é por isso
  // que aqui não há a trava de "só se estiver sem dono"
  await db.order.update({ where: { id: orderId }, data: { entregadorId: alvo.id, atribuidoEm: new Date() } });
  return { ok: true as const };
}

/**
 * O entregador pegando um pedido livre.
 *
 * O `updateMany` com `entregadorId: null` é a trava: dois celulares tocando
 * ao mesmo tempo, só um encontra a linha ainda sem dono.
 */
export async function assumirPedido(restaurantId: string, entregadorId: string, orderId: string) {
  const { count } = await db.order.updateMany({
    where: { id: orderId, restaurantId, type: "DELIVERY", status: "OUT_FOR_DELIVERY", entregadorId: null },
    data: { entregadorId, atribuidoEm: new Date() },
  });
  if (count === 0) return { ok: false as const, error: "Outro entregador pegou este pedido primeiro." };
  return { ok: true as const };
}

/** devolver para a fila: ele pegou e não vai poder levar */
export async function devolverPedido(restaurantId: string, entregadorId: string, orderId: string) {
  const { count } = await db.order.updateMany({
    where: { id: orderId, restaurantId, entregadorId, status: "OUT_FOR_DELIVERY" },
    data: { entregadorId: null, atribuidoEm: null },
  });
  if (count === 0) return { ok: false as const, error: "Este pedido não está mais com você." };
  return { ok: true as const };
}

/**
 * A entrega confirmada pelo próprio entregador.
 *
 * É o ganho principal do módulo: o balcão deixa de marcar Entregue por
 * alguém que está na rua. Passa pelo mesmo `setOrderStatus` do painel --
 * mesma trava de status, mesmo histórico, mesmo aviso ao cliente --, e
 * não por um caminho paralelo que um dia divergiria.
 */
export async function confirmarEntrega(restaurantId: string, entregadorId: string, userId: string, orderId: string) {
  const pedido = await db.order.findFirst({
    where: { id: orderId, restaurantId, entregadorId, status: "OUT_FOR_DELIVERY" },
    select: { id: true, status: true },
  });
  if (!pedido) return { ok: false as const, error: "Este pedido não está mais com você." };

  const r = await setOrderStatus({
    orderId: pedido.id,
    from: pedido.status,
    to: "COMPLETED",
    actor: { userId, note: "Entrega confirmada pelo entregador" },
    restaurantId,
  });
  if (r.error) return { ok: false as const, error: r.error };
  return { ok: true as const };
}

/**
 * O que deu errado na porta.
 *
 * Não muda o status do pedido de propósito: "cliente não atende" não quer
 * dizer que a entrega acabou -- quer dizer que alguém do restaurante
 * precisa ligar. O pedido continua em rota, e o painel passa a mostrar a
 * ocorrência.
 */
export async function registrarOcorrencia(
  restaurantId: string,
  entregadorId: string,
  orderId: string,
  motivo: MotivoDaOcorrencia,
  descricao: string,
) {
  const pedido = await db.order.findFirst({ where: { id: orderId, restaurantId, entregadorId }, select: { id: true } });
  if (!pedido) return { ok: false as const, error: "Este pedido não está mais com você." };

  await db.ocorrenciaEntrega.create({
    data: { orderId: pedido.id, entregadorId, motivo, descricao: descricao.trim() || null },
  });
  return { ok: true as const };
}
