import "server-only";

import { db } from "@/lib/db";

import { avisarPessoas } from "../push/avisos";

// A atribuição automática e o aviso, no momento em que o pedido sai.
//
// Mora num arquivo só dela porque quem a chama é o setOrderStatus, lá em
// src/server/orders -- e o resto da atribuição (aceitar, confirmar) chama
// o setOrderStatus de volta. Separados, não há import em círculo.
//
// A regra é a do dono: **com um único entregador disponível, o pedido já
// sai no nome dele.** Ele não aceita nada -- abre o celular e a entrega já
// está com ele; o que lhe resta é confirmar quando entregar. Pedir aceite
// a quem é o único na rua seria cerimônia, e um toque a mais na calçada.
//
// Com dois ou mais disponíveis, o pedido fica livre e aparece para todos:
// aí sim o primeiro que aceitar leva.

/** os que podem receber pedido agora: ligados pelo dono e disponíveis */
function disponiveis(restaurantId: string) {
  return db.entregador.findMany({
    where: { restaurantId, ativo: true, disponibilidade: "DISPONIVEL" },
    select: { id: true, userId: true, nome: true },
  });
}

/**
 * Chamado quando o pedido passa para "Saiu para entrega".
 *
 * Só mexe em pedido de entrega. Com exatamente um entregador disponível, a
 * entrega sai no nome dele e o celular dele apita dizendo que é dele. Com
 * vários, o pedido fica livre e todos recebem o aviso de que há entrega
 * esperando -- é a corrida, e quem aceitar primeiro leva.
 *
 * Com nenhum disponível o pedido fica na fila de "aguardando entregador",
 * inclusive quando o restaurante tem um só cadastrado e ele não se marcou
 * disponível: dar a entrega a quem disse que não está na rua seria pior do
 * que deixá-la à vista de todos.
 *
 * Nunca lança: se algo aqui falhar, o pedido continua andando. A entrega
 * não pode parar porque o módulo de entregadores teve um problema.
 */
export async function atribuirAoSair(restaurantId: string, orderId: string) {
  try {
    const pedido = await db.order.findFirst({
      where: { id: orderId, restaurantId, type: "DELIVERY", entregadorId: null },
      select: { id: true, number: true, customerName: true, deliveryNeighborhood: true },
    });
    if (!pedido) return;

    const livres = await disponiveis(restaurantId);
    if (livres.length === 0) return;

    const onde = pedido.deliveryNeighborhood ? ` · ${pedido.deliveryNeighborhood}` : "";
    const url = `/entregador/${restaurantId}`;

    if (livres.length === 1) {
      const { count } = await db.order.updateMany({
        where: { id: orderId, entregadorId: null },
        data: { entregadorId: livres[0].id, atribuidoEm: new Date() },
      });
      if (!count) return;
      await avisarPessoas(restaurantId, [livres[0].userId], {
        titulo: `Entrega sua: pedido #${pedido.number}`,
        corpo: `${pedido.customerName}${onde}`,
        tag: `entrega-${pedido.id}`,
        url,
      });
      return;
    }

    // vários na rua: o pedido fica livre e todos ficam sabendo
    await avisarPessoas(
      restaurantId,
      livres.map((e) => e.userId),
      {
        titulo: `Pedido #${pedido.number} esperando quem leve`,
        corpo: `${pedido.customerName}${onde} · o primeiro que aceitar leva`,
        tag: `entrega-${pedido.id}`,
        url,
      },
    );
  } catch {
    // o pedido saiu do mesmo jeito; quem leva se resolve na tela
  }
}
