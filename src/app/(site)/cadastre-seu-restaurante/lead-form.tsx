"use client";

import { CircleCheck } from "lucide-react";
import { Fragment, useActionState, type ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { createLead, type LeadState } from "./actions";

// O mesmo formulário serve à página de venda e à página de contato; o que
// muda é só o texto do botão e o da confirmação.
export function LeadForm({
  submitLabel = "Quero cadastrar meu restaurante",
  successTitle = "Recebemos seu contato!",
  successText = "A equipe MenuFácil vai chamar você no WhatsApp para montar o seu cardápio.",
  footer,
}: {
  submitLabel?: string;
  successTitle?: string;
  successText?: string;
  /** botão extra abaixo do enviar (ex.: falar no WhatsApp) */
  footer?: ReactNode;
}) {
  const [state, action] = useActionState<LeadState, FormData>(createLead, {});
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  if (state.ok) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <CircleCheck className="size-12 text-success" aria-hidden="true" />
        <p className="text-xl font-extrabold">{successTitle}</p>
        <p className="max-w-sm text-muted">{successText}</p>
      </Card>
    );
  }

  return (
    <Card>
      <form action={action} className="flex flex-col gap-5">
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {/* armadilha para robôs: o atributo hidden tira o campo da tela mesmo
            se o CSS ainda não tiver carregado, e o robô continua caindo nele */}
        <div hidden aria-hidden="true">
          <label htmlFor="website">Site</label>
          <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
        <Fragment key={JSON.stringify(state.values ?? null)}>
          <Field label="Seu nome" htmlFor="contactName" error={err.contactName}>
            <Input id="contactName" name="contactName" required maxLength={80} autoComplete="name" defaultValue={v.contactName} aria-invalid={!!err.contactName} />
          </Field>
          <Field label="Nome do restaurante" htmlFor="restaurantName" error={err.restaurantName}>
            <Input id="restaurantName" name="restaurantName" required maxLength={80} defaultValue={v.restaurantName} aria-invalid={!!err.restaurantName} />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp" error={err.whatsapp}>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel-national"
              placeholder="(92) 99999-0000"
              defaultValue={v.whatsapp}
              aria-invalid={!!err.whatsapp}
            />
          </Field>
          <Field label="Cidade" htmlFor="city" error={err.city} hint="Opcional.">
            <Input id="city" name="city" maxLength={80} defaultValue={v.city} />
          </Field>
          <Field label="Quer contar algo?" htmlFor="message" error={err.message} hint="Opcional. Ex.: tipo de comida, se já tem cardápio pronto.">
            <Textarea id="message" name="message" maxLength={500} rows={3} defaultValue={v.message} />
          </Field>
        </Fragment>
        <SubmitButton size="lg" pendingText="Enviando...">
          {submitLabel}
        </SubmitButton>
        {footer}
      </form>
    </Card>
  );
}
