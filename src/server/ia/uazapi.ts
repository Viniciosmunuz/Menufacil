import "server-only";

/**
 * A uazapi, que fala com o WhatsApp por QR code, sem passar pela Meta.
 *
 * É o terceiro caminho do sistema, ao lado da Kapso (oficial, pela Meta)
 * e da Z-API. Os três existem de propósito: em 11/11/2026 a Lia parou
 * por um dia inteiro porque o trial da Z-API expirou e não havia para
 * onde ir. Depender de um provedor só é o que transforma uma cobrança
 * atrasada em restaurante sem atendimento.
 *
 * **Por que ela, e não as outras:** a Z-API cobra por canal (cerca de
 * R$ 100 cada), e o MenuFácil é vendido a R$ 100 o plano Essencial --
 * um número já comeria a mensalidade inteira. A uazapi cobra por
 * servidor: até 100 números por R$ 138. É a diferença entre poder
 * oferecer a Lia a todo cliente e não poder.
 *
 * **O QR code viola os Termos do WhatsApp e o número pode ser banido
 * sem aviso.** Vale para a Z-API e vale aqui; foi escolha informada do
 * dono do produto. A Kapso continua montada para o dia em que isso
 * importar.
 *
 * Diferente da Z-API e da Kapso, as credenciais **não ficam no
 * ambiente**: cada restaurante tem a sua instância, com token próprio,
 * guardado no `AtendenteIa`. É o que permite dois restaurantes no mesmo
 * servidor sem um responder pelo WhatsApp do outro.
 *
 * Documentação: https://docs.uazapi.com
 */

export type ContaUazapi = {
  /** o servidor da instância, por exemplo https://abc.uazapi.com */
  baseUrl: string;
  /** o token da instância; vai no cabeçalho `token` */
  token: string;
};

/** só dígitos, com DDI */
export function soDigitos(telefone: string) {
  return telefone.replace(/\D/g, "");
}

/** a instância caiu e precisa ser pareada de novo pelo QR code */
export class InstanciaDesconectada extends Error {
  constructor() {
    super("O WhatsApp desconectou: leia o QR code de novo para reconectar.");
    this.name = "InstanciaDesconectada";
  }
}

function endereco(conta: ContaUazapi, caminho: string) {
  // a base vem do banco e pode ter sido colada com barra no fim
  return `${conta.baseUrl.replace(/\/+$/, "")}${caminho}`;
}

/**
 * Uma chamada à API, com o erro já lido.
 *
 * O corpo da recusa é registrado sempre. Foi a falta disso que escondeu
 * o bloqueio 130497 da Meta por dias, e a lição vale para qualquer
 * provedor: erro que não aparece no log vira "a IA parou e ninguém sabe
 * por quê".
 */
async function chamar<T>(
  conta: ContaUazapi,
  caminho: string,
  corpo: unknown,
): Promise<T | null> {
  const resposta = await fetch(endereco(conta, caminho), {
    method: "POST",
    headers: { "content-type": "application/json", token: conta.token },
    body: JSON.stringify(corpo),
  });

  const texto = await resposta.text();

  if (!resposta.ok) {
    // A sessão do QR code expira sozinha de tempos em tempos. Vale um
    // erro próprio para a tela do admin poder dizer "leia o QR de novo"
    // em vez de "falhou".
    const desconectada =
      resposta.status === 401 ||
      /disconnected|not connected|desconectad/i.test(texto);
    if (desconectada) {
      console.error("[uazapi] instância desconectada: o QR precisa ser lido de novo");
      throw new InstanciaDesconectada();
    }
    console.error(
      `[uazapi] recusado em ${caminho} (${resposta.status}): ${texto.slice(0, 300)}`,
    );
    throw new Error(`uazapi recusou (${resposta.status})`);
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    // resposta sem JSON não impede o envio de ter acontecido
    return null;
  }
}

type RespostaEnvio = { id?: string; messageid?: string; messageId?: string };

function idDa(dados: RespostaEnvio | null) {
  return dados?.id ?? dados?.messageid ?? dados?.messageId ?? null;
}

/**
 * Manda um texto e devolve o id da mensagem.
 *
 * Documentação: https://docs.uazapi.com/reference/sendText.md
 */
export async function enviarTexto(params: {
  conta: ContaUazapi;
  telefone: string;
  texto: string;
}): Promise<{ messageId: string | null }> {
  const number = soDigitos(params.telefone);
  if (!number) throw new Error("uazapi: telefone vazio");

  const dados = await chamar<RespostaEnvio>(params.conta, "/send/text", {
    number,
    text: params.texto,
  });

  const messageId = idDa(dados);
  console.info(`[uazapi] enviado para …${number.slice(-4)}: ${messageId ?? "sem id"}`);
  return { messageId };
}

/**
 * Manda uma imagem por URL.
 *
 * O QR Code do Pix vem do Mercado Pago em base64 e é servido por
 * `/api/pedido/[code]/qr.png` justamente para ter um endereço público --
 * montado para a Z-API, que não aceita base64, e que serve aqui igual.
 *
 * Documentação: https://docs.uazapi.com/reference/sendMedia.md
 */
export async function enviarImagem(params: {
  conta: ContaUazapi;
  telefone: string;
  url: string;
  legenda?: string;
}): Promise<{ messageId: string | null }> {
  const number = soDigitos(params.telefone);
  if (!number) throw new Error("uazapi: telefone vazio");

  const dados = await chamar<RespostaEnvio>(params.conta, "/send/media", {
    number,
    type: "image",
    file: params.url,
    ...(params.legenda ? { text: params.legenda } : {}),
  });

  const messageId = idDa(dados);
  console.info(`[uazapi] imagem enviada para …${number.slice(-4)}: ${messageId ?? "sem id"}`);
  return { messageId };
}

/**
 * Deixa o webhook da instância apontado para cá, com os filtros certos.
 *
 * **Os filtros são a parte que importa.** `excludeMessages` faz a uazapi
 * descartar antes de entregar, e três das travas mais caras deste
 * sistema viram configuração:
 *
 * - `isGroupYes`: mensagem de grupo não chega. Em 11/11/2026, oito
 *   desconhecidos de dois grupos receberam boas-vindas de madrugada
 *   porque a trava de grupo da Z-API falhou em três tentativas -- numa
 *   mensagem de grupo o remetente é a pessoa que digitou, e nada no
 *   payload a denunciava. Aqui o problema não chega a existir.
 * - `wasSentByApi`: o que a própria Lia mandou não volta como se fosse
 *   alguém falando. Sem isso, ela se lê e responde a si mesma.
 * - `fromMeYes` **não entra.** O que sai do celular do dono precisa
 *   chegar: é por ele que o atendimento sabe que uma pessoa assumiu a
 *   conversa e manda a IA ficar quieta por 30 minutos.
 *
 * A trava de grupo continua no webhook mesmo assim. Configuração no
 * provedor é ótima e some sem aviso: basta alguém recriar a instância
 * pelo painel. O código é a rede embaixo.
 *
 * Documentação: https://docs.uazapi.com/reference/updateWebhook.md
 */
export async function apontarWebhook(params: {
  conta: ContaUazapi;
  url: string;
}): Promise<void> {
  await chamar(params.conta, "/webhook", {
    enabled: true,
    url: params.url,
    events: ["messages", "connection"],
    excludeMessages: ["isGroupYes", "wasSentByApi"],
    // o receptor é uma rota só; com estes ligados a uazapi acrescentaria
    // o tipo do evento ao caminho e passaria a bater em endereço que não
    // existe
    addUrlEvents: false,
    addUrlTypesMessages: false,
  });
  console.info("[uazapi] webhook apontado e filtros aplicados");
}

type Estado = { instance?: { status?: string; profileName?: string } ; status?: string };

/**
 * Em que pé está a conexão: `connected`, `disconnected`, `connecting`…
 *
 * Serve à tela do admin, para dizer se o número está no ar antes de o
 * dono descobrir pelo cliente reclamando.
 *
 * Documentação: https://docs.uazapi.com/reference/getInstanceStatus.md
 */
export async function estadoDaInstancia(conta: ContaUazapi): Promise<string | null> {
  const resposta = await fetch(endereco(conta, "/instance/status"), {
    headers: { token: conta.token },
  });
  if (!resposta.ok) {
    console.error(`[uazapi] status recusado (${resposta.status})`);
    return null;
  }
  const dados = (await resposta.json().catch(() => null)) as Estado | null;
  return dados?.instance?.status ?? dados?.status ?? null;
}
