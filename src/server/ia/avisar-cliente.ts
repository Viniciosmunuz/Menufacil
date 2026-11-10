import "server-only";

import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { appUrl } from "@/lib/site";
import { variantes } from "./telefone";
import { enviarTexto } from "./zapi";

/**
 * O recado que vai para o cliente no WhatsApp quando algo acontece com o
 * pedido dele sem que ele tenha perguntado.
 *
 * Por que existe: no 100% Delivery o Pix é confirmado pelo Mercado Pago,
 * sozinho, e até aqui ninguém contava isso para quem pagou. A pessoa
 * mandava trinta e três reais e a conversa ficava muda -- o pedido entrava
 * na cozinha, o entregador saía, e ela só descobria se abrisse o link.
 *
 * **Só fala com quem já estava falando.** O aviso sai apenas para pedido
 * anotado pela IA, onde a conversa existe e foi o cliente que a começou.
 * Pedido feito no site não recebe nada: mandar mensagem para quem nunca
 * escreveu é justamente o que faz o WhatsApp banir um número -- e o canal
 * aqui é o WhatsApp Web, que cai sem aviso e sem recurso.
 *
 * Falhar aqui não pode derrubar o que veio antes. Quem chama é o webhook
 * do Mercado Pago, e para ele o que importa é o pagamento ter sido
 * registrado; um WhatsApp que não sai vira log, não vira erro.
 */
export async function avisarPagamentoConfirmado(orderId: string) {
  const pedido = await db.order.findUnique({
    where: { id: orderId },
    select: {
      number: true,
      code: true,
      type: true,
      totalCents: true,
      customerName: true,
      customerWhatsapp: true,
      feitoPelaIa: true,
      restaurantId: true,
      restaurant: { select: { atendenteIa: { select: { zapiChannelId: true, ativo: true } } } },
    },
  });

  if (!pedido?.feitoPelaIa || !pedido.customerWhatsapp) return;
  // sem canal da Z-API não há por onde falar: a Kapso não manda para
  // números brasileiros, que é o motivo de toda esta camada existir
  const ia = pedido.restaurant.atendenteIa;
  if (!ia?.ativo || !ia.zapiChannelId) return;

  const primeiroNome = pedido.customerName.trim().split(/\s+/)[0];
  const texto = [
    `Pagamento confirmado, ${primeiroNome}! ✅`,
    "",
    `Seu pedido *#${pedido.number}* de ${formatCents(pedido.totalCents)} já foi para a cozinha.`,
    "",
    pedido.type === "DELIVERY"
      ? `Acompanhe a entrega por aqui: ${appUrl()}/pedido/${pedido.code}`
      : `A gente te avisa quando estiver pronto para retirada: ${appUrl()}/pedido/${pedido.code}`,
  ].join("\n");

  try {
    await enviarTexto({ telefone: pedido.customerWhatsapp, texto });
  } catch (erro) {
    console.error(`[ia] falha ao avisar o pagamento do pedido #${pedido.number}:`, erro);
    return;
  }

  // Entra no histórico como fala da IA.
  //
  // Sem isto ela não saberia que o cliente já foi avisado, e responderia a
  // um "chegou?" como se o pagamento ainda estivesse em aberto.
  //
  // O contato é o da conversa, não o do pedido: o WhatsApp ainda manda
  // muito celular brasileiro sem o 9 da frente, e o pedido é gravado com
  // ele. Gravar pelo número do pedido abriria uma segunda conversa, que a
  // IA nunca leria.
  const daConversa = await db.iaMensagem.findFirst({
    where: { restaurantId: pedido.restaurantId, contato: { in: variantes(pedido.customerWhatsapp) } },
    orderBy: { createdAt: "desc" },
    select: { contato: true },
  });
  await db.iaMensagem
    .create({
      data: {
        restaurantId: pedido.restaurantId,
        contato: daConversa?.contato ?? pedido.customerWhatsapp,
        papel: "IA",
        texto,
      },
    })
    .catch((erro) => console.error("[ia] falha ao guardar o aviso no histórico:", erro));

  console.info(`[ia] avisou o pagamento do pedido #${pedido.number}`);
}
