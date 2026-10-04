"use client";

import { useState, type InputHTMLAttributes } from "react";

import { Input } from "@/components/ui/field";

// O campo do WhatsApp do cliente, com o formato se montando enquanto ele
// digita: 92999990000 vira (92) 99999-0000 na frente dele.
//
// O servidor já exigia o DDD e já respondia "Informe o número com DDD" --
// só que depois de errar, com o pedido todo preenchido. No celular, de pé,
// quem digita o número sem DDD não lê a dica embaixo do campo; o que a
// pessoa lê é o que está acontecendo com o que ela acabou de digitar.
//
// A máscara é só o que se vê. O que vai para o servidor são os mesmos
// dígitos de sempre, normalizados lá -- a tela não decide nada sobre o que
// é um número válido.

/** 11 dígitos no máximo: DDD + 9 do celular */
function mascara(valor: string) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function WhatsappInput({ defaultValue, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [valor, setValor] = useState(() => mascara(String(defaultValue ?? "")));

  return (
    <Input
      {...props}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder="(92) 99999-0000"
      value={valor}
      onChange={(e) => {
        const campo = e.currentTarget;
        // Reformatar com o cursor no meio do texto o empurraria para o fim a
        // cada tecla. Quem está corrigindo um dígito lá atrás fica com o que
        // digitou; o formato se arruma sozinho quando a pessoa volta ao fim.
        const noFim = campo.selectionStart === campo.value.length;
        setValor(noFim ? mascara(campo.value) : campo.value);
      }}
      onBlur={(e) => {
        setValor(mascara(e.currentTarget.value));
        props.onBlur?.(e);
      }}
    />
  );
}
