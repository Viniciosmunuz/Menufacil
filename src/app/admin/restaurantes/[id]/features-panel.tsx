"use client";

import { useActionState } from "react";

import { SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/ui/submit-button";
import { FEATURES, type RestaurantFeatures } from "@/lib/features";

import { setRestaurantFeatures, type AdminFormState } from "../actions";

/**
 * O que este restaurante pode usar. Desmarcar some com a tela no painel
 * dele — e o servidor barra de novo, para o endereço digitado na mão
 * também não passar.
 */
export function FeaturesPanel({ restaurantId, features }: { restaurantId: string; features: RestaurantFeatures }) {
  const [state, action] = useActionState<AdminFormState, FormData>(setRestaurantFeatures, {});

  return (
    <Card>
      <SectionTitle description="Some do painel do restaurante o que estiver desmarcado.">Recursos</SectionTitle>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="restaurantId" value={restaurantId} />

        <div className="flex min-h-12 items-start gap-3 rounded-control border border-line bg-surface-2 px-4 py-3 opacity-70">
          <input type="checkbox" checked disabled className="mt-0.5 size-5 shrink-0 accent-brand" aria-label="Pedido pelo WhatsApp" />
          <span className="flex flex-col">
            <span className="font-bold">Pedido pelo WhatsApp</span>
            <span className="text-sm text-muted">É como todo restaurante recebe pedido hoje.</span>
          </span>
        </div>

        {FEATURES.map((f) => (
          <Checkbox
            key={f.key}
            name="recurso"
            value={f.key}
            defaultChecked={features[f.key]}
            label={
              <>
                {f.label}
                {f.soon && <span className="ml-2 text-xs font-bold text-warning">em construção</span>}
              </>
            }
            hint={f.hint}
          />
        ))}

        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}

        <div>
          <SubmitButton pendingText="Salvando...">Salvar recursos</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
