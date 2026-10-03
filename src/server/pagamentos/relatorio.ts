import "server-only";

import { db } from "@/lib/db";

// O que o admin da plataforma precisa ver do 100% Delivery de um
// restaurante, sem entrar no painel dele.
//
// A pergunta que isto responde é sempre a mesma, e é de suporte: "o
// restaurante ligou o modo e reclama que não entra pedido -- o que está
// faltando?". Então vem tudo junto: se o recurso está liberado, se o dono
// ligou, se a conta do Mercado Pago está de pé, se o webhook foi
// cadastrado, quantos pedidos passaram e quanto dinheiro.
//
// Valor transacionado é só o que o Mercado Pago confirmou. Pedido criado e
// não pago não entra: contar carrinho abandonado como faturamento daria
// número bonito e errado.

export type ResumoDoFullDelivery = {
  /** o admin liberou o recurso */
  liberado: boolean;
  /** o dono escolheu o 100% Delivery */
  ligado: boolean;
  conta: {
    conectada: boolean;
    /** conta de verdade, não credencial de teste */
    producao: boolean;
    mpUserId: string | null;
    conectadaEm: Date | null;
    webhook: boolean;
    ultimoErro: string | null;
  };
  pedidos: { total: number; pagos: number; esperandoPagamento: number };
  /** soma dos pagamentos que o Mercado Pago confirmou, em centavos */
  transacionadoCents: number;
  /** mensagens de cliente sem resposta, nas conversas em aberto */
  mensagensSemResposta: number;
};

// Sobre o webhook: ele não é mais coisa de cadastrar. O endereço do aviso
// vai junto com cada cobrança, já apontando para o restaurante certo --
// webhook no Mercado Pago mora dentro de uma aplicação de desenvolvedor, e
// quem só vende não tem nenhuma. A chave da assinatura continua no resumo
// porque quem veio do Totem tem aplicação própria e pode ter cadastrado
// uma; é camada a mais, nunca requisito.

/** o que falta para o modo funcionar, em uma frase; null quando está tudo de pé */
export function oQueFalta(r: ResumoDoFullDelivery): string | null {
  if (!r.liberado) return "O recurso não está liberado para este restaurante.";
  if (!r.ligado) return "Liberado, mas o dono ainda está no Pedido pelo WhatsApp.";
  if (!r.conta.conectada) return "Falta o dono conectar a conta do Mercado Pago.";
  if (!r.conta.producao) return "A conta ligada é de teste: nenhum pagamento de verdade vai entrar.";
  return null;
}

/**
 * Quando chegou o último aviso do Mercado Pago para este restaurante.
 *
 * Existe para responder, sem log e sem ninguém de plantão, à única pergunta
 * que não dá para responder olhando a tela: "o aviso automático está
 * chegando?". Com data recente, está. Vazio depois de vendas, não está --
 * e aí o pagamento só confirma enquanto o cliente deixa a tela aberta.
 */
export async function ultimoAvisoDoMercadoPago(restaurantId: string) {
  const ultimo = await db.mpWebhookEvent.findFirst({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return ultimo?.createdAt ?? null;
}

export async function resumoDoFullDelivery(restaurantId: string): Promise<ResumoDoFullDelivery | null> {
  const restaurante = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      fullDeliveryEnabled: true,
      deliveryMode: true,
      mercadoPago: {
        select: { accessToken: true, liveMode: true, mpUserId: true, connectedAt: true, webhookSecret: true, lastError: true },
      },
    },
  });
  if (!restaurante) return null;

  const where = { restaurantId, origin: "FULL_DELIVERY" as const };
  const [total, pagos, esperando, somaPaga, semResposta] = await Promise.all([
    db.order.count({ where }),
    db.order.count({ where: { ...where, payment: { status: "CONFIRMED" } } }),
    db.order.count({ where: { ...where, status: "AWAITING_PAYMENT" } }),
    db.payment.aggregate({
      where: { provider: "MERCADO_PAGO", status: "CONFIRMED", order: { restaurantId } },
      _sum: { amountCents: true },
    }),
    db.chatConversation.aggregate({
      where: { restaurantId, restaurantUnread: { gt: 0 }, order: { status: { notIn: ["COMPLETED", "CANCELED"] } } },
      _sum: { restaurantUnread: true },
    }),
  ]);

  const mp = restaurante.mercadoPago;
  return {
    liberado: restaurante.fullDeliveryEnabled,
    ligado: restaurante.deliveryMode === "FULL_DELIVERY",
    conta: {
      conectada: Boolean(mp?.accessToken),
      producao: mp?.liveMode ?? false,
      mpUserId: mp?.mpUserId ?? null,
      conectadaEm: mp?.connectedAt ?? null,
      webhook: Boolean(mp?.webhookSecret),
      ultimoErro: mp?.lastError ?? null,
    },
    pedidos: { total, pagos, esperandoPagamento: esperando },
    transacionadoCents: somaPaga._sum.amountCents ?? 0,
    mensagensSemResposta: semResposta._sum.restaurantUnread ?? 0,
  };
}
