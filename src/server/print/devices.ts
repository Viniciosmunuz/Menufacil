import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";

import { db } from "@/lib/db";

// Print Fácil: o programa que o restaurante instala no computador para os
// pedidos saírem sozinhos na impressora. Cada instalação é um dispositivo.
//
// O programa se registra uma vez e guarda um token; aqui fica só o hash
// dele, como nas sessões do site. Enquanto ninguém digita o código de
// pareamento no painel, o dispositivo não está ligado a restaurante
// nenhum e não enxerga pedido algum.

/** alfabeto sem letras que se confundem no papel: O/0, I/1, S/5 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRTUVWXYZ2346789";
const CODE_PREFIX = "MF";

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const block = (size: number) =>
  Array.from({ length: size }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

/** código curto de ditar por telefone: MF-8K29-XP4 */
function newPairingCode() {
  return `${CODE_PREFIX}-${block(4)}-${block(3)}`;
}

async function freePairingCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = newPairingCode();
    const taken = await db.printDevice.findUnique({ where: { pairingCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error("não foi possível gerar um código de pareamento");
}

/** o programa chama isto na primeira vez que roda */
export async function registerDevice(name: string) {
  const token = randomBytes(32).toString("base64url");
  const pairingCode = await freePairingCode();
  const device = await db.printDevice.create({
    data: { name: name.slice(0, 80) || "Computador", tokenHash: hashToken(token), pairingCode },
    select: { id: true, pairingCode: true },
  });
  // o token aparece uma vez só: daqui em diante só o programa tem ele
  return { deviceId: device.id, token, pairingCode: device.pairingCode! };
}

export type AuthedDevice = {
  id: string;
  name: string;
  restaurantId: string | null;
  pairingCode: string | null;
  printerName: string | null;
  restaurant: { id: string; name: string; receiptWidth: number } | null;
};

/** dispositivo do cabeçalho Authorization: Bearer <token> */
export async function deviceFromRequest(request: Request): Promise<AuthedDevice | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const device = await db.printDevice.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      name: true,
      restaurantId: true,
      pairingCode: true,
      printerName: true,
      restaurant: { select: { id: true, name: true, receiptWidth: true } },
    },
  });
  return device ?? null;
}

/** marca que o programa falou com o servidor agora (aparece no painel) */
export function touchDevice(id: string, printerName?: string | null) {
  return db.printDevice.update({
    where: { id },
    data: { lastSeenAt: new Date(), ...(printerName === undefined ? {} : { printerName: printerName?.slice(0, 120) ?? null }) },
    select: { id: true },
  });
}

/** o dono digitou o código no painel: o dispositivo passa a ser do restaurante */
export async function pairDevice(code: string, restaurantId: string) {
  const pairingCode = code.trim().toUpperCase();
  if (!/^MF-[A-Z0-9]{4}-[A-Z0-9]{3}$/.test(pairingCode)) return { error: "Código inválido. Confira as letras e os números." };

  const device = await db.printDevice.findUnique({ where: { pairingCode }, select: { id: true, restaurantId: true } });
  if (!device) return { error: "Não achei esse código. Ele aparece na tela do Print Fácil." };
  if (device.restaurantId) return { error: "Esse código já foi usado." };

  await db.printDevice.update({
    where: { id: device.id },
    data: { restaurantId, pairedAt: new Date(), pairingCode: null },
    select: { id: true },
  });
  return { ok: true as const };
}

export function listDevices(restaurantId: string) {
  return db.printDevice.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, printerName: true, pairedAt: true, lastSeenAt: true },
  });
}

/** desligar um computador do restaurante (perdeu, trocou de máquina) */
export function unpairDevice(id: string, restaurantId: string) {
  return db.printDevice.deleteMany({ where: { id, restaurantId } });
}
