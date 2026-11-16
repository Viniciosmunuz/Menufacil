"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/cn";

// Interruptor liga/desliga que envia o formulário em volta dele. Enquanto
// salva, já mostra a nova posição (resposta imediata no toque).
export function SwitchButton({
  checked,
  label,
  className,
  rotuloOculto = false,
}: {
  checked: boolean;
  label: string;
  className?: string;
  /**
   * O nome fica só para o leitor de tela.
   *
   * Para a linha em que o título já está escrito ao lado do interruptor:
   * repetir a mesma palavra a dois centímetros dela não ajuda ninguém que
   * enxerga, e tirar o texto de dentro do botão deixaria quem usa leitor
   * de tela com um "ligado" sem dono.
   */
  rotuloOculto?: boolean;
}) {
  const { pending } = useFormStatus();
  const on = pending ? !checked : checked;
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={on}
      disabled={pending}
      className={cn("inline-flex h-11 items-center gap-2.5 rounded-control pr-1 text-sm font-bold", on ? "text-ink" : "text-faint", className)}
    >
      <span
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
          on ? "border-success/60 bg-success/80" : "border-line-strong bg-surface-3",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute size-5 rounded-full bg-ink shadow transition-transform",
            on ? "translate-x-[1.45rem]" : "translate-x-0.5",
          )}
        />
      </span>
      {rotuloOculto ? <span className="sr-only">{label}</span> : label}
    </button>
  );
}
