import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import { generateTemporaryPassword, hashPassword } from "./auth/password";
import { deleteAllSessions } from "./auth/session";

// Acesso dos donos de restaurante. O admin cria a conta (ou liga uma conta
// que já existe) e entrega uma senha provisória; o dono troca no primeiro
// acesso. O admin nunca precisa saber a senha definitiva do dono.

/** mostrado uma única vez ao admin, para ele entregar ao dono */
export type NewCredentials = { name: string; email: string; password: string };

type Tx = Prisma.TransactionClient;

export type OwnerLinkResult =
  | { ok: true; userId: string; credentials: NewCredentials | null }
  | { ok: false; error: string };

/**
 * Liga um dono ao restaurante. E-mail novo: cria a conta com senha
 * provisória. E-mail de um dono que já existe: só liga (ele continua com a
 * senha dele).
 */
export async function linkOwner(
  tx: Tx,
  params: { restaurantId: string; name: string; email: string; phone: string | null; passwordHash?: string; password?: string },
): Promise<OwnerLinkResult> {
  const existing = await tx.user.findUnique({ where: { email: params.email } });

  if (existing) {
    if (existing.role !== "RESTAURANT_OWNER") {
      return { ok: false, error: "Este e-mail é de um administrador da plataforma. Use outro e-mail para o dono." };
    }
    await tx.restaurantOwner.upsert({
      where: { restaurantId_userId: { restaurantId: params.restaurantId, userId: existing.id } },
      update: {},
      create: { restaurantId: params.restaurantId, userId: existing.id },
    });
    return { ok: true, userId: existing.id, credentials: null };
  }

  if (!params.password || !params.passwordHash) throw new Error("linkOwner: senha provisória não preparada");

  const user = await tx.user.create({
    data: {
      name: params.name,
      email: params.email,
      phone: params.phone,
      passwordHash: params.passwordHash,
      role: "RESTAURANT_OWNER",
      mustChangePassword: true,
      ownerships: { create: { restaurantId: params.restaurantId } },
    },
  });
  return { ok: true, userId: user.id, credentials: { name: user.name, email: user.email, password: params.password } };
}

/** o hash do bcrypt é lento: prepara fora da transação (sem senha escolhida, gera uma) */
export async function prepareTemporaryPassword(chosen?: string | null) {
  const password = chosen || generateTemporaryPassword();
  return { password, passwordHash: await hashPassword(password) };
}

/** nova senha provisória: derruba as sessões abertas e obriga a troca */
export async function resetOwnerPassword(userId: string): Promise<NewCredentials> {
  const { password, passwordHash } = await prepareTemporaryPassword();
  const user = await db.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });
  await deleteAllSessions(userId);
  return { name: user.name, email: user.email, password };
}
