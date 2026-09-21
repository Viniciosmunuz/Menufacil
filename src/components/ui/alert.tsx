import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const tones = {
  info: "border-info/30 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" className={cn("rounded-control border px-4 py-3 text-sm", tones[tone], className)}>
      {children}
    </div>
  );
}
