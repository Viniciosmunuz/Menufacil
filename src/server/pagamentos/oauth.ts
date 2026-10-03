import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { appUrl } from "@/lib/site";

// Ligar a conta do Mercado Pago do restaurante, pelo fluxo oficial de
// autorização (OAuth) do Mercado Pago.
//
// Por que OAuth e não um token copiado na mão: o token colado vale para
// sempre e dá acesso total à conta de quem colou. Pelo OAuth, o restaurante
// entra na conta dele, vê o que está autorizando e pode cortar o acesso do
// lado dele quando quiser -- e a plataforma recebe um token que vence e se
// renova sozinho.
//
// O dinheiro nunca passa pela conta do MenuFácil. O token é da conta do
// restaurante: o Pix nasce lá e cai lá.
//
// Referência: https://www.mercadopago.com.br/developers -- Autorização e
// conexão / OAuth.

const AUTORIZA = "https://auth.mercadopago.com.br/authorization";
const TOKEN = "https://api.mercadopago.com/oauth/token";
const TEMPO_LIMITE_MS = 15_000;

/**
 * O endereço de retorno é um só, fixo, para todos os restaurantes: o
 * Mercado Pago exige que ele seja igual ao que está cadastrado no
 * aplicativo, sem nada variável no meio. Qual restaurante está ligando a
 * conta vai no "state", assinado.
 */
export function enderecoDeRetorno() {
  return `${appUrl()}/painel/mercado-pago/retorno`;
}

export type AplicativoMp = { clientId: string; clientSecret: string };

/** o aplicativo do MenuFácil no Mercado Pago; sem isto, não há como ligar conta */
export function aplicativo(): AplicativoMp | null {
  const clientId = process.env.MP_CLIENT_ID?.trim();
  const clientSecret = process.env.MP_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export const temAplicativo = () => aplicativo() !== null;

// ---- "state": de quem é esta volta ---------------------------------------
//
// O Mercado Pago devolve o cliente para o endereço fixo com um "code" na
// mão. O "state" é o que diz a qual restaurante aquele code pertence, e ele
// é assinado com o segredo do aplicativo: ninguém monta um state por fora
// para pendurar a conta dele em outro restaurante.

const VALE_MS = 15 * 60 * 1000;

function assinar(corpo: string, segredo: string) {
  return createHmac("sha256", segredo).update(corpo).digest("base64url");
}

export function criarState(restaurantId: string, userId: string) {
  const app = aplicativo();
  if (!app) return null;
  const corpo = Buffer.from(
    JSON.stringify({ r: restaurantId, u: userId, t: Date.now(), n: randomBytes(8).toString("base64url") }),
  ).toString("base64url");
  return `${corpo}.${assinar(corpo, app.clientSecret)}`;
}

export type StateLido = { restaurantId: string; userId: string };

export function lerState(state: string | null | undefined): StateLido | null {
  const app = aplicativo();
  if (!app || !state) return null;
  const [corpo, assinatura] = state.split(".");
  if (!corpo || !assinatura) return null;

  const esperado = Buffer.from(assinar(corpo, app.clientSecret));
  const recebido = Buffer.from(assinatura);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;

  try {
    const dados = JSON.parse(Buffer.from(corpo, "base64url").toString("utf8")) as { r?: unknown; u?: unknown; t?: unknown };
    // volta muito atrasada: melhor pedir para começar de novo
    if (typeof dados.t !== "number" || Date.now() - dados.t > VALE_MS) return null;
    if (typeof dados.r !== "string" || typeof dados.u !== "string") return null;
    return { restaurantId: dados.r, userId: dados.u };
  } catch {
    return null;
  }
}

/** para onde mandar o dono para ele autorizar a conta dele */
export function enderecoDeAutorizacao(state: string) {
  const app = aplicativo();
  if (!app) return null;
  const qs = new URLSearchParams({
    client_id: app.clientId,
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: enderecoDeRetorno(),
  });
  return `${AUTORIZA}?${qs.toString()}`;
}

// ---- troca do code pelos tokens -----------------------------------------

export type TokensMp = {
  accessToken: string;
  refreshToken: string | null;
  publicKey: string | null;
  mpUserId: string | null;
  scope: string | null;
  liveMode: boolean;
  expiresAt: Date | null;
};

type RespostaToken = {
  access_token?: string;
  refresh_token?: string;
  public_key?: string;
  user_id?: number | string;
  scope?: string;
  live_mode?: boolean;
  expires_in?: number;
  message?: string;
  error?: string;
  error_description?: string;
};

async function pedirToken(corpo: Record<string, string>): Promise<{ ok: true; tokens: TokensMp } | { ok: false; erro: string }> {
  const app = aplicativo();
  if (!app) return { ok: false, erro: "O MenuFácil ainda não tem um aplicativo cadastrado no Mercado Pago." };

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(TOKEN, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ client_id: app.clientId, client_secret: app.clientSecret, ...corpo }),
      signal: controle.signal,
      cache: "no-store",
    });
    const texto = await resposta.text();
    const dados = (texto ? JSON.parse(texto) : {}) as RespostaToken;

    if (!resposta.ok || !dados.access_token) {
      const erro = dados.error_description ?? dados.message ?? dados.error ?? `O Mercado Pago respondeu ${resposta.status}.`;
      return { ok: false, erro };
    }
    return {
      ok: true,
      tokens: {
        accessToken: dados.access_token,
        refreshToken: dados.refresh_token ?? null,
        publicKey: dados.public_key ?? null,
        mpUserId: dados.user_id === undefined ? null : String(dados.user_id),
        scope: dados.scope ?? null,
        liveMode: dados.live_mode !== false,
        expiresAt: dados.expires_in ? new Date(Date.now() + dados.expires_in * 1000) : null,
      },
    };
  } catch (erro) {
    if (erro instanceof Error && erro.name === "AbortError") return { ok: false, erro: "O Mercado Pago demorou demais para responder." };
    return { ok: false, erro: "Não consegui falar com o Mercado Pago." };
  } finally {
    clearTimeout(relogio);
  }
}

/** o "code" que voltou na autorização vira os tokens da conta */
export function trocarCodePorToken(code: string) {
  return pedirToken({ grant_type: "authorization_code", code, redirect_uri: enderecoDeRetorno() });
}

/** o access_token vence; o refresh_token troca por um novo sem incomodar o dono */
export function renovarToken(refreshToken: string) {
  return pedirToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}
