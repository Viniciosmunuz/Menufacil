import type { ReactNode } from "react";

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong px-6 py-12 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-surface-2 text-faint [&_svg]:size-6">
        {icon}
      </span>
      <p className="font-extrabold">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}
