"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

export type StatusNotice = { app: string; web: string };

/** quanto esperar para ver se o WhatsApp instalado assumiu a tela */
const FALLBACK_MS = 2500;

/**
 * Botão do próximo passo do atendimento. Em um passo só — quando o pedido
 * sai para entrega, ou fica pronto no balcão, na retirada — ele também abre
 * o WhatsApp do cliente com o aviso já escrito, e o restaurante toca em
 * enviar. Nos outros, só muda o status: o cliente acompanha pelo link que
 * foi com o pedido dele.
 *
 * Primeiro tenta o WhatsApp instalado (whatsapp://), que é o que evita a
 * página do WhatsApp no navegador. Se nada abrir — o app não está
 * instalado, a janela continua em foco —, aí sim abre o WhatsApp Web.
 */
export function StepButton({
  label,
  notify,
  size,
  confirmar,
}: {
  label: string;
  notify?: StatusNotice | null;
  size?: "sm" | "md";
  /**
   * O texto do segundo toque, quando este passo precisa de confirmação.
   *
   * Existe por causa da loja fechada: o aviso do passo sai no mesmo
   * instante para o cliente, e com a cozinha já encerrada o dono pode
   * estar acertando o status de um pedido de horas antes -- um "saiu para
   * entrega" naquela hora assusta quem já recebeu. Então o passo que fala
   * com o cliente passa a pedir confirmação enquanto a loja está fechada.
   *
   * Dois toques no próprio botão, como o "Cancelar pedido" ao lado: sem
   * janela do navegador, que no celular do balcão aparece atrás de tudo.
   */
  confirmar?: string | null;
}) {
  const [perguntando, setPerguntando] = useState(false);

  function openWhatsApp() {
    if (!notify) return;
    window.location.href = notify.app;
    setTimeout(() => {
      if (document.visibilityState === "visible" && document.hasFocus()) window.open(notify.web, "_blank", "noopener,noreferrer");
    }, FALLBACK_MS);
  }

  // o primeiro toque não envia nada: só abre a pergunta
  if (confirmar && !perguntando) {
    return (
      <Button size={size} onClick={() => setPerguntando(true)}>
        {label}
      </Button>
    );
  }

  if (confirmar) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        {/* o clique é o que o navegador deixa abrir outra janela; depois dele, não */}
        <SubmitButton size={size} pendingText="Salvando..." onClick={openWhatsApp} autoFocus>
          {confirmar}
        </SubmitButton>
        <Button variant="ghost" size={size} onClick={() => setPerguntando(false)}>
          Voltar
        </Button>
      </span>
    );
  }

  return (
    // o clique é o que o navegador deixa abrir outra janela; depois dele, não
    <SubmitButton size={size} pendingText="Salvando..." onClick={openWhatsApp}>
      {label}
    </SubmitButton>
  );
}
