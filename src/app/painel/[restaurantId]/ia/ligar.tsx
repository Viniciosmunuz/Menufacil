"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { SwitchButton } from "@/components/ui/switch-button";

import { ligarIaDoRestaurante, type EstadoDaAcao } from "./actions";

// A chave principal: a IA responde no WhatsApp do restaurante.
//
// Interruptor como as outras da página. Aqui ele vale dobrado: é a chave
// que o dono procura com pressa, quando ela respondeu algo que não devia
// -- e nessa hora ele precisa ver a posição, não ler um botão.

export function LigarIa({
  restaurantId,
  ligada,
}: {
  restaurantId: string;
  ligada: boolean;
}) {
  const [estado, acao] = useActionState<EstadoDaAcao, FormData>(
    ligarIaDoRestaurante,
    {},
  );

  return (
    <form action={acao} className="flex flex-col items-start gap-3">
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="ligar" value={ligada ? "0" : "1"} />
      <SwitchButton
        checked={ligada}
        label="Responder no WhatsApp"
        className="font-extrabold"
      />
    </form>
  );
}
