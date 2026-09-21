import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { controlClasses } from "./field";

/** centavos -> "12,50" para preencher o campo */
export function centsToInput(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

// Campo de dinheiro com "R$" na frente. Aceita "12,50", "12.50" ou "12".
export function MoneyInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <div
      className={cn(
        controlClasses,
        "flex h-12 items-center gap-2 px-0 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30",
        className,
      )}
    >
      <span className="pl-4 font-bold text-faint">R$</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        className="h-full w-full min-w-0 bg-transparent pr-4 text-base text-ink placeholder:text-faint focus:outline-none"
        {...props}
      />
    </div>
  );
}
