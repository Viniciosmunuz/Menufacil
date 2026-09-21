import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

// Caixa de marcar com área de toque grande (a linha inteira é clicável).
export function Checkbox({
  label,
  hint,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label
      className={cn(
        "flex min-h-12 cursor-pointer items-start gap-3 rounded-control border border-line bg-surface-2 px-4 py-3",
        "hover:border-line-strong has-[:checked]:border-brand/60 has-[:checked]:bg-brand-soft",
        className,
      )}
    >
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-brand" {...props} />
      <span className="flex flex-col">
        <span className="font-bold">{label}</span>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </span>
    </label>
  );
}
