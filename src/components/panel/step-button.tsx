"use client";

import { SubmitButton } from "@/components/ui/submit-button";

/**
 * Botão do próximo passo do atendimento. Junto com a mudança de status,
 * abre o WhatsApp do cliente com o aviso já escrito ("pedido aceito", "em
 * preparo", "saiu para entrega"): o restaurante só toca em enviar.
 */
export function StepButton({ label, notifyHref, size }: { label: string; notifyHref?: string | null; size?: "sm" | "md" }) {
  return (
    <SubmitButton
      size={size}
      pendingText="Salvando..."
      // o clique é o que o navegador deixa abrir outra aba; depois dele, não
      onClick={() => notifyHref && window.open(notifyHref, "_blank", "noopener,noreferrer")}
    >
      {label}
    </SubmitButton>
  );
}
