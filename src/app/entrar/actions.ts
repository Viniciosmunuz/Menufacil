"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { cpfValido, soDigitos } from "@/lib/cpf";
import { db } from "@/lib/db";
import { dummyPasswordCheck, verifyPassword } from "@/server/auth/password";
import { homeFor, safeReturnPath } from "@/server/auth/redirects";
import { createSession } from "@/server/auth/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
  returnTo: z.string().optional(),
});

/**
 * A conta do garçom, a partir do CPF digitado.
 *
 * Ele entra pela mesma tela de todo mundo -- é um login só no sistema --, e
 * o campo passou a aceitar e-mail ou CPF. A conta do garçom é identificada
 * por um endereço interno montado com o CPF, então aqui basta procurá-lo.
 *
 * O CPF é o login porque é o número que o garçom sabe de cor: um apelido
 * inventado no dia do cadastro ninguém lembra duas semanas depois, e aí o
 * dono é chamado no meio do movimento para lembrar qual era.
 */
async function contaPorCpf(digitado: string) {
  const cpf = soDigitos(digitado);
  if (!cpfValido(cpf)) return null;
  return db.user.findFirst({ where: { email: { startsWith: cpf + "@", endsWith: ".garcom" } } });
}

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    returnTo: formData.get("returnTo") ?? undefined,
  });
  const typedEmail = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: "Informe o e-mail ou o CPF e a senha.", email: typedEmail };

  const { email, password, returnTo } = parsed.data;
  const user = email.includes("@") ? await db.user.findUnique({ where: { email } }) : await contaPorCpf(email);

  // mesma demora com ou sem e-mail cadastrado
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : (await dummyPasswordCheck(password), false);

  if (!user || !valid) return { error: "E-mail, CPF ou senha incorretos.", email: typedEmail };
  if (user.status !== "ACTIVE") {
    return { error: "Esta conta está desativada. Fale com o suporte do MenuFácil.", email: typedEmail };
  }

  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  if (user.mustChangePassword) redirect("/conta/senha");
  redirect(safeReturnPath(returnTo, user.role) ?? homeFor(user.role));
}
