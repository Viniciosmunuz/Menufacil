import "server-only";

import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { noAr } from "@/lib/features";
import { appUrl } from "@/lib/site";
import { statusNoticeText } from "@/server/whatsapp/messages";

import { variantes } from "./telefone";
import { canalConfigurado, enviarTexto } from "./zapi";

import type { OrderStatus, OrderType } from "@/generated/prisma/enums";

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
/**
 * O canal deste restaurante é o canal pelo qual este servidor envia?
 *
 * O envio sai sempre pelo `ZAPI_CHANNEL_ID` do ambiente, que é um por
 * instalação. Hoje só existe um número e a pergunta é sempre sim; no dia
 * em que um segundo restaurante conectar o dele, esta conferência é o que
 * impede o aviso de um sair pelo WhatsApp do outro -- falha visível e
 * registrada, em vez de mensagem na conversa errada.
 */
function ehONossoCanal(zapiChannelId: string | null) {
  const nosso = canalConfigurado();
  if (!zapiChannelId || !nosso) return false;
  if (zapiChannelId !== nosso) {
    console.warn(`[ia] o canal do restaurante (…${zapiChannelId.slice(-6)}) não é o deste servidor: não vou avisar o cliente`);
    return false;
  }
  return true;
}

export async function avisarClienteDoPagamento(orderId: string) {
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
      restaurant: { select: { iaEnabled: true, atendenteIa: { select: { zapiChannelId: true, ativo: true } } } },
    },
  });

  if (!pedido?.feitoPelaIa || !pedido.customerWhatsapp) return;
  // as mesmas quatro condições de `iaAvisaOCliente`: a plataforma liberou,
  // o dono ligou, o atendente está ativo e existe canal conectado. Sem
  // canal da Z-API não há por onde falar -- a Kapso não manda para números
  // brasileiros, que é o motivo de toda esta camada existir.
  if (!noAr("iaEnabled") || !pedido.restaurant.iaEnabled) return;
  const ia = pedido.restaurant.atendenteIa;
  if (!ia?.ativo || !ehONossoCanal(ia.zapiChannelId)) return;

  // Sem link de acompanhamento aqui.
  //
  // O pagamento é confirmado antes de o restaurante aceitar o pedido, e
  // o link aberto nessa hora mostra um pedido que ainda não foi aceito:
  // quem paga e clica na mesma hora vê uma tela que não diz nada e volta
  // para a conversa perguntando se deu certo. Quem manda o link é o
  // aviso de pedido aceito, logo adiante neste arquivo, quando já existe
  // o que acompanhar.
  // Este aviso fala do dinheiro, e só dele.
  //
  // Dizia "já foi para a cozinha", o que não era verdade ainda: o Pix
  // cair não faz ninguém aceitar o pedido. Quem conta que a cozinha
  // começou é o aviso de aceite, logo adiante neste arquivo, quando o
  // restaurante de fato aceitou. Cada aviso com um assunto só -- senão o
  // cliente recebe a mesma notícia duas vezes e nenhuma delas no momento
  // em que ela é verdade.
  const primeiroNome = pedido.customerName.trim().split(/\s+/)[0];
  const texto = [
    `Pagamento confirmado, ${primeiroNome}! ✅`,
    "",
    `Recebemos o Pix do pedido *#${pedido.number}*, de ${formatCents(pedido.totalCents)}.`,
    "Avisamos assim que o restaurante confirmar.",
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

/**
 * A IA está de plantão neste restaurante?
 *
 * Três coisas ao mesmo tempo: a plataforma liberou o recurso, o dono ligou
 * no painel dele, e existe um canal do WhatsApp conectado. Faltando
 * qualquer uma, quem avisa o cliente continua sendo o dono, no dedo.
 */
export async function iaAvisaOCliente(restaurantId: string) {
  if (!noAr("iaEnabled")) return false;
  const r = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { iaEnabled: true, atendenteIa: { select: { ativo: true, zapiChannelId: true } } },
  });
  return Boolean(r?.iaEnabled && r.atendenteIa?.ativo && ehONossoCanal(r.atendenteIa.zapiChannelId));
}

/**
 * "Saiu para entrega" e "está pronto", mandados pela IA.
 *
 * Antes disto o dono tocava no botão e o WhatsApp abria com a mensagem
 * escrita, para ele tocar em enviar -- duas telas e dois toques por
 * pedido, no meio do movimento. Quem mandava cinco entregas juntas pela
 * seleção em lote não mandava aviso nenhum: não dá para abrir cinco
 * conversas de uma vez.
 *
 * Agora, com a IA ligada, a mensagem sai no mesmo instante em que o
 * status muda, pelo mesmo número e com o mesmo texto de sempre. O botão
 * do painel para de abrir o WhatsApp -- quem cuida disso é `iaAvisa` em
 * `nextStatusNotice`, senão o cliente receberia tudo duas vezes.
 *
 * Diferente do aviso de pagamento, este vai para **todo** pedido com
 * WhatsApp, e não só para os anotados pela IA: é exatamente a mensagem
 * que o dono já mandava na mão, para alguém que acabou de pedir e está
 * esperando. O que muda é quem aperta.
 */
export async function avisarStatusDoPedido(orderId: string, status: OrderStatus) {
  const pedido = await db.order.findUnique({
    where: { id: orderId },
    select: {
      number: true,
      code: true,
      type: true,
      customerWhatsapp: true,
      restaurantId: true,
      restaurant: {
        select: {
          name: true,
          entregadorEnabled: true,
          iaEnabled: true,
          atendenteIa: { select: { ativo: true, zapiChannelId: true, ignorados: true } },
        },
      },
    },
  });
  if (!pedido?.customerWhatsapp) return;

  const r = pedido.restaurant;
  const ia = r.atendenteIa;
  if (!noAr("iaEnabled") || !r.iaEnabled || !ia?.ativo || !ehONossoCanal(ia.zapiChannelId)) return;

  // a lista de quem a IA nunca responde vale aqui também: é o celular do
  // dono, da família, de quem não quer saber de robô
  const digitos = pedido.customerWhatsapp.replace(/\D/g, "");
  if (ia.ignorados.some((n) => n.replace(/\D/g, "") === digitos)) return;

  const texto = (await textoDoAceite(orderId, pedido, r, status)) ?? statusNoticeText(pedido, r, status);
  if (!texto) return;

  try {
    await enviarTexto({ telefone: pedido.customerWhatsapp, texto });
  } catch (erro) {
    console.error(`[ia] falha ao avisar o status do pedido #${pedido.number}:`, erro);
    return;
  }

  // Só entra no histórico se já houver conversa com este número.
  //
  // Pedido feito no site recebe o aviso, mas não vira atendimento: abrir
  // uma conversa no histórico faria a IA tratar o silêncio dele como fio
  // de uma conversa que nunca existiu.
  const daConversa = await db.iaMensagem.findFirst({
    where: { restaurantId: pedido.restaurantId, contato: { in: variantes(pedido.customerWhatsapp) } },
    orderBy: { createdAt: "desc" },
    select: { contato: true },
  });
  if (daConversa) {
    await db.iaMensagem
      .create({ data: { restaurantId: pedido.restaurantId, contato: daConversa.contato, papel: "IA", texto } })
      .catch((erro) => console.error("[ia] falha ao guardar o aviso no histórico:", erro));
  }

  console.info(`[ia] avisou "${status}" do pedido #${pedido.number}`);
}

/** os dois status que querem dizer "o restaurante viu e aceitou" */
const ACEITE: OrderStatus[] = ["CONFIRMED", "PREPARING"];

/**
 * "Recebemos seu pedido, já está em preparo."
 *
 * O aviso que não existia: até aqui o cliente mandava o pedido e ficava
 * sem saber se alguém tinha olhado. O caminho do dono nunca teve esta
 * mensagem -- abrir o WhatsApp três vezes por pedido seria demais --, mas
 * para a IA não custa nada, e é o momento em que a pessoa está mais
 * ansiosa.
 *
 * Sai uma vez só. Dependendo do fluxo o pedido passa por CONFIRMED e
 * depois por PREPARING, e "recebemos seu pedido" duas vezes seguidas faz
 * parecer que o sistema está com defeito: se o outro status já aconteceu,
 * esta mensagem fica quieta.
 */
async function textoDoAceite(
  orderId: string,
  pedido: { number: number; code: string; type: OrderType },
  r: { name: string },
  status: OrderStatus,
) {
  if (!ACEITE.includes(status)) return null;
  const jaPassou = await db.orderStatusEvent.count({
    where: { orderId, status: { in: ACEITE.filter((s) => s !== status) } },
  });
  if (jaPassou > 0) return null;

  return [
    `Pedido *#${pedido.number}* em *${r.name}*: confirmado! 👨‍🍳`,
    "",
    pedido.type === "DELIVERY"
      ? "Já está em preparo. Avisamos assim que sair para entrega."
      : "Já está em preparo. Avisamos assim que estiver pronto para retirada.",
    "",
    `Acompanhe por aqui: ${appUrl()}/pedido/${pedido.code}`,
  ].join("\n");
}
