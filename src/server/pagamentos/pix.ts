import "server-only";

import { db } from "@/lib/db";
import { appUrl } from "@/lib/site";
import { criarPix, situacaoDoPagamento, verPagamento } from "@/server/mercado-pago/api";

import { anotarErro, credenciaisDePagamento } from "./conta";

// Pix do 100% Delivery.
//
// O QR nasce na conta do próprio restaurante, pela API do Mercado Pago. O
// cliente paga pelo aplicativo do banco e quem diz que o dinheiro entrou é
// o Mercado Pago -- pelo webhook, ou pela consulta que a própria tela do
// cliente faz enquanto está aberta.
//
// A regra que manda em tudo aqui: ninguém marca um pedido como pago por ter
// aberto a tela do Pix ou por ter dito que pagou. Só a resposta do Mercado
// Pago, com o valor conferido, vira PAGO.

/** quanto tempo o QR vale; é o mesmo do /v1/payments do módulo do Mercado Pago */
const MINUTOS_DO_QR = 10;

export type PixDoPedido = {
  copiaECola: string;
  qrBase64: string | null;
  venceEm: Date | null;
  totalCents: number;
};

function referencia(orderId: string) {
  // o id do pedido já é único; o sufixo deixa gerar outro QR quando o
  // primeiro vence, sem brigar com o índice único de mpReference
  return `mf-${orderId}-${Date.now().toString(36)}`;
}

const aindaVale = (venceEm: Date | null | undefined) => !!venceEm && venceEm.getTime() - Date.now() > 30_000;

/**
 * O QR do pedido.
 *
 * A página do cliente chama isto a cada desenho, e ela se redesenha de
 * poucos em poucos segundos. Por isso o padrão é **não** criar cobrança
 * nova: enquanto existir um QR guardado, ele é devolvido como está, válido
 * ou vencido. Vencido, quem decide gerar outro é a pessoa, no botão.
 *
 * Sem essa trava, uma aba esquecida aberta criava uma cobrança de verdade
 * na conta do restaurante a cada dez minutos, para sempre.
 *
 * "renovar" é o caminho do botão: aí sim nasce um QR novo.
 */
export async function pixDoPedido(
  orderId: string,
  { renovar = false }: { renovar?: boolean } = {},
): Promise<{ ok: true; pix: PixDoPedido } | { ok: false; erro: string }> {
  const pedido = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      restaurantId: true,
      status: true,
      totalCents: true,
      restaurant: { select: { name: true } },
      payment: { select: { id: true, status: true, pixQrCode: true, pixQrBase64: true, pixExpiresAt: true, amountCents: true } },
    },
  });
  if (!pedido?.payment) return { ok: false, erro: "Pedido não encontrado." };
  const pagamento = pedido.payment;

  if (pagamento.status === "CONFIRMED") return { ok: false, erro: "Este pedido já está pago." };
  // já existe QR e ninguém pediu outro: devolve esse, mesmo vencido. A tela
  // mostra a contagem zerada e o botão de gerar outro
  if (pagamento.pixQrCode && (renovar ? aindaVale(pagamento.pixExpiresAt) : true)) {
    return {
      ok: true,
      pix: {
        copiaECola: pagamento.pixQrCode,
        qrBase64: pagamento.pixQrBase64,
        venceEm: pagamento.pixExpiresAt,
        totalCents: pagamento.amountCents,
      },
    };
  }

  const contas = await credenciaisDePagamento(pedido.restaurantId);
  if (!contas) {
    return { ok: false, erro: "O restaurante ainda não ligou a conta do Mercado Pago. Fale com ele para pagar de outro jeito." };
  }

  const ref = referencia(pedido.id);
  const criado = await criarPix({
    accessToken: contas.accessToken,
    amountCents: pagamento.amountCents,
    descricao: `${pedido.restaurant.name} · pedido ${pedido.number}`,
    referencia: ref,
    // o aviso deste pagamento vem direto para a porta deste restaurante,
    // sem ninguém cadastrar endereço em painel nenhum
    notificationUrl: `${appUrl()}/api/pagamento/webhook?r=${pedido.restaurantId}`,
  });
  if (!criado.ok) {
    await anotarErro(pedido.restaurantId, criado.erro);
    return { ok: false, erro: "Não consegui gerar o Pix agora. Tente de novo em instantes." };
  }

  const dados = criado.dados.point_of_interaction?.transaction_data;
  const copiaECola = dados?.qr_code;
  if (!copiaECola) {
    await anotarErro(pedido.restaurantId, "O Mercado Pago não devolveu o código do Pix.");
    return { ok: false, erro: "Não consegui gerar o Pix agora. Tente de novo em instantes." };
  }

  const venceEm = new Date(Date.now() + MINUTOS_DO_QR * 60 * 1000);
  await db.payment.update({
    where: { id: pagamento.id },
    data: {
      provider: "MERCADO_PAGO",
      status: "PENDING",
      mpPaymentId: String(criado.dados.id),
      mpReference: ref,
      pixQrCode: copiaECola,
      pixQrBase64: dados.qr_code_base64 ?? null,
      pixExpiresAt: venceEm,
      lastEvent: criado.dados as object,
    },
    select: { id: true },
  });

  return { ok: true, pix: { copiaECola, qrBase64: dados.qr_code_base64 ?? null, venceEm, totalCents: pagamento.amountCents } };
}

// ---- confirmação ---------------------------------------------------------

export type DadosDoPagamentoMp = {
  id: number | string;
  status: string;
  transaction_amount?: number;
  external_reference?: string;
};

export type ResultadoDaConfirmacao =
  | { virou: true }
  | { virou: false; motivo: "ja_estava" | "nao_aprovado" | "valor_diferente" | "sem_pagamento" };

/**
 * O caminho único por onde um pedido do 100% Delivery vira PAGO.
 *
 * Tanto o webhook quanto a consulta da tela do cliente passam por aqui, e
 * os dois podem chegar ao mesmo tempo. Quem vira a linha é um só: o
 * `updateMany` com o status antigo no `where` é a trava -- o segundo a
 * chegar não acha nada para atualizar e vai embora sem fazer nada.
 *
 * O valor é conferido antes: pagamento de valor diferente do pedido não
 * vira pago, fica registrado para o restaurante olhar.
 */
export async function confirmarPagamentoAprovado(params: {
  paymentId: string;
  orderId: string;
  restaurantId: string;
  dados: DadosDoPagamentoMp;
}): Promise<ResultadoDaConfirmacao> {
  const { paymentId, orderId, dados } = params;

  const pagamento = await db.payment.findUnique({ where: { id: paymentId }, select: { id: true, status: true, amountCents: true } });
  if (!pagamento) return { virou: false, motivo: "sem_pagamento" };
  if (pagamento.status === "CONFIRMED") return { virou: false, motivo: "ja_estava" };
  if (situacaoDoPagamento(dados.status) !== "aprovado") return { virou: false, motivo: "nao_aprovado" };

  // o valor vem em reais do Mercado Pago; aqui tudo é centavo
  const pagoCents = Math.round((dados.transaction_amount ?? 0) * 100);
  if (pagoCents !== pagamento.amountCents) {
    await db.payment.update({
      where: { id: pagamento.id },
      data: {
        lastEvent: { valor_diferente: true, esperado_centavos: pagamento.amountCents, pago_centavos: pagoCents, mp: dados as object },
      },
      select: { id: true },
    });
    return { virou: false, motivo: "valor_diferente" };
  }

  const agora = new Date();
  const virou = await db.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { id: pagamento.id, status: { in: ["PENDING", "PROOF_SENT"] } },
      data: {
        status: "CONFIRMED",
        provider: "MERCADO_PAGO",
        confirmedAt: agora,
        mpPaymentId: String(dados.id),
        lastEvent: dados as object,
      },
    });
    if (count === 0) return false;

    // o pedido só sai de "aguardando pagamento": se o restaurante já tinha
    // mexido nele (caso raro de pagamento muito atrasado), o status dele
    // manda, e aqui não se desfaz trabalho de ninguém
    const mudou = await tx.order.updateMany({ where: { id: orderId, status: "AWAITING_PAYMENT" }, data: { status: "PAID" } });
    if (mudou.count > 0) {
      await tx.orderStatusEvent.create({ data: { orderId, status: "PAID", note: "Pagamento confirmado pelo Mercado Pago" } });
    }
    return true;
  });

  return virou ? { virou: true } : { virou: false, motivo: "ja_estava" };
}

/** o pagamento não vai acontecer: recusado, cancelado ou o QR venceu */
export async function registrarPagamentoParado(params: {
  paymentId: string;
  situacao: "recusado" | "cancelado" | "vencido";
  dados: DadosDoPagamentoMp | null;
}) {
  const status = params.situacao === "recusado" ? "REJECTED" : params.situacao === "vencido" ? "EXPIRED" : "CANCELED";
  const { count } = await db.payment.updateMany({
    where: { id: params.paymentId, status: { in: ["PENDING", "PROOF_SENT"] } },
    data: { status, ...(params.dados ? { lastEvent: params.dados as object } : {}) },
  });
  return count > 0;
}

export type SituacaoDoPedido = {
  status: string;
  pago: boolean;
  pagamento: string;
  /** o QR venceu sem ninguém pagar: a tela oferece gerar outro */
  venceu: boolean;
};

/**
 * Pergunta ao Mercado Pago como está o pagamento deste pedido.
 *
 * É o atalho de quem está com a tela aberta: o webhook é o caminho
 * principal, mas ele depende de o restaurante ter cadastrado o endereço no
 * painel do Mercado Pago. Com a consulta, o cliente vê "pago" em segundos
 * mesmo sem webhook configurado -- e os dois caminhos terminam na mesma
 * função de confirmação, que só deixa um passar.
 */
export async function conferirPagamentoDoPedido(code: string): Promise<SituacaoDoPedido | null> {
  const pedido = await db.order.findUnique({
    where: { code },
    select: {
      id: true,
      restaurantId: true,
      status: true,
      origin: true,
      payment: { select: { id: true, status: true, provider: true, mpPaymentId: true, pixExpiresAt: true } },
    },
  });
  if (!pedido) return null;

  const pagamento = pedido.payment;
  const resposta = (): SituacaoDoPedido => ({
    status: pedido.status,
    pago: pagamento?.status === "CONFIRMED",
    pagamento: pagamento?.status ?? "PENDING",
    venceu: pagamento?.status === "EXPIRED",
  });

  // só o Pix do 100% Delivery tem o que consultar lá fora
  if (pedido.origin !== "FULL_DELIVERY" || pagamento?.provider !== "MERCADO_PAGO" || !pagamento.mpPaymentId) return resposta();
  if (pagamento.status !== "PENDING" && pagamento.status !== "PROOF_SENT") return resposta();

  const contas = await credenciaisDePagamento(pedido.restaurantId);
  if (!contas) return resposta();

  const consulta = await verPagamento(contas.accessToken, pagamento.mpPaymentId);
  if (!consulta.ok) return resposta();

  const situacao = situacaoDoPagamento(consulta.dados.status);
  if (situacao === "aprovado") {
    const confirmado = await confirmarPagamentoAprovado({
      paymentId: pagamento.id,
      orderId: pedido.id,
      restaurantId: pedido.restaurantId,
      dados: consulta.dados,
    });
    if (confirmado.virou) return { status: "PAID", pago: true, pagamento: "CONFIRMED", venceu: false };
    return resposta();
  }
  if (situacao === "recusado" || situacao === "cancelado") {
    await registrarPagamentoParado({ paymentId: pagamento.id, situacao, dados: consulta.dados });
    return { status: pedido.status, pago: false, pagamento: situacao === "recusado" ? "REJECTED" : "CANCELED", venceu: false };
  }
  // ninguém pagou e o QR passou da hora: a tela oferece outro
  if (pagamento.pixExpiresAt && pagamento.pixExpiresAt.getTime() < Date.now()) {
    await registrarPagamentoParado({ paymentId: pagamento.id, situacao: "vencido", dados: consulta.dados });
    return { status: pedido.status, pago: false, pagamento: "EXPIRED", venceu: true };
  }
  return resposta();
}
