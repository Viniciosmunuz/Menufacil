"use client";

import { Circle, CircleAlert, CircleCheck } from "lucide-react";
import { useActionState } from "react";

import { SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RestaurantStatus } from "@/generated/prisma/enums";
import { restaurantStatusLabel, restaurantStatusTone } from "@/lib/labels";
import { STATUS_TRANSITIONS, availableTransitions } from "@/lib/restaurant-status";

import { changeRestaurantStatus, type AdminFormState } from "../actions";

const statusExplanation: Record<RestaurantStatus, string> = {
  DRAFT: "Em implantação: só você e o dono veem. Não aparece no site.",
  PENDING_REVIEW: "O dono pediu para publicar. Confira e aprove ou devolva para ajustes.",
  ACTIVE: "No ar: aparece no site e recebe pedidos.",
  INACTIVE: "Fora do site. O dono continua entrando no painel.",
  BLOCKED: "Fora do site e o dono não entra no painel.",
};

export function StatusPanel({
  restaurantId,
  status,
  checklist,
  ready,
}: {
  restaurantId: string;
  status: RestaurantStatus;
  checklist: { key: string; label: string; ok: boolean; required: boolean }[];
  ready: boolean;
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(changeRestaurantStatus, {});
  const transitions = availableTransitions(status);
  const showChecklist = status !== "ACTIVE" && status !== "BLOCKED";

  return (
    <Card>
      <SectionTitle>Status e liberação</SectionTitle>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={restaurantStatusTone[status]} className="h-8 px-4 text-sm">
          {restaurantStatusLabel[status]}
        </Badge>
        <p className="text-sm text-muted">{statusExplanation[status]}</p>
      </div>

      {showChecklist && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-bold">Para publicar</p>
          <ul className="flex flex-col gap-1.5">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-2.5 text-sm">
                {item.ok ? (
                  <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
                ) : item.required ? (
                  <CircleAlert className="size-5 shrink-0 text-warning" aria-hidden="true" />
                ) : (
                  <Circle className="size-5 shrink-0 text-faint" aria-hidden="true" />
                )}
                <span className={item.ok ? "text-ink" : item.required ? "text-warning" : "text-muted"}>
                  {item.label}
                  {!item.required && !item.ok && <span className="text-faint"> (recomendado)</span>}
                </span>
                <span className="sr-only">{item.ok ? "feito" : "pendente"}</span>
              </li>
            ))}
          </ul>
          {!ready && (
            <p className="mt-3 text-sm text-muted">
              Complete os itens em amarelo em <strong>Gerenciar restaurante</strong>.
            </p>
          )}
        </div>
      )}

      <form action={action} className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <div className="flex flex-wrap gap-2">
          {transitions.map((t) => {
            const rule = STATUS_TRANSITIONS[t];
            const label = t === "activate" && status === "PENDING_REVIEW" ? "Aprovar e publicar" : rule.label;
            return rule.confirm ? (
              <ConfirmButton
                key={t}
                name="transition"
                value={t}
                confirmText={rule.confirm}
                variant={rule.tone === "danger" ? "danger" : "secondary"}
              >
                {label}
              </ConfirmButton>
            ) : (
              <SubmitButton
                key={t}
                name="transition"
                value={t}
                variant={rule.tone}
                pendingText="Aguarde..."
                disabled={rule.needsChecklist && !ready}
              >
                {label}
              </SubmitButton>
            );
          })}
        </div>
        <ul className="flex flex-col gap-1 text-xs text-faint">
          {transitions.map((t) => (
            <li key={t}>
              <strong className="text-muted">{STATUS_TRANSITIONS[t].label}:</strong> {STATUS_TRANSITIONS[t].description}
            </li>
          ))}
        </ul>
      </form>
    </Card>
  );
}
