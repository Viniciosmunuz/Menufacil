"use client";

import { useActionState } from "react";

import { SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { updateRestaurantBasics, type AdminFormState } from "../actions";
import { CategoryPicker } from "../category-picker";

export function BasicsForm({
  restaurant,
  categories,
}: {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
    featured: boolean;
    categoryIds: string[];
  };
  categories: { id: string; name: string; icon: string | null }[];
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(updateRestaurantBasics, {});
  const v = state.values;
  const err = state.fieldErrors ?? {};
  const selected = new Set(v ? (v.categoryIds?.split(",") ?? []) : restaurant.categoryIds);

  return (
    <Card>
      <SectionTitle description="O que é da plataforma. Endereço, Pix, horários e cardápio ficam em Gerenciar restaurante.">
        Dados básicos
      </SectionTitle>
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="restaurantId" value={restaurant.id} />
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}

        <Field label="Nome" htmlFor="name" error={err.name}>
          <Input id="name" name="name" required maxLength={80} defaultValue={v?.name ?? restaurant.name} aria-invalid={!!err.name} />
        </Field>
        <Field
          label="Endereço da página"
          htmlFor="slug"
          error={err.slug}
          hint="Se mudar, o link antigo deixa de funcionar."
        >
          <div className="flex items-center rounded-control border border-line bg-surface-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
            <span className="shrink-0 pl-4 text-faint">/restaurante/</span>
            <Input
              id="slug"
              name="slug"
              required
              maxLength={60}
              defaultValue={v?.slug ?? restaurant.slug}
              className="border-0 bg-transparent pl-0.5 focus:ring-0"
              aria-invalid={!!err.slug}
            />
          </div>
        </Field>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_7rem]">
          <Field label="Cidade" htmlFor="city" error={err.city}>
            <Input id="city" name="city" required maxLength={80} defaultValue={v?.city ?? restaurant.city ?? ""} aria-invalid={!!err.city} />
          </Field>
          <Field label="Estado" htmlFor="state" error={err.state}>
            <Input id="state" name="state" maxLength={2} defaultValue={v?.state ?? restaurant.state ?? ""} className="uppercase" aria-invalid={!!err.state} />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold">Categorias</span>
          <CategoryPicker categories={categories} selected={selected} />
        </div>
        <Checkbox
          name="featured"
          defaultChecked={v ? v.featured === "on" : restaurant.featured}
          label="Destaque na página inicial"
          hint="Aparece em “Restaurantes em destaque” quando estiver no ar."
        />
        <div>
          <SubmitButton>Salvar dados</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
