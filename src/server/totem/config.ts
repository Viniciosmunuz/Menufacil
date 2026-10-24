import "server-only";

import { db } from "@/lib/db";
import { credenciaisDePagamento, verConta } from "@/server/pagamentos/conta";

import { cifrar, decifrar, resumoDoSegredo, temChaveDoTotem } from "./segredo";

// Configuração do totem de um restaurante: a conta do Mercado Pago dele e
// a maquininha Point que fica no balcão.
//
// O dinheiro é dele: a plataforma guarda o token para falar com a
// maquininha em nome do restaurante e nada mais. O token nunca volta para
// o navegador — o painel mostra só o começo e o fim.
//
// De onde vem a conta, nesta ordem:
//
// 1. **Token colado aqui no Totem.** O jeito antigo, que continua valendo
//    para quem já cadastrou: ninguém que está funcionando muda de conta
//    sem pedir.
// 2. **A conta conectada pelo botão "Conectar Mercado Pago"** -- a mesma da
//    seção Entrega. O dono entra na conta dele no site do Mercado Pago,
//    autoriza, e pronto: nenhum token para copiar em restaurante novo.
//
// O caminho é de mão única: o Totem lê a conta da Entrega, a Entrega não
// lê nada do Totem (ver credenciaisDePagamento). E o Totem só lê o token:
// a chave de assinatura dos avisos da Entrega fica com a Entrega.

export type TotemConfigView = {
  /** como o token colado aparece no painel; null quando não há token colado */
  tokenResumo: string | null;
  /** a conta do restaurante está conectada pelo botão (a mesma da Entrega) */
  contaConectada: boolean;
  /** de onde o totem tira a conta agora */
  origem: "colado" | "conectado" | null;
  deviceId: string | null;
  temWebhook: boolean;
  atualizadoEm: Date | null;
  /** dá para cobrar no cartão (token + maquininha) */
  prontoCartao: boolean;
  /** dá para cobrar por Pix (só o token; o QR nasce na conta do restaurante) */
  prontoPix: boolean;
};

export async function verConfig(restaurantId: string): Promise<TotemConfigView> {
  const config = await db.totemConfig.findUnique({
    where: { restaurantId },
    select: { mpTokenHint: true, mpDeviceId: true, mpWebhookKey: true, mpAccessToken: true, updatedAt: true },
  });

  const conta = await verConta(restaurantId);
  const colado = Boolean(config?.mpAccessToken);
  const temConta = colado || conta.conectada;

  return {
    tokenResumo: config?.mpTokenHint ?? null,
    contaConectada: conta.conectada,
    origem: colado ? "colado" : conta.conectada ? "conectado" : null,
    deviceId: config?.mpDeviceId ?? null,
    temWebhook: Boolean(config?.mpWebhookKey),
    atualizadoEm: config?.updatedAt ?? null,
    prontoCartao: temConta && Boolean(config?.mpDeviceId),
    prontoPix: temConta,
  };
}

/** guarda o Access Token do restaurante, criptografado */
export async function salvarToken(restaurantId: string, token: string) {
  const limpo = token.trim();
  if (!temChaveDoTotem()) {
    return { erro: "Este servidor ainda não tem a chave para guardar segredos do totem (TOTEM_TOKEN_KEY)." };
  }
  if (limpo.length < 20) return { erro: "Esse token parece curto demais. Copie o Access Token inteiro do Mercado Pago." };

  const dados = { mpAccessToken: cifrar(limpo), mpTokenHint: resumoDoSegredo(limpo) };
  await db.totemConfig.upsert({
    where: { restaurantId },
    create: { restaurantId, ...dados },
    update: dados,
    select: { id: true },
  });
  return { ok: true as const, producao: limpo.startsWith("APP_USR-") };
}

/** guarda o número da maquininha Point */
export async function salvarMaquininha(restaurantId: string, deviceId: string) {
  const limpo = deviceId.trim();
  await db.totemConfig.upsert({
    where: { restaurantId },
    create: { restaurantId, mpDeviceId: limpo || null },
    update: { mpDeviceId: limpo || null },
    select: { id: true },
  });
  return { ok: true as const };
}

/** guarda a chave da assinatura das notificações do Mercado Pago */
export async function salvarChaveDoWebhook(restaurantId: string, chave: string) {
  const limpo = chave.trim();
  if (limpo && !temChaveDoTotem()) {
    return { erro: "Este servidor ainda não tem a chave para guardar segredos do totem (TOTEM_TOKEN_KEY)." };
  }
  const valor = limpo ? cifrar(limpo) : null;
  await db.totemConfig.upsert({
    where: { restaurantId },
    create: { restaurantId, mpWebhookKey: valor },
    update: { mpWebhookKey: valor },
    select: { id: true },
  });
  return { ok: true as const };
}

/** tira a conta do Mercado Pago deste restaurante */
export async function esquecerConta(restaurantId: string) {
  await db.totemConfig.updateMany({
    where: { restaurantId },
    data: { mpAccessToken: null, mpTokenHint: null, mpDeviceId: null, mpWebhookKey: null },
  });
}

export type CredenciaisDoTotem = { accessToken: string; deviceId: string | null; webhookKey: string | null };

/**
 * Credenciais em texto puro, para falar com o Mercado Pago. Só o servidor
 * chama isto, e só na hora de mandar a cobrança para a maquininha.
 */
export async function credenciais(restaurantId: string): Promise<CredenciaisDoTotem | null> {
  const config = await db.totemConfig.findUnique({
    where: { restaurantId },
    select: { mpAccessToken: true, mpDeviceId: true, mpWebhookKey: true },
  });
  // o Pix só precisa do token; a maquininha só entra no cartão
  if (!config?.mpAccessToken) {
    // Sem token colado, a conta conectada pelo botão. A chave dos avisos
    // não vem junto: ela é da Entrega, e o aviso do totem que chegar sem
    // chave é só ignorado -- quem grava o pedido é o totem perguntando ao
    // Mercado Pago, que funciona do mesmo jeito.
    const conta = await credenciaisDePagamento(restaurantId);
    if (!conta) return null;
    return { accessToken: conta.accessToken, deviceId: config?.mpDeviceId ?? null, webhookKey: null };
  }

  try {
    return {
      accessToken: decifrar(config.mpAccessToken),
      deviceId: config.mpDeviceId,
      webhookKey: config.mpWebhookKey ? decifrar(config.mpWebhookKey) : null,
    };
  } catch {
    // chave trocada ou dado corrompido: melhor não pagar do que pagar errado
    return null;
  }
}
