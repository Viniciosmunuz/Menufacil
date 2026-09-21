"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "./button";

// Ação que não dá para desfazer sem querer: o primeiro toque só pede
// confirmação, o segundo envia. Sem janela do navegador, funciona igual no
// celular.
export function ConfirmButton({
  children,
  confirmText,
  name,
  value,
  variant = "danger",
  size = "md",
}: {
  children: ReactNode;
  confirmText: string;
  name?: string;
  value?: string;
  variant?: "primary" | "secondary" | "danger" | "outline";
  size?: "sm" | "md";
}) {
  const [asking, setAsking] = useState(false);
  const { pending } = useFormStatus();

  if (!asking) {
    return (
      <Button variant={variant} size={size} onClick={() => setAsking(true)}>
        {children}
      </Button>
    );
  }

  return (
    <span className="inline-flex flex-wrap gap-2">
      <Button type="submit" name={name} value={value} variant="danger" size={size} disabled={pending} autoFocus>
        {pending ? "Aguarde..." : confirmText}
      </Button>
      <Button variant="ghost" size={size} onClick={() => setAsking(false)} disabled={pending}>
        Cancelar
      </Button>
    </span>
  );
}
