import "server-only";

// Maquininha Point do restaurante, pela API do Mercado Pago.
//
// O totem não cobra nada sozinho: ele manda uma "intenção de pagamento"
// para a maquininha que está do lado dele, e quem conduz a passada do
// cartão é a própria maquininha. O resultado volta pelo webhook.
//
// Tudo com o Access Token do restaurante, nunca com uma conta da
// plataforma: o dinheiro cai direto na conta dele.
//
// Referência: https://www.mercadopago.com.br/developers — Point / Payment Intents.

const BASE = "https://api.mercadopago.com";
/** o Mercado Pago às vezes demora; melhor desistir do que travar o balcão */
const TEMPO_LIMITE_MS = 15_000;

export type IntencaoCriada = { id: string; state: string | null };
export type RespostaDoPonto<T> = { ok: true; dados: T } | { ok: false; erro: string; status?: number };

async function chamar<T>(
  caminho: string,
  { accessToken, metodo = "GET", corpo, idempotencia }: { accessToken: string; metodo?: string; corpo?: unknown; idempotencia?: string },
): Promise<RespostaDoPonto<T>> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);

  try {
    const resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        ...(idempotencia ? { "X-Idempotency-Key": idempotencia } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: controle.signal,
      cache: "no-store",
    });

    const texto = await resposta.text();
    const dados = texto ? (JSON.parse(texto) as T & { message?: string; error?: string }) : ({} as T);

    if (!resposta.ok) {
      const mensagem =
        (dados as { message?: string; error?: string }).message ??
        (dados as { error?: string }).error ??
        `O Mercado Pago respondeu ${resposta.status}.`;
      return { ok: false, erro: mensagem, status: resposta.status };
    }
    return { ok: true, dados };
  } catch (erro) {
    if (erro instanceof Error && erro.name === "AbortError") {
      return { ok: false, erro: "O Mercado Pago demorou demais para responder." };
    }
    return { ok: false, erro: "Não consegui falar com o Mercado Pago." };
  } finally {
    clearTimeout(relogio);
  }
}

/**
 * Manda a cobrança para a maquininha. O valor vai em reais (a API do Point
 * trabalha com decimal), mas no nosso lado continua tudo em centavos.
 */
export function criarIntencao(params: {
  accessToken: string;
  deviceId: string;
  amountCents: number;
  descricao: string;
  referencia: string;
}): Promise<RespostaDoPonto<IntencaoCriada>> {
  return chamar<IntencaoCriada>(`/point/integration-api/devices/${encodeURIComponent(params.deviceId)}/payment-intents`, {
    accessToken: params.accessToken,
    metodo: "POST",
    idempotencia: params.referencia,
    corpo: {
      amount: params.amountCents,
      description: params.descricao.slice(0, 80),
      additional_info: { external_reference: params.referencia, print_on_terminal: false },
    },
  });
}

/** em que pé está a intenção (o totem pergunta enquanto espera) */
export function verIntencao(accessToken: string, intentId: string) {
  return chamar<{ id: string; state: string | null; payment?: { id?: number | string } }>(
    `/point/integration-api/payment-intents/${encodeURIComponent(intentId)}`,
    { accessToken },
  );
}

/** o cliente desistiu: tira a cobrança da tela da maquininha */
export function cancelarIntencao(accessToken: string, deviceId: string, intentId: string) {
  return chamar<{ id: string }>(
    `/point/integration-api/devices/${encodeURIComponent(deviceId)}/payment-intents/${encodeURIComponent(intentId)}`,
    { accessToken, metodo: "DELETE" },
  );
}

/** o pagamento em si, para conferir o valor e a situação final */
export function verPagamento(accessToken: string, paymentId: string) {
  return chamar<{ id: number; status: string; transaction_amount: number; external_reference?: string }>(
    `/v1/payments/${encodeURIComponent(paymentId)}`,
    { accessToken },
  );
}

/**
 * Situação da intenção traduzida para o que o totem precisa saber. O
 * Mercado Pago usa nomes diferentes conforme o caminho (FINISHED, CANCELED,
 * ERROR...), então o que não for claramente aprovado ou cancelado continua
 * como "esperando" — nunca como aprovado.
 */
export function situacao(state: string | null | undefined): "esperando" | "aprovado" | "recusado" | "cancelado" {
  const s = String(state ?? "").toUpperCase();
  if (s === "FINISHED" || s === "APPROVED") return "aprovado";
  if (s === "CANCELED" || s === "ABANDONED") return "cancelado";
  if (s === "ERROR" || s === "REJECTED") return "recusado";
  return "esperando";
}

// ---- Pix -----------------------------------------------------------------
//
// O Pix não passa pela maquininha: ele nasce como pagamento na conta do
// restaurante e o Mercado Pago devolve o QR, que o totem mostra na tela.
// O cliente lê com o aplicativo do banco e pronto.
//
// Precisa de um e-mail do pagador, que o Mercado Pago exige. No balcão
// ninguém digita e-mail, então vai um genérico do próprio totem -- ele não
// serve para cobrar nada de ninguém, só para a cobrança existir.

export type PixCriado = {
  id: number | string;
  status: string;
  point_of_interaction?: {
    transaction_data?: {
      /** o "copia e cola" */
      qr_code?: string;
      /** a imagem do QR, em base64 */
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
};

/** quanto tempo o QR fica de pé antes de o cliente ter de começar de novo */
const MINUTOS_DO_PIX = 10;

export function criarPix(params: {
  accessToken: string;
  amountCents: number;
  descricao: string;
  referencia: string;
  email?: string;
  /**
   * Para onde o Mercado Pago avisa que este pagamento mudou.
   *
   * Vai por pagamento, e não cadastrado na conta, porque no 100% Delivery
   * o restaurante nem tem onde cadastrar: webhook no Mercado Pago mora
   * dentro de uma aplicação, e quem vende não tem aplicação nenhuma -- ele
   * só autoriza a do MenuFácil. Mandando aqui, o aviso chega no endereço
   * certo (com o id do restaurante na ponta) sem ninguém configurar nada.
   */
  notificationUrl?: string;
}): Promise<RespostaDoPonto<PixCriado>> {
  const expira = new Date(Date.now() + MINUTOS_DO_PIX * 60 * 1000);

  return chamar<PixCriado>("/v1/payments", {
    accessToken: params.accessToken,
    metodo: "POST",
    idempotencia: params.referencia,
    corpo: {
      transaction_amount: Number((params.amountCents / 100).toFixed(2)),
      description: params.descricao.slice(0, 80),
      payment_method_id: "pix",
      external_reference: params.referencia,
      date_of_expiration: expira.toISOString(),
      payer: { email: params.email ?? "totem@menufacil.app" },
      ...(params.notificationUrl ? { notification_url: params.notificationUrl } : {}),
    },
  });
}

/** o cliente desistiu do Pix antes de pagar */
export function cancelarPagamento(accessToken: string, paymentId: string) {
  return chamar<{ id: number; status: string }>(`/v1/payments/${encodeURIComponent(paymentId)}`, {
    accessToken,
    metodo: "PUT",
    corpo: { status: "cancelled" },
  });
}

/**
 * Situação de um pagamento (Pix), traduzida igual à da maquininha. O que
 * não for claramente aprovado continua como "esperando" -- nunca aprovado.
 */
export function situacaoDoPagamento(status: string | null | undefined): "esperando" | "aprovado" | "recusado" | "cancelado" {
  const s = String(status ?? "").toLowerCase();
  if (s === "approved") return "aprovado";
  if (s === "cancelled" || s === "refunded" || s === "charged_back") return "cancelado";
  if (s === "rejected") return "recusado";
  return "esperando";
}
