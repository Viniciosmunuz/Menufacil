"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/cn";

// – 2 + com botões grandes (dedão no celular). No 1, o "–" vira lixeira
// quando a remoção é permitida.
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  allowRemove = false,
  size = "md",
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  allowRemove?: boolean;
  size?: "sm" | "md";
  label: string;
}) {
  const btn = cn(
    "grid place-items-center rounded-full text-ink hover:bg-surface-3 disabled:opacity-40",
    size === "sm" ? "size-9" : "size-11",
  );
  const removing = allowRemove && value <= 1;
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 p-0.5" role="group" aria-label={label}>
      <button
        type="button"
        className={cn(btn, removing && "text-danger")}
        onClick={() => onChange(value - 1)}
        disabled={!allowRemove && value <= min}
        aria-label={removing ? `Tirar ${label} do carrinho` : `Diminuir ${label}`}
      >
        {removing ? <Trash2 className="size-4" aria-hidden="true" /> : <Minus className="size-4" aria-hidden="true" />}
      </button>
      <span className={cn("text-center font-extrabold tabular-nums", size === "sm" ? "w-6" : "w-8 text-lg")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Aumentar ${label}`}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
