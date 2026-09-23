"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { clearCart, useCart } from "@/components/site/cart-store";
import { rememberOrder } from "@/components/site/orders-store";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/components/ui/copy-button";

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
      window.location.assign(phone ? appUrl : webUrl);
    }, 800);
    return () => clearTimeout(timer);
  }, [code, appUrl, webUrl]);
  return null;
}

/**
 * Copia a chave Pix e abre o WhatsApp do restaurante com o pedido escrito:
 * o cliente só toca em enviar (nenhum site envia pelo WhatsApp da pessoa).
 */
export function CopyPixAndSendOrder({ pixKey, whatsappUrl, className }: { pixKey: string; whatsappUrl: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyAndOpen() {
    await copyToClipboard(pixKey);
    setCopied(true);
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
