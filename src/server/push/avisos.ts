import "server-only";

import webpush, { WebPushError } from "web-push";

import type { OrderType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { appUrl } from "@/lib/site";

// Avisos de pedido novo no celular do restaurante.
//
// Quem entrega não somos nós: o navegador do dono se cadastra num serviço
// de push (Google, no Android e no Chrome) e nos devolve um endereço. Nós
// guardamos esse endereço e, quando entra pedido, mandamos o aviso para
// ele. O serviço acorda o aparelho mesmo com tudo fechado.
//
// O conteúdo vai embaralhado com as duas chaves que o navegador nos deu:
// nem o Google lê o que está escrito. As chaves VAPID são a nossa
// identidade perante o serviço.
//
// Sem as chaves no ambiente, tudo isto desliga em silêncio: o painel
// esconde o botão e nenhum pedido deixa de ser registrado por causa disso.

/** entregas seguidas que falham antes de o aparelho ser esquecido */
const LIMITE_DE_FALHAS = 5;

export const pushLigado = () => !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;

export const chavePublicaDePush = () => process.env.VAPID_PUBLIC_KEY ?? null;

/** o serviço de push só aceita https ou mailto; em desenvolvimento o site é http */
function assunto() {
  const url = appUrl();
  if (url.startsWith("https://")) return url;
  return process.env.CONTACT_EMAIL ? `mailto:${process.env.CONTACT_EMAIL}` : "mailto:avisos@menufacildelivery.com.br";
}

function configurar() {
  webpush.setVapidDetails(assunto(), process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
}

type Aparelho = { id: string; endpoint: string; p256dh: string; auth: string; failures: number };

/**
 * Manda um aviso e cuida do que sobrou.
 *
 * Aparelho que o serviço diz não existir mais (404/410) sai na hora: é o
 * celular que desinstalou o navegador, limpou os dados ou desligou os
 * avisos por fora. Falha de rede não apaga nada de primeira — só depois
 * de errar seguido, para uma instabilidade do Google não desligar o aviso
 * do restaurante.
 */
async function entregar(aparelho: Aparelho, payload: string) {
  try {
    await webpush.sendNotification(
      { endpoint: aparelho.endpoint, keys: { p256dh: aparelho.p256dh, auth: aparelho.auth } },
      payload,
      { TTL: 900, urgency: "high" },
    );
    await db.pushDevice.update({ where: { id: aparelho.id }, data: { lastOkAt: new Date(), failures: 0 } });
    return true;
  } catch (erro) {
    const status = erro instanceof WebPushError ? erro.statusCode : 0;
    if (status === 404 || status === 410) {
      await db.pushDevice.delete({ where: { id: aparelho.id } }).catch(() => {});
      return false;
    }
    const falhas = aparelho.failures + 1;
    if (falhas >= LIMITE_DE_FALHAS) {
      await db.pushDevice.delete({ where: { id: aparelho.id } }).catch(() => {});
    } else {
      await db.pushDevice.update({ where: { id: aparelho.id }, data: { failures: falhas } }).catch(() => {});
    }
    console.error(`[avisos] falha ao avisar (${status || "sem status"}):`, erro instanceof Error ? erro.message : erro);
    return false;
  }
}

async function enviarParaORestaurante(restaurantId: string, conteudo: { titulo: string; corpo: string; tag: string }) {
  if (!pushLigado()) return 0;
  const aparelhos = await db.pushDevice.findMany({
    where: { restaurantId },
    select: { id: true, endpoint: true, p256dh: true, auth: true, failures: true },
  });
  if (aparelhos.length === 0) return 0;

  configurar();
  const payload = JSON.stringify({ ...conteudo, url: `/painel/${restaurantId}/pedidos` });
  const saidas = await Promise.all(aparelhos.map((a) => entregar(a, payload)));
  return saidas.filter(Boolean).length;
}

/** o pedido entrou: avisa todos os aparelhos do restaurante */
export async function avisarPedidoNovo(pedido: {
  id: string;
  number: number;
  restaurantId: string;
  type: OrderType;
  totalCents: number;
  customerName: string;
}) {
  return enviarParaORestaurante(pedido.restaurantId, {
    titulo: `Pedido #${pedido.number} · ${formatCents(pedido.totalCents)}`,
    corpo: `${pedido.customerName} · ${pedido.type === "DELIVERY" ? "Entrega" : "Retirada"}`,
    tag: `pedido-${pedido.id}`,
  });
}

/** 100% Delivery: o Mercado Pago confirmou o dinheiro deste pedido */
export async function avisarPagamentoConfirmado(pedido: {
  id: string;
  number: number;
  restaurantId: string;
  type: OrderType;
  totalCents: number;
  customerName: string;
}) {
  return enviarParaORestaurante(pedido.restaurantId, {
    titulo: `Pago · pedido #${pedido.number} · ${formatCents(pedido.totalCents)}`,
    corpo: `${pedido.customerName} · ${pedido.type === "DELIVERY" ? "Entrega" : "Retirada"}`,
    // tag diferente da do pedido novo: o aviso de pago não apaga o de entrada
    tag: `pago-${pedido.id}`,
  });
}

/** 100% Delivery: o cliente escreveu na conversa do pedido */
export async function avisarMensagemDoCliente(params: { restaurantId: string; orderNumber: number; texto: string }) {
  return enviarParaORestaurante(params.restaurantId, {
    titulo: `Mensagem no pedido #${params.orderNumber}`,
    corpo: params.texto.slice(0, 120),
    // uma mensagem nova substitui o aviso da anterior do mesmo pedido
    tag: `chat-${params.orderNumber}`,
  });
}

/** o dono apertou "testar": mesmo caminho de um pedido de verdade */
export async function avisarTeste(restaurantId: string) {
  return enviarParaORestaurante(restaurantId, {
    titulo: "Teste do MenuFácil",
    corpo: "Se você está vendo isto, os avisos estão funcionando.",
    tag: `teste-${Date.now()}`,
  });
}

/** o navegador se cadastrou: guarda (ou atualiza) o aparelho deste restaurante */
export async function guardarAparelho(entrada: {
  restaurantId: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  label: string | null;
}) {
  const { endpoint, ...resto } = entrada;
  await db.pushDevice.upsert({
    where: { endpoint },
    create: { endpoint, ...resto, failures: 0 },
    // o mesmo aparelho pode trocar de restaurante (dono com mais de um)
    update: { ...resto, failures: 0 },
  });
}

export async function esquecerAparelho(endpoint: string, restaurantId: string) {
  await db.pushDevice.deleteMany({ where: { endpoint, restaurantId } });
}

export async function contarAparelhos(restaurantId: string) {
  return db.pushDevice.count({ where: { restaurantId } });
}
