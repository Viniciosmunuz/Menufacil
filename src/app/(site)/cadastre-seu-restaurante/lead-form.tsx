"use client";

import { CircleCheck } from "lucide-react";
import { Fragment, useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { createLead, type LeadState } from "./actions";

export function LeadForm() {
  const [state, action] = useActionState<LeadState, FormData>(createLead, {});
  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};

  if (state.ok) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <CircleCheck className="size-12 text-success" aria-hidden="true" />
        <p className="text-xl font-extrabold">Recebemos seu contato!</p>
        <p className="max-w-sm text-muted">A equipe MenuFácil vai chamar você no WhatsApp para montar o seu cardápio.</p>
      </Card>
    );
  }

  return (
    <Card>
      <form action={action} className="relative flex flex-col gap-5">
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {/* armadilha para robôs: pessoas não veem este campo */}
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label>
            Site
            <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
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
          Quero cadastrar meu restaurante
        </SubmitButton>
      </form>
    </Card>
  );
}
