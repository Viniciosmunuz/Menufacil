import "server-only";

/**
 * A Z-API Omni, que fala com o WhatsApp sem passar pela Meta.
 *
 * Por que ela existe aqui: a conta de negócio do MenuFácil está proibida
 * pela Meta de mandar mensagem para números brasileiros (erro 130497).
 * Receber passa, enviar não -- e a recusa é calada, seis segundos depois
 * de a API aceitar o envio e devolver um `wamid`. Com isso a IA no
 * WhatsApp ficou inútil por um bloqueio que não é nosso.
 *
 * O canal usado aqui é o **WhatsApp Web, por QR code** -- não a "Meta
 * Cloud API (Oficial)" que a mesma plataforma também oferece. Ligar no
 * canal oficial seria cair no 130497 de novo, só que pagando: é o mesmo
 * caminho da Meta por outra porta.
 *
 * **O QR code viola os Termos do WhatsApp e o número pode ser banido sem
 * aviso.** Foi escolha informada do dono do produto. A sessão também
 * expira: o canal cai sozinho de tempos em tempos e precisa ser pareado
 * de novo, e é por isso que `CHANNEL_DISCONNECTED` tem tratamento próprio
 * aqui embaixo.
 *
 * O que esta camada faz é só o que a Kapso fazia: mandar texto. O cérebro
 * da IA (conhecimento, responder, pedido) não sabe que o provedor mudou.
 *
 * Credenciais, da conta dele:
 * - `ZAPI_SECRET_KEY`: do painel em Segurança → Credenciais da API. Vai no
 *   cabeçalho `Authorization: Bearer`. **Só no servidor.**
 * - `ZAPI_CHANNEL_ID`: o canal do WhatsApp Web, que vai na URL.
 *
 * A Public Key do painel não entra aqui: ela serve ao SDK de conexão, no
 * navegador, e não autentica envio.
 *
 * Documentação: https://developer.omni.z-api.io/messages/send-text
 */

const BASE = "https://api.omni.z-api.io/v1";

export function zapiConfigurada() {
  return Boolean(
    process.env.ZAPI_SECRET_KEY?.trim() && process.env.ZAPI_CHANNEL_ID?.trim(),
  );
}

function credenciais() {
  const chave = process.env.ZAPI_SECRET_KEY?.trim();
  const canal = process.env.ZAPI_CHANNEL_ID?.trim();
  if (!chave || !canal) {
    throw new Error("Z-API sem credenciais (ZAPI_SECRET_KEY, ZAPI_CHANNEL_ID)");
  }
  return { chave, canal };
}

/** só dígitos, com DDI: é o formato que o `identifier` espera */
export function soDigitos(telefone: string) {
  return telefone.replace(/\D/g, "");
}

/** o canal caiu e precisa ser pareado de novo pelo QR code */
export class CanalDesconectado extends Error {
  constructor() {
    super("O WhatsApp desconectou: leia o QR code de novo no painel da Z-API.");
    this.name = "CanalDesconectado";
  }
}

/**
 * Manda um texto e devolve o id da mensagem.
 *
 * Diferente da Kapso, aqui um 200 quer dizer entregue de verdade: não há
 * a Meta no meio para recusar depois em silêncio. O corpo do erro é
 * registrado sempre -- foi a falta disso que escondeu o 130497 por dias.
 */
export async function enviarTexto(params: {
  telefone: string;
  texto: string;
}): Promise<{ messageId: string | null }> {
  const { chave, canal } = credenciais();
  const identifier = soDigitos(params.telefone);
  if (!identifier) throw new Error("Z-API: telefone vazio");

  const resposta = await fetch(`${BASE}/channels/${canal}/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${chave}`,
    },
    body: JSON.stringify({
      recipient: { identifier },
      content: { type: "TEXT", body: { message: params.texto } },
    }),
  });

  const corpo = await resposta.text();

  if (!resposta.ok) {
    // 422 CHANNEL_DISCONNECTED é o caso de todo dia com QR code: a sessão
    // expirou. Vale um erro próprio para a tela do admin poder dizer "leia
    // o QR de novo" em vez de "falhou".
    if (resposta.status === 422 && corpo.includes("CHANNEL_DISCONNECTED")) {
      console.error("[zapi] canal desconectado: o QR precisa ser lido de novo");
      throw new CanalDesconectado();
    }
    console.error(`[zapi] envio recusado (${resposta.status}): ${corpo.slice(0, 300)}`);
    throw new Error(`Z-API recusou o envio: ${resposta.status}`);
  }

  let messageId: string | null = null;
  try {
    const dados = JSON.parse(corpo) as { messageId?: string; id?: string };
    messageId = dados.messageId ?? dados.id ?? null;
  } catch {
    // resposta sem JSON não impede o envio de ter acontecido
  }
  console.info(`[zapi] enviado para …${identifier.slice(-4)}: ${messageId ?? "sem id"}`);
  return { messageId };
}
