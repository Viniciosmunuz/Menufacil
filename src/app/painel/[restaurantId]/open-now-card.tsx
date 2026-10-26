import { Bike, Clock, DoorClosed, DoorOpen, Store } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import type { OpenMode } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";

import { alternarSoRetirada, setOpenMode } from "./restaurante/actions";

const modes: { value: OpenMode; label: string; icone: typeof Clock }[] = [
  { value: "AUTO", label: "Seguir horário", icone: Clock },
  { value: "OPEN", label: "Abrir agora", icone: DoorOpen },
  { value: "CLOSED", label: "Fechar agora", icone: DoorClosed },
];

const botao = "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border px-2.5 text-[0.8rem] leading-tight font-bold 2xl:w-auto 2xl:px-3.5 2xl:text-sm";
const apagado = "border-line bg-surface-2 text-muted hover:text-ink";

// Aberto ou fechado agora, com a troca em um toque (dia de chuva, acabou o
// gás, fechou mais cedo...).
//
// É o interruptor do negócio: enquanto ele estiver errado, nenhum outro
// número desta tela acontece. Por isso fica na largura inteira, logo abaixo
// dos indicadores -- mas numa faixa baixa, e não num cartão alto: ele é
// consultado de relance e tocado de vez em quando, não lido.
//
// Duas linhas até a tela bem larga, e uma só depois dela. Em três linhas a
// faixa virava um cartão e empurrava o gráfico para fora da primeira vista,
// que é justamente o que esta tela não pode fazer.
//
// Tudo aqui é botão de verdade, com a ação do servidor por trás. Nada nesta
// faixa é enfeite.
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
    <Card className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:gap-5">
      <div className="flex min-w-0 items-center gap-3 2xl:flex-1">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full",
            open ? "bg-success/15 text-success" : "bg-surface-3 text-faint",
          )}
        >
          <Store className="size-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="leading-tight font-extrabold">Operação do restaurante</p>
          <p className="truncate text-sm text-muted">
            {openMode === "AUTO" ? today : openMode === "OPEN" ? "Aberto manualmente" : "Fechado manualmente"} ·{" "}
            <Link href={`/painel/${restaurantId}/restaurante#horarios`} className="font-bold text-ink underline-offset-4 hover:underline">
              horários
            </Link>
          </p>
        </div>

        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold",
            open ? "bg-success/15 text-success" : "bg-surface-3 text-muted",
          )}
        >
          <span className={cn("size-1.5 rounded-full", open ? "bg-success" : "bg-faint")} aria-hidden="true" />
          {open ? "Aberto" : "Fechado"}
        </span>
      </div>

      {/* os quatro na mesma grade: soltos, as larguras diferentes quebravam
          em linhas tortas, e são quatro faces da mesma decisão de agora */}
      <div
        className={cn("grid gap-2 2xl:flex 2xl:shrink-0", entregaAtiva ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}
        role="group"
        aria-label="Operação"
      >
        {modes.map(({ value, label, icone: Icone }) => (
          <form key={value} action={setOpenMode}>
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <input type="hidden" name="openMode" value={value} />
            <button
              type="submit"
              aria-pressed={openMode === value}
              className={cn(botao, openMode === value ? "border-brand bg-brand-soft text-brand" : apagado)}
            >
              <Icone className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          </form>
        ))}

        {/* Pausar a entrega fica aqui, e não nas configurações, porque é
            decisão de agora: o entregador sumiu, a cozinha não dá conta.

            Só aparece para quem faz entrega -- em restaurante de balcão o
            botão não teria o que pausar. */}
        {entregaAtiva && (
          <form action={alternarSoRetirada}>
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <button
              type="submit"
              title={
                pausada
                  ? `O cliente só consegue pedir para retirar. Volta sozinho às ${formatTime(soRetiradaAte)}.`
                  : "Pause a entrega quando faltar entregador ou a cozinha encher."
              }
              className={cn(botao, pausada ? "border-warning bg-warning/12 text-warning" : apagado)}
            >
              <Bike className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{pausada ? `Só retirada até ${formatTime(soRetiradaAte)}` : "Pausar a entrega"}</span>
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}
