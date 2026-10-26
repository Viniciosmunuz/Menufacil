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

const botao =
  "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-sm leading-tight font-bold xl:w-auto xl:px-4";
const apagado = "border-line bg-surface-2 text-muted hover:text-ink";

type Estado = {
  restaurantId: string;
  open: boolean;
  openMode: OpenMode;
  today: string;
  /** o restaurante faz entrega? sem isso, pausar entrega não quer dizer nada */
  entregaAtiva: boolean;
  /** até quando a entrega está pausada; null quando está normal */
  soRetiradaAte: Date | null;
};

/**
 * O selo do canto de cima: em que pé o restaurante está agora.
 *
 * Verde escrito "Aberto", vermelho escrito "Fechado", âmbar escrito
 * "Entrega pausada". A cor sozinha não serve -- daltônico não a separa, e
 * de relance ninguém lembra qual é qual --, então a palavra vai dentro
 * dela.
 *
 * São dois selos e não um com três cores porque o terceiro estado convive
 * com os outros dois: dá para estar aberto e sem entregador.
 *
 * Ele só mostra. Quem muda é o cartão de operação, logo abaixo dos
 * números -- apertou lá, o selo daqui vira de cor.
 */
export function SeloDaOperacao({ open, openMode, today, entregaAtiva, soRetiradaAte }: Omit<Estado, "restaurantId">) {
  const pausada = entregaAtiva && soRetiradaAte !== null;

  return (
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      <span
        className={cn(
          "flex min-h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-extrabold text-white",
          open ? "bg-success" : "bg-danger",
        )}
        title={openMode === "AUTO" ? today : openMode === "OPEN" ? "Aberto manualmente" : "Fechado manualmente"}
      >
        <span className="size-1.5 rounded-full bg-white/80" aria-hidden="true" />
        {open ? "Aberto" : "Fechado"}
      </span>

      {pausada && (
        <span
          className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-warning px-3.5 text-sm font-extrabold text-white"
          title={`O cliente só consegue pedir para retirar. Volta sozinho às ${formatTime(soRetiradaAte)}.`}
        >
          <Bike className="size-4" aria-hidden="true" />
          Entrega pausada
        </span>
      )}
    </div>
  );
}

// Aberto ou fechado agora, com a troca em um toque (dia de chuva, acabou o
// gás, fechou mais cedo...).
//
// É o interruptor do negócio: enquanto ele estiver errado, nenhum outro
// número desta tela acontece. Fica na largura inteira, logo abaixo dos
// indicadores -- e numa faixa baixa, não num cartão alto: ele é consultado
// de relance e tocado de vez em quando, não lido.
//
// O estado não aparece aqui: ele mora no selo do canto de cima, que muda
// de cor assim que um destes botões é apertado. Repetir "Aberto" nos dois
// lugares só tirava espaço dos botões.
//
// Tudo aqui é botão de verdade, com a ação do servidor por trás.
export function OperacaoCard({ restaurantId, open, openMode, today, entregaAtiva, soRetiradaAte }: Estado) {
  const pausada = soRetiradaAte !== null;

  return (
    <Card className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-5">
      <div className="flex min-w-0 items-center gap-3 xl:flex-1">
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
      </div>

      {/* os quatro na mesma grade: soltos, as larguras diferentes quebravam
          em linhas tortas, e são quatro faces da mesma decisão de agora */}
      <div
        className={cn("grid gap-2 xl:flex xl:shrink-0", entregaAtiva ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}
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
    </Card>
  );
}
