"use client";

import { Check, Copy, MessageCircle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { clearCart, useCart } from "@/components/site/cart-store";
import { markOrderSent, rememberOrder, useOrderSent } from "@/components/site/orders-store";
import { Button } from "@/components/ui/button";
import { CopyButton, copyToClipboard } from "@/components/ui/copy-button";
import { cn } from "@/lib/cn";

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
      markOrderSent(code);
      window.location.assign(phone ? appUrl : webUrl);
    }, 800);
    return () => clearTimeout(timer);
  }, [code, appUrl, webUrl]);
  return null;
}

/**
 * Aviso curto do envio pelo WhatsApp. O WhatsApp abre sozinho depois do
 * pedido, então aqui não tem botão grande: só a linha do que falta fazer e,
 * depois que a pessoa abriu a conversa por aqui, o aviso de enviado (para
 * ela não mandar o mesmo pedido duas vezes). O link reabre a conversa.
 */
export function SendOrderCta({ code, url, pixNote = false }: { code: string; url: string; pixNote?: boolean }) {
  const sent = useOrderSent(code);

  return (
    <div className="flex flex-col items-center gap-1">
      <p className={cn("flex items-center justify-center gap-2 text-sm font-extrabold", sent ? "text-success" : "text-warning")}>
        {sent ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />}
        {sent ? "Pedido enviado no WhatsApp" : "Toque em enviar lá no WhatsApp"}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => markOrderSent(code)}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-muted underline-offset-4 hover:text-ink hover:underline"
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        {sent ? "Abrir a conversa de novo" : "Abrir o WhatsApp com o pedido"}
      </a>
      {pixNote && <p className="mt-1 text-sm text-muted">Pague o Pix com a chave aqui embaixo e mande o comprovante na mesma conversa.</p>}
    </div>
  );
}

/** no Pix, depois de enviado o botão vira só "copiar a chave" */
export function PixActions({ code, pixKey, whatsappUrl, className }: { code: string; pixKey: string; whatsappUrl: string; className?: string }) {
  const sent = useOrderSent(code);
  if (sent) return <CopyButton text={pixKey} label="Copiar chave Pix" copiedLabel="Chave copiada!" variant="primary" size="lg" className={className} />;
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
    markOrderSent(code);
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
