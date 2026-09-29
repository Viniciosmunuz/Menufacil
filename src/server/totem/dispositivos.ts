import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";

import { db } from "@/lib/db";

// Cada totem instalado é um dispositivo, do mesmo jeito que cada
// computador do Menu Fácil para PC. O aparelho guarda um token; aqui fica
// só o hash dele.
//
// O totem entra com o e-mail e a senha do painel: quem instala já é dono
// do restaurante, então não precisa ditar código nenhum. O código de
// pareamento existe só para o caso de trocar o aparelho sem ter a senha
// à mão.

const ALFABETO = "ABCDEFGHJKLMNPQRTUVWXYZ2346789";
const PREFIXO = "TT";

export const hashDoToken = (token: string) => createHash("sha256").update(token).digest("hex");

const bloco = (tamanho: number) =>
  Array.from({ length: tamanho }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");

/** código curto de ditar por telefone: TT-8K29-XP4 */
async function codigoLivre() {
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const codigo = `${PREFIXO}-${bloco(4)}-${bloco(3)}`;
    const usado = await db.totemDevice.findUnique({ where: { pairingCode: codigo }, select: { id: true } });
    if (!usado) return codigo;
  }
  throw new Error("não foi possível gerar um código de pareamento do totem");
}

/** o totem chama isto quando entra com e-mail e senha: já sai pareado */
export async function registrarTotem(restaurantId: string, nome: string, versao?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const device = await db.totemDevice.create({
    data: {
      restaurantId,
      name: nome.slice(0, 80) || "Totem",
      tokenHash: hashDoToken(token),
      appVersion: versao?.slice(0, 20) ?? null,
      pairedAt: new Date(),
    },
    select: { id: true },
  });
  // o token aparece uma vez só: daqui em diante só o aparelho tem ele
  return { deviceId: device.id, token };
}

/**
 * Código para ligar um totem sem digitar a senha do painel. A linha já
 * nasce do restaurante certo; o que diz que ninguém a reivindicou ainda é
 * o pairingCode continuar preenchido. O tokenHash inicial é aleatório e
 * ninguém o conhece: essa linha não autentica nada até ser pareada.
 */
export async function novoCodigoDePareamento(restaurantId: string) {
  const pairingCode = await codigoLivre();
  const device = await db.totemDevice.create({
    data: {
      restaurantId,
      name: "Totem novo",
      tokenHash: hashDoToken(randomBytes(32).toString("hex")),
      pairingCode,
    },
    select: { id: true, pairingCode: true },
  });
  return { deviceId: device.id, pairingCode: device.pairingCode! };
}

export type TotemAutenticado = {
  id: string;
  name: string;
  restaurantId: string;
  printerName: string | null;
  restaurant: { id: string; name: string; slug: string; receiptWidth: number; totemEnabled: boolean };
};

/**
 * Totem do cabeçalho Authorization: Bearer <token>.
 *
 * Devolve null quando o token não vale, quando o aparelho ainda não está
 * ligado a restaurante nenhum ou quando o admin desligou o totem para
 * esse restaurante — esconder a tela no painel não basta.
 */
export async function totemDaRequisicao(request: Request): Promise<TotemAutenticado | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const device = await db.totemDevice.findUnique({
    where: { tokenHash: hashDoToken(token) },
    select: {
      id: true,
      name: true,
      restaurantId: true,
      printerName: true,
      pairingCode: true,
      restaurant: { select: { id: true, name: true, slug: true, receiptWidth: true, totemEnabled: true, status: true } },
    },
  });
  if (!device?.restaurantId || !device.restaurant) return null;
  // linha criada só para gerar código: ninguém pareou ainda
  if (device.pairingCode) return null;
  if (!device.restaurant.totemEnabled || device.restaurant.status === "BLOCKED") return null;

  const { id, name, slug, receiptWidth, totemEnabled } = device.restaurant;
  return {
    id: device.id,
    name: device.name,
    restaurantId: device.restaurantId,
    printerName: device.printerName,
    restaurant: { id, name, slug, receiptWidth, totemEnabled },
  };
}

/** marca que o totem falou com o servidor agora (aparece no painel) */
export function tocarTotem(id: string, dados?: { printerName?: string | null; appVersion?: string | null }) {
  return db.totemDevice.update({
    where: { id },
    data: {
      lastSeenAt: new Date(),
      ...(dados?.printerName === undefined ? {} : { printerName: dados.printerName?.slice(0, 120) ?? null }),
      ...(dados?.appVersion === undefined ? {} : { appVersion: dados.appVersion?.slice(0, 20) ?? null }),
    },
    select: { id: true },
  });
}

/** o dono digitou o código no totem: o aparelho passa a ser do restaurante */
export async function parearPorCodigo(codigo: string, token: string) {
  const pairingCode = codigo.trim().toUpperCase();
  if (!/^TT-[A-Z0-9]{4}-[A-Z0-9]{3}$/.test(pairingCode)) return { erro: "Código inválido. Confira as letras e os números." };

  const device = await db.totemDevice.findUnique({ where: { pairingCode }, select: { id: true, restaurantId: true } });
  if (!device?.restaurantId) return { erro: "Não achei esse código. Ele aparece no painel, na seção Totem." };

  await db.totemDevice.update({
    where: { id: device.id },
    data: { tokenHash: hashDoToken(token), pairedAt: new Date(), pairingCode: null },
    select: { id: true },
  });
  return { ok: true as const, deviceId: device.id, restaurantId: device.restaurantId };
}

export function listarTotens(restaurantId: string) {
  return db.totemDevice.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, printerName: true, appVersion: true, pairingCode: true, pairedAt: true, lastSeenAt: true },
  });
}

/** desligar um totem do restaurante (trocou de aparelho, sumiu, devolveu) */
export function desligarTotem(id: string, restaurantId: string) {
  return db.totemDevice.deleteMany({ where: { id, restaurantId } });
}
