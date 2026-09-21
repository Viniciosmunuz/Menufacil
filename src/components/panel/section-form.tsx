"use client";

import { CircleCheck } from "lucide-react";
import { Fragment, useActionState, type ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatTime } from "@/lib/format";

import { SectionTitle } from "./page-header";

export type SectionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  savedAt?: number;
};

// Um bloco da tela com o próprio botão "Salvar". O dono vê na hora que
// salvou, sem precisar rolar a página inteira.
export function SectionForm({
  id,
  title,
  description,
  action,
  restaurantId,
  submitLabel = "Salvar",
  children,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  action: (state: SectionState, formData: FormData) => Promise<SectionState>;
  restaurantId: string;
  submitLabel?: string;
  children: (state: SectionState) => ReactNode;
}) {
  const [state, formAction] = useActionState(action, {});
  // Depois de enviar, o React reseta o formulário para os valores "padrão"
  // de quando os campos apareceram (um <select> voltaria para "Escolha").
  // Recriar os campos a cada resposta faz o padrão ser o valor atual.
  const fieldsKey = state.savedAt ?? JSON.stringify(state.values ?? null);

  return (
    <Card id={id} className="scroll-mt-24">
      <SectionTitle description={description}>{title}</SectionTitle>
      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {state.fieldErrors && !state.error && (
          <Alert tone="danger">Confira os campos marcados em vermelho.</Alert>
        )}
        <Fragment key={fieldsKey}>{children(state)}</Fragment>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton>{submitLabel}</SubmitButton>
          {state.ok && state.savedAt && (
            <span className="flex items-center gap-1.5 text-sm font-bold text-success" role="status">
              <CircleCheck className="size-4" aria-hidden="true" />
              Salvo às {formatTime(new Date(state.savedAt))}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
