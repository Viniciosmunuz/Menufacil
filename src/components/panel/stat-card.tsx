import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function StatCard({ label, value, icon, hint }: { label: string; value: ReactNode; icon: ReactNode; hint?: string }) {
  return (
    <Card className="flex items-start gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-control bg-brand-soft text-brand [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold tabular-nums">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
      </div>
    </Card>
  );
}
