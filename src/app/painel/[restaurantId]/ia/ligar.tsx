"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";

import { ligarIaDoRestaurante, type EstadoDaAcao } from "./actions";

export function LigarIa({ restaurantId, ligada }: { restaurantId: string; ligada: boolean }) {
  const [estado, acao] = useActionState<EstadoDaAcao, FormData>(ligarIaDoRestaurante, {});

  return (
    <form action={acao} className="flex flex-col items-start gap-3">
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="ligar" value={ligada ? "0" : "1"} />
      <SubmitButton variant={ligada ? "secondary" : "primary"}>{ligada ? "Desligar a IA" : "Ligar a IA"}</SubmitButton>
    </form>
  );
}
