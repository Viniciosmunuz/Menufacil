import "server-only";

import { db } from "@/lib/db";
import { isOpenNow } from "@/lib/opening-hours";

/**
 * A loja está aberta agora?
 *
 * O painel inteiro já sabia disso no alto da tela, pelo layout. A tela de
 * Pedidos não sabia, e passou a precisar: com a loja fechada e pedido
 * ainda em preparo, o passo que fala com o cliente pede confirmação antes
 * de mandar o "saiu para entrega" -- fora do movimento, o dono às vezes
 * está acertando o status de um pedido de horas antes, e aquele aviso
 * assusta quem já recebeu.
 *
 * Consulta própria e pequena, em vez de carregar pelo acesso: são dois
 * campos, e o `isOpenNow` já respeita o botão de abrir e fechar (OPEN e
 * CLOSED mandam no horário cadastrado).
 */
export async function lojaAbertaAgora(restaurantId: string) {
  const r = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      openMode: true,
      openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
    },
  });
  // restaurante que não existe não está fechado: é outro problema, e quem
  // o trata é o controle de acesso, antes daqui
  if (!r) return true;
  return isOpenNow(r.openMode, r.openingHours);
}
