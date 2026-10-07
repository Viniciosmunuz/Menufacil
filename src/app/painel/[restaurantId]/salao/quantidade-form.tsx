"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { definirQuantidade, type SalaoFormState } from "./actions";

// Quantas mesas, quantos lugares de balcão.
//
// Um campo e um botão, em vez de uma lista onde se cria uma por uma: num
// salão de trinta mesas, cadastrar trinta vezes é trabalho que o sistema
// faz sozinho. O dono diz o número e elas nascem numeradas de 1 em diante.

export function QuantidadeForm({
  restaurantId,
  tipo,
  atual,
  titulo,
  descricao,
}: {
  restaurantId: string;
  tipo: "MESA" | "BALCAO";
  atual: number;
  titulo: string;
  descricao: string;
}) {
  const [state, action] = useActionState<SalaoFormState, FormData>(definirQuantidade, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="tipo" value={tipo} />

      <div>
        <h3 className="font-extrabold">{titulo}</h3>
        <p className="text-sm text-muted">{descricao}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-28">
          <Input
            type="number"
            name="quantidade"
            min={0}
            max={120}
            defaultValue={atual}
            aria-label={titulo}
            className="h-12 text-center text-lg font-extrabold tabular-nums"
          />
        </div>
        <SubmitButton variant="secondary" pendingText="Salvando...">
          Salvar
        </SubmitButton>
      </div>

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
    </form>
  );
}
