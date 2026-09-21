"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { CredentialsCard } from "@/components/panel/credentials-card";
import { SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";

import { createRestaurant, type AdminFormState } from "../actions";
import { CategoryPicker } from "../category-picker";

type Initial = Partial<Record<"leadId" | "name" | "city" | "whatsapp" | "ownerName" | "ownerPhone", string>>;

export function NewRestaurantForm({
  categories,
  initial,
}: {
  categories: { id: string; name: string; icon: string | null }[];
  initial: Initial;
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(createRestaurant, {});
  const [ownerMode, setOwnerMode] = useState<"new" | "later">(
    (state.values?.ownerMode as "new" | "later" | undefined) ?? "new",
  );

  if (state.ok && state.credentials && state.restaurantId) {
    return (
      <div className="flex max-w-2xl flex-col gap-5">
        <Alert tone="success">
          <span className="flex items-center gap-2 font-bold">
            <CircleCheck className="size-5" aria-hidden="true" />
            Restaurante cadastrado e acesso do dono criado.
          </span>
        </Alert>
        <CredentialsCard credentials={state.credentials} title="Acesso do dono" />
        <div className="flex flex-wrap gap-2">
          <Link href={`/painel/${state.restaurantId}/cardapio`} className={buttonClasses("primary")}>
            Montar o cardápio agora
          </Link>
          <Link href={`/admin/restaurantes/${state.restaurantId}`} className={buttonClasses("secondary")}>
            Abrir a ficha do restaurante
          </Link>
        </div>
      </div>
    );
  }

  const v: Record<string, string | undefined> = { ...initial, ...state.values };
  const err = state.fieldErrors ?? {};
  const selected = new Set(v.categoryIds?.split(",") ?? []);

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-6">
      {v.leadId && <input type="hidden" name="leadId" value={v.leadId} />}
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <Card>
        <SectionTitle description="O resto (endereço, horários, Pix, cardápio) você completa no painel do restaurante.">
          Restaurante
        </SectionTitle>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
          <Field label="Nome do restaurante" htmlFor="name" error={err.name} className="sm:col-span-6">
            <Input id="name" name="name" required maxLength={80} defaultValue={v.name} placeholder="Ex.: Pizzaria do Centro" aria-invalid={!!err.name} />
          </Field>
          <Field label="Cidade" htmlFor="city" error={err.city} className="sm:col-span-4">
            <Input id="city" name="city" required maxLength={80} defaultValue={v.city} placeholder="Ex.: Presidente Figueiredo" aria-invalid={!!err.city} />
          </Field>
          <Field label="Estado" htmlFor="state" error={err.state} className="sm:col-span-2">
            <Input id="state" name="state" maxLength={2} defaultValue={v.state} placeholder="AM" className="uppercase" aria-invalid={!!err.state} />
          </Field>
          <Field
            label="WhatsApp dos pedidos"
            htmlFor="whatsapp"
            error={err.whatsapp}
            hint="Número que recebe os pedidos. Pode completar depois."
            className="sm:col-span-6"
          >
            <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={v.whatsapp} placeholder="(92) 99999-0000" aria-invalid={!!err.whatsapp} />
          </Field>
          <div className="flex flex-col gap-2 sm:col-span-6">
            <span className="text-sm font-bold">Categorias</span>
            <CategoryPicker categories={categories} selected={selected} />
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle description="O dono recebe uma senha provisória e cria a dele no primeiro acesso.">
          Acesso do dono
        </SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Acesso do dono">
          {[
            { value: "new" as const, title: "Criar o acesso agora", text: "Gera o login do dono junto com o cadastro." },
            { value: "later" as const, title: "Deixar para depois", text: "Você monta tudo antes e cria o acesso na entrega." },
          ].map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-control border px-4 py-3",
                ownerMode === opt.value ? "border-brand bg-brand-soft" : "border-line bg-surface-2 hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name="ownerMode"
                value={opt.value}
                checked={ownerMode === opt.value}
                onChange={() => setOwnerMode(opt.value)}
                className="mt-1 size-4 accent-brand"
              />
              <span>
                <span className="block font-bold">{opt.title}</span>
                <span className="block text-sm text-muted">{opt.text}</span>
              </span>
            </label>
          ))}
        </div>

        {ownerMode === "new" && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Nome do dono" htmlFor="ownerName" error={err.ownerName} className="sm:col-span-2">
              <Input id="ownerName" name="ownerName" maxLength={80} defaultValue={v.ownerName} autoComplete="off" aria-invalid={!!err.ownerName} />
            </Field>
            <Field label="E-mail de acesso" htmlFor="ownerEmail" error={err.ownerEmail} hint="É com ele que o dono entra no painel.">
              <Input id="ownerEmail" name="ownerEmail" type="email" inputMode="email" defaultValue={v.ownerEmail} autoComplete="off" aria-invalid={!!err.ownerEmail} />
            </Field>
            <Field label="Celular do dono" htmlFor="ownerPhone" error={err.ownerPhone} hint="Opcional.">
              <Input id="ownerPhone" name="ownerPhone" type="tel" inputMode="tel" defaultValue={v.ownerPhone} placeholder="(92) 99999-0000" aria-invalid={!!err.ownerPhone} />
            </Field>
          </div>
        )}
      </Card>

      <div>
        <SubmitButton size="lg" pendingText="Cadastrando...">
          Cadastrar restaurante
        </SubmitButton>
      </div>
    </form>
  );
}
