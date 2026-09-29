import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Segredos do totem guardados no banco: o Access Token do Mercado Pago do
// restaurante e a chave da assinatura do webhook dele.
//
// AES-256-GCM, chave só na variável de ambiente TOTEM_TOKEN_KEY (32 bytes
// em base64). É chave própria, separada da do WhatsApp: vazar uma não
// abre a outra, e o módulo do totem pode ser desligado inteiro sem
// encostar no que já roda.

function chave() {
  const raw = process.env.TOTEM_TOKEN_KEY;
  const buf = raw ? Buffer.from(raw, "base64") : null;
  if (!buf || buf.length !== 32) throw new Error("TOTEM_TOKEN_KEY ausente ou inválida (precisa de 32 bytes em base64).");
  return buf;
}

/** dá para guardar segredo do totem neste servidor? */
export function temChaveDoTotem() {
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
 * precisa reconhecer qual token está salvo, não lê-lo de volta.
 */
export function resumoDoSegredo(token: string) {
  const limpo = token.trim();
  if (limpo.length <= 12) return "••••";
  return `${limpo.slice(0, 8)}••••${limpo.slice(-4)}`;
}
