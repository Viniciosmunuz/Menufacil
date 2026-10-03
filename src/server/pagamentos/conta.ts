import "server-only";

import { db } from "@/lib/db";
import { credenciais as credenciaisDoTotem } from "@/server/totem/config";

import { renovarToken, type TokensMp } from "./oauth";
import { cifrar, decifrar, resumoDoSegredo, temChaveDePagamento } from "./segredo";

// A conta do Mercado Pago de um restaurante: guardar, mostrar, desligar e
// entregar as credenciais para quem vai cobrar.
//
// Nada aqui devolve token para a tela. O que o painel recebe é o
// "TotemConfigView" equivalente deste módulo: se está ligada, de quem é, se
// é conta de verdade ou de teste e quando foi a última conversa com o
// Mercado Pago.

/** renova o token quando faltar menos que isto para vencer */
const FOLGA_MS = 10 * 60 * 1000;

export type ContaMpView = {
  conectada: boolean;
  /** começo e fim do token, só para o dono reconhecer o que está ligado */
  tokenResumo: string | null;
  mpUserId: string | null;
  /** conta de verdade (true) ou credencial de teste (false) */
  producao: boolean;
  conectadaEm: Date | null;
  ultimaConversa: Date | null;
  /** o token vence e não há refresh_token para renovar: precisa ligar de novo */
  precisaReconectar: boolean;
  ultimoErro: string | null;
  temWebhook: boolean;
};

export async function verConta(restaurantId: string): Promise<ContaMpView> {
  const conta = await db.mercadoPagoAccount.findUnique({
    where: { restaurantId },
    select: {
      accessToken: true,
      refreshToken: true,
      tokenHint: true,
      mpUserId: true,
      liveMode: true,
      connectedAt: true,
      lastCheckAt: true,
      lastError: true,
      expiresAt: true,
      webhookSecret: true,
    },
  });

  const conectada = Boolean(conta?.accessToken);
  const vencido = Boolean(conta?.expiresAt && conta.expiresAt.getTime() <= Date.now());

  return {
    conectada,
    tokenResumo: conta?.tokenHint ?? null,
    mpUserId: conta?.mpUserId ?? null,
    producao: conta?.liveMode ?? false,
    conectadaEm: conta?.connectedAt ?? null,
    ultimaConversa: conta?.lastCheckAt ?? null,
    precisaReconectar: conectada && vencido && !conta?.refreshToken,
    ultimoErro: conta?.lastError ?? null,
    temWebhook: Boolean(conta?.webhookSecret),
  };
}

/** grava a conta que acabou de ser autorizada */
export async function salvarConta(restaurantId: string, tokens: TokensMp) {
  if (!temChaveDePagamento()) {
    return { erro: "Este servidor ainda não tem a chave para guardar o token do Mercado Pago (MP_TOKEN_KEY)." };
  }
  const dados = {
    accessToken: cifrar(tokens.accessToken),
    refreshToken: tokens.refreshToken ? cifrar(tokens.refreshToken) : null,
    publicKey: tokens.publicKey,
    tokenHint: resumoDoSegredo(tokens.accessToken),
    scope: tokens.scope,
    liveMode: tokens.liveMode,
    mpUserId: tokens.mpUserId,
    expiresAt: tokens.expiresAt,
    connectedAt: new Date(),
    lastCheckAt: new Date(),
    lastError: null,
  };
  await db.mercadoPagoAccount.upsert({
    where: { restaurantId },
    create: { restaurantId, ...dados },
    update: dados,
    select: { id: true },
  });
  return { ok: true as const, producao: tokens.liveMode };
}

/** guarda a chave da assinatura das notificações, copiada do painel do Mercado Pago */
export async function salvarSegredoDoWebhook(restaurantId: string, segredo: string) {
  const limpo = segredo.trim();
  if (limpo && !temChaveDePagamento()) {
    return { erro: "Este servidor ainda não tem a chave para guardar segredos do Mercado Pago (MP_TOKEN_KEY)." };
  }
  const valor = limpo ? cifrar(limpo) : null;
  await db.mercadoPagoAccount.upsert({
    where: { restaurantId },
    create: { restaurantId, webhookSecret: valor },
    update: { webhookSecret: valor },
    select: { id: true },
  });
  return { ok: true as const };
}

/**
 * Desliga a conta: apaga os dois tokens.
 *
 * A linha fica, sem segredo nenhum, porque ela guarda o histórico de quando
 * a conta foi ligada. Apagar o token é o que importa: a partir daqui o
 * MenuFácil não fala mais com o Mercado Pago em nome deste restaurante.
 */
export async function desligarConta(restaurantId: string) {
  await db.mercadoPagoAccount.updateMany({
    where: { restaurantId },
    data: { accessToken: null, refreshToken: null, publicKey: null, tokenHint: null, expiresAt: null, lastError: null },
  });
}

/** anota no painel por que a última conversa com o Mercado Pago falhou */
export async function anotarErro(restaurantId: string, erro: string) {
  await db.mercadoPagoAccount.updateMany({
    where: { restaurantId },
    data: { lastError: erro.slice(0, 300), lastCheckAt: new Date() },
  });
}

export type CredenciaisMp = {
  accessToken: string;
  /** chave da assinatura das notificações; null quando não foi cadastrada */
  webhookSecret: string | null;
};

/**
 * Credenciais em texto puro, para cobrar em nome do restaurante. Só o
 * servidor chama isto.
 *
 * O token vencido é renovado aqui, na hora, com o refresh_token -- é por
 * isso que esta função é assíncrona e grava no banco: o cliente no checkout
 * não pode esperar o dono do restaurante reconectar a conta.
 *
 * Sem conta ligada pelo OAuth, cai no Access Token que o restaurante já
 * tenha colado na seção Totem. É a conta dele do mesmo jeito -- o dinheiro
 * continua caindo na conta dele -- e assim quem já estava cobrando no
 * balcão passa a cobrar no delivery sem reconfigurar nada.
 */
export async function credenciaisDePagamento(restaurantId: string): Promise<CredenciaisMp | null> {
  const conta = await db.mercadoPagoAccount.findUnique({
    where: { restaurantId },
    select: { id: true, accessToken: true, refreshToken: true, expiresAt: true, webhookSecret: true },
  });

  const segredoDoWebhook = () => {
    try {
      return conta?.webhookSecret ? decifrar(conta.webhookSecret) : null;
    } catch {
      return null;
    }
  };

  if (conta?.accessToken) {
    const vencendo = conta.expiresAt !== null && conta.expiresAt.getTime() - Date.now() < FOLGA_MS;

    if (vencendo && conta.refreshToken) {
      try {
        const renovado = await renovarToken(decifrar(conta.refreshToken));
        if (renovado.ok) {
          await db.mercadoPagoAccount.update({
            where: { id: conta.id },
            data: {
              accessToken: cifrar(renovado.tokens.accessToken),
              refreshToken: renovado.tokens.refreshToken ? cifrar(renovado.tokens.refreshToken) : conta.refreshToken,
              tokenHint: resumoDoSegredo(renovado.tokens.accessToken),
              expiresAt: renovado.tokens.expiresAt,
              lastCheckAt: new Date(),
              lastError: null,
            },
            select: { id: true },
          });
          return { accessToken: renovado.tokens.accessToken, webhookSecret: segredoDoWebhook() };
        }
        await anotarErro(restaurantId, `Não consegui renovar o acesso: ${renovado.erro}`);
      } catch {
        // chave trocada ou dado corrompido: o token velho ainda pode valer
      }
    }

    try {
      return { accessToken: decifrar(conta.accessToken), webhookSecret: segredoDoWebhook() };
    } catch {
      // melhor não cobrar do que cobrar errado
      return null;
    }
  }

  const totem = await credenciaisDoTotem(restaurantId);
  if (!totem) return null;
  return { accessToken: totem.accessToken, webhookSecret: totem.webhookKey };
}

/** dá para cobrar Pix por este restaurante agora? */
export async function prontoParaCobrar(restaurantId: string) {
  return (await credenciaisDePagamento(restaurantId)) !== null;
}
