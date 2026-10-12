"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { NivelGarcom } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { formatCpf } from "@/lib/cpf";
import { NIVEIS } from "@/lib/niveis";

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
  const [nivel, setNivel] = useState<NivelGarcom>("GARCOM");

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
          trabalho dele é feito. O nível diz quem também mexe no que já
          aconteceu, e nasce no de baixo: subir é um toque, e o contrário
          de subir é descobrir no fim da noite que uma conta foi zerada. */}
      <fieldset className="flex flex-col gap-2 rounded-control border border-line p-4">
        <legend className="px-1 text-sm font-bold text-muted">Nível</legend>
        <input type="hidden" name="nivel" value={nivel} />
        {NIVEIS.map((n) => {
          const aceso = nivel === n.chave;
          return (
            <button
              key={n.chave}
              type="button"
              role="radio"
              aria-checked={aceso}
              onClick={() => setNivel(n.chave)}
              className={cn(
                "rounded-control border p-3 text-left transition-colors",
                aceso ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <span className={aceso ? "block font-extrabold text-brand" : "block font-extrabold"}>{n.nome}</span>
              <span className="block text-sm text-muted">{n.resumo}</span>
            </button>
          );
        })}
      </fieldset>

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}

      <div>
        <SubmitButton pendingText="Cadastrando...">Cadastrar garçom</SubmitButton>
      </div>
    </form>
  );
}
