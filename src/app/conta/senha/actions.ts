"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/dal";
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "@/server/auth/password";
import { homeFor } from "@/server/auth/redirects";
import { createSession, deleteAllSessions } from "@/server/auth/session";

const schema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    next: z.string().min(MIN_PASSWORD_LENGTH, `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "As duas senhas novas não são iguais.", path: ["confirm"] })
  .refine((v) => v.next !== v.current, { message: "A nova senha precisa ser diferente da atual.", path: ["next"] });

export type ChangePasswordState = { error?: string };

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(parsed.data.current, record.passwordHash))) {
    return { error: "A senha atual está incorreta." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.next), mustChangePassword: false },
  });

  // senha nova derruba as outras sessões abertas; esta continua valendo
  await deleteAllSessions(user.id);
  await createSession(user.id);
  await audit({ actorUserId: user.id, action: "user.password_change" });

  redirect(homeFor(user.role));
}
