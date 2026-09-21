import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Token de acesso da Cloud API de cada restaurante (quando ele conectar o
// próprio número). Fica no banco criptografado com AES-256-GCM; a chave está
// só na variável de ambiente WHATSAPP_TOKEN_KEY (32 bytes em base64).

function key() {
  const raw = process.env.WHATSAPP_TOKEN_KEY;
  const buf = raw ? Buffer.from(raw, "base64") : null;
  if (!buf || buf.length !== 32) throw new Error("WHATSAPP_TOKEN_KEY ausente ou inválida (precisa de 32 bytes em base64).");
  return buf;
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptSecret(stored: string) {
  const [version, iv, tag, data] = stored.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Segredo em formato desconhecido.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
