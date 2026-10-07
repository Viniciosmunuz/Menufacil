"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

import { login, type LoginState } from "./actions";

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      {state.error && <Alert tone="danger">{state.error}</Alert>}

      {/* Texto, e não type="email".

          O garçom entra com o CPF, e um campo de e-mail faz o próprio
          navegador recusar qualquer coisa sem arroba -- o valor nem chega
          ao servidor, e a pessoa fica olhando para um formulário que não
          envia e não explica por quê. */}
      <Field label="E-mail ou CPF" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          required
          defaultValue={state.email}
          placeholder="voce@restaurante.com ou seu CPF"
        />
      </Field>

      <Field label="Senha" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Sua senha"
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
