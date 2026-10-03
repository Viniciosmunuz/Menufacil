import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Segredos do 100% Delivery guardados no banco: o access_token e o
// refresh_token da conta do Mercado Pago de cada restaurante.
//
// AES-256-GCM, chave só na variável de ambiente. Mesma receita do totem, de
// propósito: é a que já roda em produção há semanas. O que muda é a chave,
// que pode ser própria (MP_TOKEN_KEY) — e, se não for cadastrada, cai na do
// totem, que já está na Vercel. Assim o restaurante-piloto liga a conta sem
// ninguém precisar mexer em variável de ambiente, e quem quiser separar as
// duas depois só cadastra MP_TOKEN_KEY.

function chave() {
  const raw = process.env.MP_TOKEN_KEY || process.env.TOTEM_TOKEN_KEY;
  const buf = raw ? Buffer.from(raw, "base64") : null;
  if (!buf || buf.length !== 32) {
    throw new Error("MP_TOKEN_KEY (ou TOTEM_TOKEN_KEY) ausente ou inválida (precisa de 32 bytes em base64).");
  }
  return buf;
}

/** dá para guardar o token do Mercado Pago neste servidor? */
export function temChaveDePagamento() {
  try {
    chave();
    return true;
  } catch {
    return false;
  }
}

export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), dados.toString("base64")].join(":");
}

export function decifrar(guardado: string) {
  const [versao, iv, tag, dados] = guardado.split(":");
  if (versao !== "v1" || !iv || !tag || !dados) throw new Error("Segredo em formato desconhecido.");
  const decipher = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dados, "base64")), decipher.final()]).toString("utf8");
}

/**
 * Como o token aparece no painel: começo e fim, o miolo escondido. O dono
 * precisa reconhecer qual conta está ligada, não ler o token de volta.
 */
export function resumoDoSegredo(token: string) {
  const limpo = token.trim();
  if (limpo.length <= 12) return "••••";
  return `${limpo.slice(0, 8)}••••${limpo.slice(-4)}`;
}
