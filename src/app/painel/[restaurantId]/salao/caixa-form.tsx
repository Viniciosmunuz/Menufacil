"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";

import { abrirCaixa, fecharCaixa, type SalaoFormState } from "./actions";

// Abrir e fechar o caixa do salão.
//
// O valor pedido não é formalidade. Na abertura é o troco que já está na
// gaveta; no fechamento, o que sobrou nela. Sem os dois, a conferência da
// noite não fecha, porque o dinheiro ao fim é o troco do começo mais o que
// entrou -- e aí ninguém sabe se falta.

export function AbrirCaixaForm({ restaurantId }: { restaurantId: string }) {
  const [state, action] = useActionState<SalaoFormState, FormData>(abrirCaixa, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />

      <Field label="Dinheiro na gaveta" htmlFor="abertura" hint="O troco com que a noite começa. Pode ser zero.">
        <MoneyInput id="abertura" name="abertura" defaultValue="" className="h-12" />
      </Field>

      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <div>
        <SubmitButton pendingText="Abrindo...">Abrir o salão</SubmitButton>
      </div>
    </form>
  );
}

export function FecharCaixaForm({ restaurantId, podeFechar }: { restaurantId: string; podeFechar: boolean }) {
  const [state, action] = useActionState<SalaoFormState, FormData>(fecharCaixa, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />

      <Field label="Dinheiro na gaveta agora" htmlFor="fechamento" hint="O que foi contado no fim da noite.">
        <MoneyInput id="fechamento" name="fechamento" defaultValue="" className="h-12" disabled={!podeFechar} />
      </Field>

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}

      <div>
        <SubmitButton variant="secondary" pendingText="Fechando..." disabled={!podeFechar}>
          Fechar o salão
        </SubmitButton>
      </div>
    </form>
  );
}
