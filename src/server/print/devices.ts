import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";

import type { PrintRole } from "@/generated/prisma/enums";

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
  /** qual papel sai nesta impressora: a comanda da cozinha ou a senha do cliente */
  role: PrintRole;
  restaurantId: string | null;
  pairingCode: string | null;
  printerName: string | null;
  /** preenchido no Menu Fácil PC, que só tira o que é do salão */
  appKey: string | null;
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
      role: true,
      restaurantId: true,
      pairingCode: true,
      printerName: true,
      appKey: true,
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
    // o Menu Fácil PC fica fora: ele só imprime o salão, e entrar nesta
    // lista mudaria o jeito de imprimir o delivery nas outras telas
    where: { restaurantId, appKey: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, role: true, printerName: true, pairedAt: true, lastSeenAt: true },
  });
}

/** desligar um computador do restaurante (perdeu, trocou de máquina) */
export function unpairDevice(id: string, restaurantId: string) {
  return db.printDevice.deleteMany({ where: { id, restaurantId } });
}

/**
 * Trocar o papel de uma impressora.
 *
 * Só aparece para quem tem totem: no restaurante sem totem toda impressora
 * é de comanda, que é como todas nascem.
 */
export function setDeviceRole(id: string, restaurantId: string, role: PrintRole) {
  return db.printDevice.updateMany({ where: { id, restaurantId }, data: { role } });
}

/**
 * O Menu Fácil PC entra na fila como um aparelho.
 *
 * O painel aberto no programa do Windows imprimia só pela tela de Pedidos,
 * e só o delivery: a comanda do salão e a conta da mesa não tinham por
 * onde sair, e a configuração do salão dizia que não havia impressora
 * nenhuma. Aqui ele vira um aparelho como o Print Fácil -- com a mesma
 * fila, a mesma trava e a mesma divisão por seção.
 *
 * Não há código para digitar: quem chama já está logado como dono. A
 * chave é o restaurante e o nome do computador, então abrir o programa de
 * novo reaproveita o mesmo aparelho em vez de criar outro. O token troca a
 * cada abertura e só o painel daquela janela fica com ele.
 *
 * Cada impressora a mais do mesmo computador (a do bar ao lado da do
 * caixa) é outro aparelho, com o nome dela na chave: é o que deixa o dono
 * mandar a seção Bebidas para uma e o resto para a outra.
 */
const chaveDoPc = (restaurantId: string, computador: string) => `${restaurantId}:${computador.trim().slice(0, 80).toLowerCase() || "computador"}`;

export type ImpressoraDoPc = {
  deviceId: string;
  token: string;
  /** quando virou impressora: o que é de antes não sai */
  desde: string;
  /** null é a do caixa, a escolhida nos ajustes do programa */
  impressora: string | null;
};

export async function ligarAppDoPc(restaurantId: string, computador: string, impressora: string | null): Promise<ImpressoraDoPc[]> {
  const nome = computador.trim().slice(0, 80) || "Computador";
  const base = chaveDoPc(restaurantId, nome);
  const agora = new Date();

  const novoToken = () => {
    const token = randomBytes(32).toString("base64url");
    return { token, tokenHash: hashToken(token) };
  };

  const doCaixa = novoToken();
  const principal = await db.printDevice.upsert({
    where: { appKey: base },
    create: {
      appKey: base,
      restaurantId,
      name: nome,
      tokenHash: doCaixa.tokenHash,
      printerName: impressora?.slice(0, 120) ?? null,
      pairedAt: agora,
      lastSeenAt: agora,
    },
    update: { tokenHash: doCaixa.tokenHash, printerName: impressora?.slice(0, 120) ?? null, lastSeenAt: agora },
    select: { id: true, createdAt: true },
  });

  const extras = await db.printDevice.findMany({
    where: { restaurantId, appKey: { startsWith: base + ":" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true, printerName: true },
  });

  const lista: ImpressoraDoPc[] = [{ deviceId: principal.id, token: doCaixa.token, desde: principal.createdAt.toISOString(), impressora: null }];
  for (const e of extras) {
    // a mesma impressora escolhida como a do caixa não sai duas vezes
    if (!e.printerName || e.printerName === impressora) continue;
    const t = novoToken();
    await db.printDevice.update({ where: { id: e.id }, data: { tokenHash: t.tokenHash, lastSeenAt: agora }, select: { id: true } });
    lista.push({ deviceId: e.id, token: t.token, desde: e.createdAt.toISOString(), impressora: e.printerName });
  }
  return lista;
}

/** as impressoras a mais deste computador que já estão ligadas */
export function extrasDoPc(restaurantId: string, computador: string) {
  return db.printDevice.findMany({
    where: { restaurantId, appKey: { startsWith: chaveDoPc(restaurantId, computador) + ":" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, printerName: true },
  });
}

/** liga mais uma impressora do computador; ela nasce sem seção nenhuma */
export function ligarExtraDoPc(restaurantId: string, computador: string, impressora: string) {
  const nome = computador.trim().slice(0, 80) || "Computador";
  const nomeDaImpressora = impressora.trim().slice(0, 120);
  const appKey = `${chaveDoPc(restaurantId, nome)}:${nomeDaImpressora.toLowerCase()}`;
  return db.printDevice.upsert({
    where: { appKey },
    create: {
      appKey,
      restaurantId,
      name: nome,
      // o token de verdade sai na próxima vez que o painel ligar a fila
      tokenHash: hashToken(randomBytes(32).toString("base64url")),
      printerName: nomeDaImpressora,
      pairedAt: new Date(),
      lastSeenAt: new Date(),
    },
    update: {},
    select: { id: true },
  });
}

/**
 * Desliga uma impressora a mais. A seção que saía nela volta para a do
 * caixa sozinha: a ligação no cardápio some junto (SetNull).
 */
export function desligarExtraDoPc(restaurantId: string, computador: string, deviceId: string) {
  return db.printDevice.deleteMany({
    where: { id: deviceId, restaurantId, appKey: { startsWith: chaveDoPc(restaurantId, computador) + ":" } },
  });
}
