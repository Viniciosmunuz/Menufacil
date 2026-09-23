"use client";

import { SubmitButton } from "@/components/ui/submit-button";

export type StatusNotice = { app: string; web: string };

/** quanto esperar para ver se o WhatsApp instalado assumiu a tela */
const FALLBACK_MS = 2500;

/**
 * Botão do próximo passo do atendimento. Num passo só — quando o pedido
 * sai para entrega — ele também abre o WhatsApp do cliente com o aviso já
 * escrito, e o restaurante toca em enviar. Nos outros, só muda o status:
 * o cliente acompanha pelo link que foi com o pedido dele.
 *
 * Primeiro tenta o WhatsApp instalado (whatsapp://), que é o que evita a
 * página do WhatsApp no navegador. Se nada abrir — o app não está
 * instalado, a janela continua em foco —, aí sim abre o WhatsApp Web.
 */
export function StepButton({ label, notify, size }: { label: string; notify?: StatusNotice | null; size?: "sm" | "md" }) {
  function openWhatsApp() {
    if (!notify) return;
    window.location.href = notify.app;
    setTimeout(() => {
      if (document.visibilityState === "visible" && document.hasFocus()) window.open(notify.web, "_blank", "noopener,noreferrer");
    }, FALLBACK_MS);
  }

  return (
    // o clique é o que o navegador deixa abrir outra janela; depois dele, não
    <SubmitButton size={size} pendingText="Salvando..." onClick={openWhatsApp}>
      {label}
    </SubmitButton>
  );
}
