"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCpf } from "@/lib/cpf";

import { adicionarGarcom, type SalaoFormState } from "./actions";

// A conta do garçom.
//
// Nome, CPF e senha. O CPF é o login porque é o número que o garçom sabe de
// cor e não esquece -- um apelido inventado no dia do cadastro ninguém
// lembra duas semanas depois, e aí o dono é chamado no meio do movimento
// para lembrar qual era.
//
// O nome não é enfeite: é ele que sai na comanda da cozinha, para o balcão
// saber de quem é o pedido quando o papel aparece.

export function GarcomForm({ restaurantId }: { restaurantId: string }) {
  const [state, action] = useActionState<SalaoFormState, FormData>(adicionarGarcom, {});
  const [cpf, setCpf] = useState("");

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />

      <Field label="Nome" htmlFor="g-nome" hint="Sai na comanda, para a cozinha saber quem pediu.">
        <Input id="g-nome" name="nome" maxLength={60} placeholder="João Silva" autoComplete="off" />
      </Field>

      <Field label="CPF" htmlFor="g-cpf" hint="É com ele que o garçom entra.">
        <Input
          id="g-cpf"
          name="cpf"
          value={cpf}
          onChange={(e) => setCpf(formatCpf(e.target.value))}
          inputMode="numeric"
          maxLength={14}
          placeholder="000.000.000-00"
          autoComplete="off"
          className="tabular-nums"
        />
      </Field>

      <Field label="Senha" htmlFor="g-senha" hint="Entregue ao garçom. Ele não precisa trocar no primeiro acesso.">
        <Input id="g-senha" name="senha" type="text" maxLength={60} placeholder="4 caracteres ou mais" autoComplete="off" />
      </Field>

      {/* Todo garçom lança pedido e recebe pagamento -- é disso que o
          trabalho dele é feito. Estas duas mexem no que a cozinha já
          produziu e no que entra no caixa, então ficam desmarcadas até o
          dono confiar em alguém para elas. */}
      <fieldset className="flex flex-col gap-2 rounded-control border border-line p-4">
        <legend className="px-1 text-sm font-bold text-muted">O que ele pode fazer além de lançar e receber</legend>
        <Checkbox name="podeExcluirItem" label="Apagar item da comanda" hint="Item já enviado para a cozinha." />
        <Checkbox name="podeFinalizarMesa" label="Finalizar a mesa" hint="Sem isto, quem fecha a mesa é o balcão, pelo painel." />
      </fieldset>

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}

      <div>
        <SubmitButton pendingText="Cadastrando...">Cadastrar garçom</SubmitButton>
      </div>
    </form>
  );
}
