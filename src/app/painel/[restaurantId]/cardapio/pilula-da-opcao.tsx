"use client";

import { X } from "lucide-react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/cn";

// Um sabor, ligado ou desligado com um toque.
//
// Pílula e não interruptor: numa lista de oito sabores lado a lado, oito
// interruptores com rótulo não cabem na largura de um celular. Aqui o
// próprio nome do sabor é o botão.
//
// O destaque é do que acabou, não do que tem. Pintar de verde os oito
// sabores que existem faz um mar de verde onde o que falta -- a única
// informação que alguém veio procurar -- fica apagado no meio. O normal
// fica neutro e o que acabou salta, riscado e em vermelho.
//
// Enquanto salva já mostra a posição nova, como o interruptor do prato: no
// balcão, um toque que não responde na hora vira dois toques.

export function PilulaDaOpcao({ nome, tem }: { nome: string; tem: boolean }) {
  const { pending } = useFormStatus();
  const on = pending ? !tem : tem;

  return (
    <button
      type="submit"
      aria-pressed={on}
      disabled={pending}
      aria-label={`${nome}: ${on ? "tem" : "acabou"}`}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-bold transition-colors",
        on ? "border-line-strong bg-surface-2 text-ink hover:border-danger/40" : "border-danger/50 bg-danger/15 text-danger line-through",
      )}
    >
      {!on && <X className="size-3.5 shrink-0" aria-hidden="true" />}
      {nome}
    </button>
  );
}
