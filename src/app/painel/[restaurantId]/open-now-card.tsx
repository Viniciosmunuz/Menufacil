import { Bike, Clock, DoorClosed, DoorOpen } from "lucide-react";
import Link from "next/link";

import type { OpenMode } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";

import { alternarSoRetirada, setOpenMode } from "./restaurante/actions";

const modes: { value: OpenMode; label: string; icone: typeof Clock }[] = [
  { value: "AUTO", label: "Seguir horário", icone: Clock },
  { value: "OPEN", label: "Abrir agora", icone: DoorOpen },
  { value: "CLOSED", label: "Fechar agora", icone: DoorClosed },
];

const botao =
  "flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-[0.8rem] leading-tight font-bold sm:w-auto sm:text-sm";
const apagado = "border-line bg-surface text-muted hover:text-ink";

// Abrir, fechar e pausar a entrega: a barra do alto do painel.
//
// Era um cartão com título, subtítulo e ícone, ocupando uma faixa inteira
// da tela. Mas isto não é informação para ler -- é interruptor. Quem abre o
// painel às 19h e vê "Fechado" quer tocar, não ler sobre.
//
// Então virou barra, no lugar onde antes ficavam a saudação e a data, que
// eram as duas coisas desta tela que ninguém precisava.
//
// O estado vem escrito dentro da cor, e não só ao lado dela: verde aberto,
// vermelho fechado, âmbar entrega pausada. São os três estados em que o
// restaurante pode estar, e o terceiro convive com os outros dois -- dá
// para estar aberto e sem entregador. Por isso são dois selos, e não um
// com três cores.
//
// Tudo aqui continua sendo botão de verdade, com a ação do servidor atrás.
export function OperacaoBarra({
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
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      <span
        className={cn(
          "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-extrabold text-white",
          open ? "bg-success" : "bg-danger",
        )}
        title={openMode === "AUTO" ? today : openMode === "OPEN" ? "Aberto manualmente" : "Fechado manualmente"}
      >
        <span className="size-1.5 rounded-full bg-white/80" aria-hidden="true" />
        {open ? "Aberto" : "Fechado"}
      </span>

      {pausada && (
        <span
          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-warning px-3.5 text-sm font-extrabold text-white"
          title={`O cliente só consegue pedir para retirar. Volta sozinho às ${formatTime(soRetiradaAte)}.`}
        >
          <Bike className="size-4" aria-hidden="true" />
          Entrega pausada
        </span>
      )}

      {/* No celular os botões descem para a linha inteira, em duas colunas.
          Dividindo a linha com os selos, "Seguir horário" e "Voltar a
          entregar" não cabiam e eram cortados no meio -- e botão cortado
          não se lê. */}
      <div
        className={cn("grid w-full gap-2 sm:flex sm:w-auto sm:flex-none", entregaAtiva ? "grid-cols-2" : "grid-cols-3")}
        role="group"
        aria-label="Operação do restaurante"
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
                  ? `Volta a entregar agora, sem esperar as ${formatTime(soRetiradaAte)}.`
                  : "Pause a entrega quando faltar entregador ou a cozinha encher."
              }
              className={cn(botao, pausada ? "border-warning bg-warning/12 text-warning" : apagado)}
            >
              <Bike className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{pausada ? "Voltar a entregar" : "Pausar a entrega"}</span>
            </button>
          </form>
        )}
      </div>

      <Link
        href={`/painel/${restaurantId}/restaurante#horarios`}
        className="shrink-0 px-1 text-sm font-bold text-muted underline-offset-4 hover:text-ink hover:underline"
      >
        horários
      </Link>
    </div>
  );
}
