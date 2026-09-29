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
