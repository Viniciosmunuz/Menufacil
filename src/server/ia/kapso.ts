import "server-only";

// A conversa do MenuFácil com a Kapso, que é quem fala com o WhatsApp.
//
// Só o que o Menu Fácil IA usa: criar o restaurante como cliente, gerar o
// link em que o dono conecta o número, descobrir o número depois de
// conectado, registrar o aviso de mensagens e mandar a resposta.
//
// A chave fica em KAPSO_API_KEY, nas variáveis da Vercel. Ela nunca entra em
// log nem em mensagem de erro: o que vai para o console é o código da
// resposta e o caminho, não o cabeçalho.
//
// Referência: docs.kapso.ai/api (Platform v1 e Meta WhatsApp v24.0).

const BASE_PLATFORM = "https://api.kapso.ai/platform/v1";
const BASE_WHATSAPP = "https://api.kapso.ai/meta/whatsapp/v24.0";

export class KapsoError extends Error {}

/** o Menu Fácil IA só funciona com a chave configurada */
export function kapsoConfigurado() {
  return Boolean(process.env.KAPSO_API_KEY?.trim());
}

async function chamar<T>(url: string, init: RequestInit = {}): Promise<T> {
  const chave = process.env.KAPSO_API_KEY?.trim();
  if (!chave) throw new KapsoError("A chave da Kapso não está configurada (KAPSO_API_KEY).");

  const resposta = await fetch(url, {
    ...init,
    headers: { "X-API-Key": chave, "Content-Type": "application/json", ...init.headers },
    // nada daqui pode ficar em cache: é estado de conexão e envio
    cache: "no-store",
  });

  if (!resposta.ok) {
    // o corpo de erro da Kapso é { error: "..." }; a chave não aparece nele
    const corpo = (await resposta.json().catch(() => null)) as { error?: string } | null;
    const caminho = new URL(url).pathname;
    console.error(`[kapso] ${resposta.status} em ${caminho}:`, corpo?.error ?? "sem detalhe");
    throw new KapsoError(corpo?.error ?? `A Kapso respondeu ${resposta.status}.`);
  }
  return (await resposta.json()) as T;
}

// ─── o restaurante como cliente da conta Kapso ────────────────────────

/** cria o restaurante na Kapso; o id do MenuFácil vai junto para achar depois */
export async function criarClienteKapso(params: { nome: string; restaurantId: string }) {
  const r = await chamar<{ data: { id: string } }>(`${BASE_PLATFORM}/customers`, {
    method: "POST",
    body: JSON.stringify({ customer: { name: params.nome, external_customer_id: params.restaurantId } }),
  });
  return r.data.id;
}

/**
 * O link que o dono abre para conectar o WhatsApp dele.
 *
 * - **Só coexistência:** o dono continua usando o WhatsApp Business no
 *   celular. Sem isso, conectar o número tiraria o app dele do ar.
 * - **O restaurante paga a Meta** (`customer_managed`), que é o padrão. Não
 *   muda depois de criado o link.
 */
export async function criarLinkDeConexao(params: { customerId: string; voltarPara: string }) {
  const r = await chamar<{ data: { id: string; url: string; expires_at: string } }>(
    `${BASE_PLATFORM}/customers/${encodeURIComponent(params.customerId)}/setup_links`,
    {
      method: "POST",
      body: JSON.stringify({
        setup_link: {
          allowed_connection_types: ["coexistence"],
          meta_billing_mode: "customer_managed",
          language: "pt",
          success_redirect_url: params.voltarPara,
          failure_redirect_url: params.voltarPara,
        },
      }),
    },
  );
  return { url: r.data.url, expiraEm: r.data.expires_at };
}

type NumeroKapso = {
  phone_number_id: string;
  display_phone_number: string | null;
  is_coexistence: boolean | null;
  status: string | null;
};

/** o número que o restaurante conectou, se já conectou */
export async function numeroDoCliente(customerId: string): Promise<NumeroKapso | null> {
  const url = new URL(`${BASE_PLATFORM}/whatsapp/phone_numbers`);
  url.searchParams.set("customer_id", customerId);
  url.searchParams.set("per_page", "5");
  const r = await chamar<{ data: NumeroKapso[] }>(url.toString());
  return r.data[0] ?? null;
}

/**
 * Os avisos que o MenuFácil quer de cada número.
 *
 * - **recebida:** o cliente escreveu, e a IA tem de responder.
 * - **enviada:** alguém do restaurante respondeu pelo celular, e a IA tem de
 *   ficar quieta.
 * - **falhou:** a Meta recusou a entrega. Sem este, uma mensagem recusada é
 *   indistinguível de uma entregue -- o envio volta 200 nos dois casos, e o
 *   motivo da Meta só existe aqui.
 */
const EVENTOS = ["whatsapp.message.received", "whatsapp.message.sent", "whatsapp.message.failed"];

/**
 * Pede à Kapso que avise o MenuFácil a cada mensagem deste número.
 *
 * Sem lote: mensagem a mensagem, para a resposta não esperar janela de
 * agrupamento.
 */
export async function registrarWebhook(params: { phoneNumberId: string; url: string; segredo: string }) {
  const r = await chamar<{ data: { id: string } }>(
    `${BASE_PLATFORM}/whatsapp/phone_numbers/${encodeURIComponent(params.phoneNumberId)}/webhooks`,
    {
      method: "POST",
      body: JSON.stringify({
        whatsapp_webhook: {
          url: params.url,
          kind: "kapso",
          events: EVENTOS,
          secret_key: params.segredo,
          active: true,
          buffer_enabled: false,
        },
      }),
    },
  );
  return r.data.id;
}

/**
 * Põe o webhook de um número já conectado na lista de avisos de hoje.
 *
 * Os números conectados antes assinaram a lista da época deles. A lista
 * enviada substitui a anterior, então vai inteira.
 */
export async function atualizarEventosDoWebhook(params: { phoneNumberId: string; webhookId: string }) {
  await chamar(
    `${BASE_PLATFORM}/whatsapp/phone_numbers/${encodeURIComponent(params.phoneNumberId)}/webhooks/${encodeURIComponent(params.webhookId)}`,
    { method: "PATCH", body: JSON.stringify({ whatsapp_webhook: { events: EVENTOS } }) },
  );
}

/** só os quatro últimos dígitos: o bastante para conferir, pouco para vazar */
const fim = (n: string | null | undefined) => (n ? `…${n.replace(/\D/g, "").slice(-4)}` : "sem número");

/** o recibo que a Meta devolve quando aceita a mensagem */
type ReciboEnvio = {
  contacts?: { input?: string; wa_id?: string }[];
  messages?: { id?: string; message_status?: string }[];
};

/**
 * Manda texto para o cliente.
 *
 * Por telefone quando ele vem no aviso; senão, pelo id que a Meta dá ao
 * usuário (BSUID) -- os avisos novos podem chegar sem telefone.
 *
 * O recibo vai para o log. Sem ele, uma mensagem que a Meta aceita e nunca
 * entrega fica igual a uma entregue: a chamada volta 200 dos dois jeitos, e
 * o silêncio do cliente é a única pista. Vai o id da mensagem, o status e os
 * quatro últimos dígitos do destino -- nada do que foi escrito.
 */
export async function enviarTexto(params: { phoneNumberId: string; telefone: string | null; usuario: string | null; texto: string }) {
  const destino = params.telefone ? { to: params.telefone } : params.usuario ? { recipient: params.usuario } : null;
  if (!destino) throw new KapsoError("Sem telefone nem identificação do cliente para responder.");

  const recibo = await chamar<ReciboEnvio>(`${BASE_WHATSAPP}/${encodeURIComponent(params.phoneNumberId)}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      ...destino,
      type: "text",
      text: { body: params.texto, preview_url: true },
    }),
  });

  const msg = recibo?.messages?.[0];
  // O wa_id é o número como a Meta o conhece. Quando ele não bate com o que
  // pedimos, a mensagem foi para outro lugar -- no Brasil é o nono dígito.
  const waId = recibo?.contacts?.[0]?.wa_id;
  const pedido = params.telefone?.replace(/\D/g, "");
  const confere = !waId || !pedido || waId.replace(/\D/g, "") === pedido ? "" : ` (a Meta resolveu para ${fim(waId)})`;
  console.info(
    `[kapso] envio aceito para ${fim(params.telefone)}: ${msg?.id ?? "sem id"}, status ${msg?.message_status ?? "não informado"}${confere}`,
  );
}
