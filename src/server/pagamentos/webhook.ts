import { createHmac, timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";
import { verPagamento, situacaoDoPagamento } from "@/server/mercado-pago/api";
import { avisarPagamentoConfirmado } from "@/server/push/avisos";

import { credenciaisDePagamento } from "./conta";
import { confirmarPagamentoAprovado, registrarPagamentoParado, type DadosDoPagamentoMp } from "./pix";

// Aviso de pagamento do Mercado Pago, para o 100% Delivery.
//
// O endereço vai no "notification_url" de cada cobrança, com o id do
// restaurante na ponta (?r=...): é assim que sabemos de qual conta veio o
// aviso, já que todos usam contas diferentes e a mesma URL. Ninguém
// cadastra nada no painel do Mercado Pago.
//
// O que o aviso traz é só um id. Nada é feito com base no que ele diz: o
// servidor pega o id, pergunta ao Mercado Pago (com o token do próprio
// restaurante) como está aquele pagamento e trabalha com a resposta. É por
// isso que um POST forjado não aprova pedido nenhum -- ele levaria o
// servidor a consultar um pagamento que não está aprovado.
//
// A assinatura (x-signature) é conferida quando ela vem junto e há chave
// guardada; aí um aviso mal assinado é recusado antes de gastar consulta.
// Aviso sem assinatura passa e é conferido pela consulta -- ver o porquê
// lá embaixo, onde isso é decidido.
//
// Idempotência: o Mercado Pago reenvia o mesmo aviso e manda vários pelo
// mesmo pagamento. Cada aviso entra em MpWebhookEvent com uma chave única
// antes de qualquer coisa ser feita -- chave repetida sai na hora. E a troca
// de status ainda é guardada pelo `where` do updateMany, para o caso de dois
// avisos diferentes chegarem no mesmo instante.

/**
 * Assinatura do Mercado Pago: o cabeçalho traz "ts=...,v1=...", e o que é
 * assinado é "id:<data.id>;request-id:<x-request-id>;ts:<ts>;".
 */
/** o aviso veio assinado? só então faz sentido conferir a assinatura */
function temAssinatura(request: Request) {
  const a = request.headers.get("x-signature") ?? "";
  return a.includes("ts=") && a.includes("v1=");
}

function assinaturaConfere(request: Request, chave: string, dataId: string) {
  const assinatura = request.headers.get("x-signature") ?? "";
  const partes = Object.fromEntries(
    assinatura.split(",").map((p) => {
      const [k, ...resto] = p.split("=");
      return [k?.trim() ?? "", resto.join("=").trim()];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const requestId = request.headers.get("x-request-id") ?? "";
  const base = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const esperado = createHmac("sha256", chave).update(base).digest("hex");

  const a = Buffer.from(esperado, "utf8");
  const b = Buffer.from(v1, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** o aviso já passou por aqui? grava a chave e diz se é novidade */
async function avisoNovo(eventKey: string, restaurantId: string, mpPaymentId: string, payload: object) {
  try {
    await db.mpWebhookEvent.create({ data: { eventKey, restaurantId, mpPaymentId, payload }, select: { id: true } });
    return true;
  } catch {
    // chave repetida: este aviso já foi tratado
    return false;
  }
}

/** sempre 200 para o que não é nosso: o Mercado Pago reenvia o que falha */
const ok = () => Response.json({ ok: true });

export async function webhookDoPagamento(request: Request) {
  const url = new URL(request.url);
  const restaurantId = url.searchParams.get("r") ?? "";
  const dataIdNaQuery = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";

  let corpo: { type?: unknown; action?: unknown; data?: { id?: unknown } } = {};
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    // corpo vazio acontece no teste do painel do Mercado Pago
  }

  const tipo = String(corpo.type ?? url.searchParams.get("type") ?? "");
  const dataId = String(corpo.data?.id ?? dataIdNaQuery ?? "");

  if (!restaurantId || !dataId) return ok();
  if (tipo && tipo !== "payment") return ok();

  const contas = await credenciaisDePagamento(restaurantId);
  if (!contas) return ok();

  // A assinatura é conferida quando ela vem. Quando não vem, o aviso passa.
  //
  // Parece frouxo e não é: o aviso traz só um id, e logo abaixo o servidor
  // pergunta ao próprio Mercado Pago, com o token do restaurante, o que
  // aconteceu com aquele pagamento. Um POST forjado levaria o servidor a
  // consultar um pagamento que não está aprovado -- e nada acontece.
  //
  // Antes era o contrário: bastava existir uma chave guardada para o aviso
  // sem assinatura ser recusado com 401. E é exatamente o caso de quem veio
  // do Totem, que tem a chave da aplicação do Totem guardada enquanto a
  // cobrança do delivery sai com o endereço de aviso no próprio pagamento,
  // sem assinatura da mesma chave. O aviso era descartado, e a confirmação
  // só acontecia se o cliente ficasse com a tela aberta.
  if (contas.webhookSecret && temAssinatura(request) && !assinaturaConfere(request, contas.webhookSecret, dataId)) {
    return Response.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  // a verdade vem da consulta, não do aviso
  const consulta = await verPagamento(contas.accessToken, dataId);
  if (!consulta.ok) return ok();
  const dados = consulta.dados as DadosDoPagamentoMp;

  // a chave junta o pagamento e a situação dele: o aviso de "criado" e o de
  // "aprovado" do mesmo Pix são dois avisos diferentes, e os dois devem
  // passar; o mesmo aviso reenviado três vezes passa uma
  const eventKey = `${restaurantId}:${dados.id}:${String(dados.status ?? "?")}`;
  if (!(await avisoNovo(eventKey, restaurantId, String(dados.id), dados as object))) return ok();

  // qual pedido é este: pela referência que mandamos, ou pelo id do
  // pagamento que já ficou guardado quando o QR nasceu
  const referencia = dados.external_reference ?? null;
  const pagamento = await db.payment.findFirst({
    where: {
      order: { restaurantId },
      OR: [...(referencia ? [{ mpReference: referencia }] : []), { mpPaymentId: String(dados.id) }],
    },
    select: { id: true, status: true, order: { select: { id: true, number: true, type: true, totalCents: true, customerName: true } } },
  });
  if (!pagamento) return ok();

  const situacao = situacaoDoPagamento(dados.status);

  if (situacao === "aprovado") {
    const virou = await confirmarPagamentoAprovado({
      paymentId: pagamento.id,
      orderId: pagamento.order.id,
      restaurantId,
      dados,
    });
    // o painel se atualiza sozinho pelo canal de eventos (o pedido mudou);
    // o aviso no celular é para quem está com o painel fechado
    if (virou.virou) {
      try {
        await avisarPagamentoConfirmado({ ...pagamento.order, restaurantId });
      } catch {
        // aviso é extra: o pedido já está pago no sistema
      }
    }
    return ok();
  }

  if (situacao === "recusado" || situacao === "cancelado") {
    await registrarPagamentoParado({ paymentId: pagamento.id, situacao, dados });
  }
  return ok();
}
