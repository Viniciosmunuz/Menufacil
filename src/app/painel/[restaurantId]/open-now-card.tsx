import { Bike, Clock, Store } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import type { OpenMode } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";

import { alternarSoRetirada, setOpenMode } from "./restaurante/actions";

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
  entregaAtiva,
  soRetiradaAte,
}: {
  restaurantId: string;
  open: boolean;
  openMode: OpenMode;
  today: string;
  /** o restaurante faz entrega? sem isso, pausar entrega não quer dizer nada */
  entregaAtiva: boolean;
  /** até quando a entrega está pausada; null quando está normal */
  soRetiradaAte: Date | null;
}) {
  const pausada = soRetiradaAte !== null;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
      </div>

      {/* Pausar a entrega fica aqui, e não nas configurações, porque é
          decisão de agora: o entregador sumiu, a cozinha não dá conta. É a
          mesma natureza do abrir/fechar, e é com uma mão só, no meio do
          movimento, que alguém vai apertar.

          Só aparece para quem faz entrega -- em restaurante de balcão o
          botão não teria o que pausar. */}
      {entregaAtiva && (
        <form action={alternarSoRetirada} className="border-t border-line pt-4">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-control",
                  pausada ? "bg-warning/15 text-warning" : "bg-surface-3 text-faint",
                )}
              >
                {pausada ? <Store className="size-5" aria-hidden="true" /> : <Bike className="size-5" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className={cn("block font-bold", pausada && "text-warning")}>
                  {pausada ? "Só retirada no momento" : "Entregando normalmente"}
                </span>
                <span className="block text-sm text-muted">
                  {pausada
                    ? `O cliente só consegue pedir para retirar. Volta sozinho às ${formatTime(soRetiradaAte)}.`
                    : "Pause a entrega quando faltar entregador ou a cozinha encher."}
                </span>
              </span>
            </span>
            <button
              type="submit"
              className={cn(
                "h-10 shrink-0 rounded-full border px-4 text-sm font-bold",
                pausada ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-muted hover:text-ink",
              )}
            >
              {pausada ? "Voltar a entregar" : "Pausar a entrega"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
