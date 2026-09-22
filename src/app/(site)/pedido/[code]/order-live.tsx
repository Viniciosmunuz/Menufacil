"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { clearCart, useCart } from "@/components/site/cart-store";
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
