import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/dal";
import { homeFor } from "@/server/auth/redirects";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  const { voltar } = await searchParams;
  const returnTo = typeof voltar === "string" ? voltar : undefined;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8" aria-label="MenuFácil: voltar para o início">
        <Logo withSlogan />
      </Link>

      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-extrabold">Entrar no painel</h1>
        <p className="mt-1 mb-6 text-muted">
          Acesso para restaurantes parceiros e para a equipe MenuFácil.
        </p>
        <LoginForm returnTo={returnTo} />
      </Card>

      <p className="mt-6 max-w-md text-center text-sm text-faint">
        Quer fazer um pedido? Não precisa de conta.{" "}
        <Link href="/" className="font-bold text-brand hover:underline">
          Ver restaurantes
        </Link>
      </p>
    </main>
  );
}
