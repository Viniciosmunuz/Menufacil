"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { changePassword, type ChangePasswordState } from "./actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePassword, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <Field label="Senha atual" htmlFor="current" hint="A senha que você recebeu ou usou para entrar.">
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Nova senha" htmlFor="next" hint="Pelo menos 8 caracteres.">
        <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="Repita a nova senha" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
