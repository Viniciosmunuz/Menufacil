"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { salvarRecarga, type EstadoDaRecarga } from "./actions";

/** onde ele informa a última recarga: o valor em dólar e o dia */
export function RecargaForm({ hoje }: { hoje: string }) {
  const [estado, acao] = useActionState<EstadoDaRecarga, FormData>(salvarRecarga, {});

  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quanto carregou (US$)" htmlFor="valor">
          <Input id="valor" name="valor" inputMode="decimal" placeholder="25,00" required />
        </Field>
        <Field label="Em que dia" htmlFor="dia">
          <Input id="dia" name="dia" type="date" max={hoje} defaultValue={hoje} required />
        </Field>
      </div>
      <div>
        <SubmitButton pendingText="Salvando...">Salvar recarga</SubmitButton>
      </div>
    </form>
  );
}
