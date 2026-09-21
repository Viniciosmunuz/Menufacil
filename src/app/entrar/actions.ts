"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { dummyPasswordCheck, verifyPassword } from "@/server/auth/password";
import { homeFor, safeReturnPath } from "@/server/auth/redirects";
import { createSession } from "@/server/auth/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
  returnTo: z.string().optional(),
});

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    returnTo: formData.get("returnTo") ?? undefined,
  });
  const typedEmail = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: "Informe um e-mail válido e a senha.", email: typedEmail };

  const { email, password, returnTo } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  // mesma demora com ou sem e-mail cadastrado
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : (await dummyPasswordCheck(password), false);

  if (!user || !valid) return { error: "E-mail ou senha incorretos.", email: typedEmail };
  if (user.status !== "ACTIVE") {
    return { error: "Esta conta está desativada. Fale com o suporte do MenuFácil.", email: typedEmail };
  }

  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  if (user.mustChangePassword) redirect("/conta/senha");
  redirect(safeReturnPath(returnTo, user.role) ?? homeFor(user.role));
}
