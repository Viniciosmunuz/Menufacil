"use client";

import { Check, Copy, MessageCircle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { clearCart, useCart } from "@/components/site/cart-store";
import { markOrderOpened, markOrderSent, rememberOrder, useOrderOpened, useOrderSent } from "@/components/site/orders-store";
import { Button, buttonClasses } from "@/components/ui/button";
import { CopyButton, copyToClipboard } from "@/components/ui/copy-button";

/** esvazia o carrinho depois que o pedido deste restaurante foi feito */
export function ClearCartAfterOrder({ restaurantId }: { restaurantId: string }) {
  const cart = useCart();
  useEffect(() => {
    if (cart.restaurant?.id === restaurantId) clearCart();
  }, [cart.restaurant?.id, restaurantId]);
  return null;
}

/** guarda o pedido neste aparelho, para ele aparecer em "Meus pedidos" */
export function RememberOrder({
  code,
  number,
  restaurantName,
  restaurantSlug,
  createdAt,
}: {
  code: string;
  number: number;
  restaurantName: string;
  restaurantSlug: string;
  createdAt: string;
}) {
  useEffect(() => {
    rememberOrder({ code, number, restaurantName, restaurantSlug, createdAt });
  }, [code, number, restaurantName, restaurantSlug, createdAt]);
  return null;
}

/**
 * Logo depois do pedido, abre sozinho o WhatsApp do restaurante com o pedido
 * escrito. Uma vez só por pedido: voltar ou recarregar a página não reabre.
 */
export function OpenWhatsAppOnce({ code, appUrl, webUrl }: { code: string; appUrl: string; webUrl: string }) {
  useEffect(() => {
    const key = `mf_whats_${code}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // sem armazenamento: abre mesmo assim
    }
    // no celular, whatsapp:// vai direto para o app, sem passar pela página do
    // WhatsApp no navegador; no computador, o wa.me abre o WhatsApp Web
    const phone = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    // um instante para a pessoa ver que o pedido foi feito
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        // idem
      }
      markOrderOpened(code);
      window.location.assign(phone ? appUrl : webUrl);
    }, 800);
    return () => clearTimeout(timer);
  }, [code, appUrl, webUrl]);
  return null;
}

/**
 * O que falta para o pedido chegar ao restaurante. O site não enxerga a
 * conversa do WhatsApp, então o verde só aparece quando o restaurante
 * aceita o pedido no painel dele. Antes disso: o aviso de enviar e, se a
 * pessoa já voltou do WhatsApp, a pergunta se ela enviou mesmo.
 */
export function SendOrderCta({
  code,
  url,
  chatUrl,
  accepted,
  pixNote = false,
}: {
  code: string;
  /** conversa com o pedido escrito, para quem ainda não enviou */
  url: string;
  /** conversa vazia: quem já enviou não corre o risco de mandar de novo */
  chatUrl: string;
  accepted: boolean;
  pixNote?: boolean;
}) {
  const opened = useOrderOpened(code);
  const sent = useOrderSent(code);

  const openLink = (label: string, href: string, withOrder = false) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={withOrder ? () => markOrderOpened(code) : undefined}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-muted underline-offset-4 hover:text-ink hover:underline"
    >
      <MessageCircle className="size-4" aria-hidden="true" />
      {label}
    </a>
  );

  const note = pixNote && <p className="mt-1 text-sm text-muted">Pague o Pix com a chave aqui embaixo e mande o comprovante na mesma conversa.</p>;

  // o restaurante mexeu no pedido: aí sim ele chegou lá
  if (accepted) {
    return (
      <div className="flex flex-col items-center gap-1">
        <p className="flex items-center justify-center gap-2 text-sm font-extrabold text-success">
          <Check className="size-4 shrink-0" aria-hidden="true" />
          Pedido recebido pelo restaurante
        </p>
        {openLink("Abrir a conversa no WhatsApp", chatUrl)}
        {note}
      </div>
    );
  }

  // a pessoa disse que enviou: falta o restaurante ver
  if (sent) {
    return (
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-bold text-muted">Você enviou o pedido. Aguardando o restaurante confirmar.</p>
        {openLink("Abrir a conversa no WhatsApp", chatUrl)}
        {note}
      </div>
    );
  }

  // voltou do WhatsApp: só ela sabe se tocou em enviar
  if (opened) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-extrabold">Você tocou em enviar lá no WhatsApp?</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => markOrderSent(code)}>
            Sim, enviei
          </Button>
          <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "sm")}>
            <MessageCircle className="size-4" aria-hidden="true" />
            Ainda não, abrir o WhatsApp
          </a>
        </div>
        {note}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="flex items-center justify-center gap-2 text-sm font-extrabold text-warning">
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        Toque em enviar lá no WhatsApp
      </p>
      {openLink("Abrir o WhatsApp com o pedido", url, true)}
      {note}
    </div>
  );
}

/** no Pix, depois que o WhatsApp já foi aberto o botão vira só "copiar a chave" */
export function PixActions({ code, pixKey, whatsappUrl, className }: { code: string; pixKey: string; whatsappUrl: string; className?: string }) {
  const opened = useOrderOpened(code);
  if (opened) return <CopyButton text={pixKey} label="Copiar chave Pix" copiedLabel="Chave copiada!" variant="primary" size="lg" className={className} />;
  return <CopyPixAndSendOrder code={code} pixKey={pixKey} whatsappUrl={whatsappUrl} className={className} />;
}

/**
 * Copia a chave Pix e abre o WhatsApp do restaurante com o pedido escrito:
 * o cliente só toca em enviar (nenhum site envia pelo WhatsApp da pessoa).
 */
export function CopyPixAndSendOrder({
  code,
  pixKey,
  whatsappUrl,
  className,
}: {
  code: string;
  pixKey: string;
  whatsappUrl: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyAndOpen() {
    await copyToClipboard(pixKey);
    setCopied(true);
    markOrderOpened(code);
    // um instante para a pessoa ver que copiou antes de trocar de app
    setTimeout(() => window.location.assign(whatsappUrl), 700);
  }

  return (
    <Button variant="primary" size="lg" onClick={copyAndOpen} className={className} aria-live="polite">
      {copied ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
      {copied ? "Chave copiada! Abrindo o WhatsApp..." : "Copiar chave e enviar pedido"}
    </Button>
  );
}
