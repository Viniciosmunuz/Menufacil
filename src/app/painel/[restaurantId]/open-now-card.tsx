import { Clock } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import type { OpenMode } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";

import { setOpenMode } from "./restaurante/actions";

const modes: { value: OpenMode; label: string }[] = [
  { value: "AUTO", label: "Seguir horário" },
  { value: "OPEN", label: "Abrir agora" },
  { value: "CLOSED", label: "Fechar agora" },
];

// Aberto ou fechado agora, com a troca em um toque (dia de chuva, acabou o
// gás, fechou mais cedo...).
export function OpenNowCard({
  restaurantId,
  open,
  openMode,
  today,
}: {
  restaurantId: string;
  open: boolean;
  openMode: OpenMode;
  today: string;
}) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", open ? "bg-success/15 text-success" : "bg-surface-3 text-faint")}>
          <Clock className="size-6" aria-hidden="true" />
        </span>
        <div>
          <p className={cn("text-xl font-extrabold", open ? "text-success" : "text-muted")}>{open ? "Aberto agora" : "Fechado agora"}</p>
          <p className="text-sm text-muted">
            {openMode === "AUTO" ? today : openMode === "OPEN" ? "Aberto manualmente" : "Fechado manualmente"} ·{" "}
            <Link href={`/painel/${restaurantId}/restaurante#horarios`} className="font-bold text-ink underline-offset-4 hover:underline">
              horários
            </Link>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Abrir ou fechar">
        {modes.map((m) => (
          <form key={m.value} action={setOpenMode}>
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <input type="hidden" name="openMode" value={m.value} />
            <button
              type="submit"
              aria-pressed={openMode === m.value}
              className={cn(
                "h-10 rounded-full border px-4 text-sm font-bold",
                openMode === m.value ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-muted hover:text-ink",
              )}
            >
              {m.label}
            </button>
          </form>
        ))}
      </div>
    </Card>
  );
}
