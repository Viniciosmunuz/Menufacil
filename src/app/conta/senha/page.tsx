import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/server/auth/dal";

import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Trocar senha" };

export default async function ChangePasswordPage() {
  const user = await requireUser();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8" />
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-extrabold">Crie sua senha</h1>
        <p className="mt-1 mb-6 text-muted">Olá, {user.name.split(" ")[0]}.</p>
        {user.mustChangePassword && (
          <Alert tone="warning" className="mb-6">
            Por segurança, troque a senha provisória antes de continuar.
          </Alert>
        )}
        <ChangePasswordForm />
      </Card>
    </main>
  );
}
