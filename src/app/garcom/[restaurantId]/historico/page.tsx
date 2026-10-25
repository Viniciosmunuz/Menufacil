import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { GarcomNav } from "@/components/panel/garcom-nav";
import { ListaDoHistorico, ResumoDoHistorico } from "@/components/panel/historico-salao";
import { startOfToday, todayKey } from "@/lib/format";
import { noAr } from "@/lib/features";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { intervaloDoDia, lerHistorico } from "@/server/salao/historico";

import { SalaoNaoLiberado } from "../aviso";

export const metadata: Metadata = { title: "Meu histórico" };

// O histórico do garçom: só o que ele mesmo fez.
//
// É a pergunta do fim do turno -- "quantas mesas eu atendi, quanto eu
// recebi?" -- e a do meio do movimento -- "eu lancei a coca da mesa 7?".
// O de todo mundo fica no painel do dono; aqui o filtro é o próprio login,
// decidido no servidor, e não um parâmetro que se troca no endereço.

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const inicioDe = (dia: string) => startOfToday(new Date(`${dia}T16:00:00Z`));
const outroDia = (dia: string, passo: number) => todayKey(new Date(new Date(`${dia}T16:00:00Z`).getTime() + passo * 24 * 60 * 60 * 1000));

export default async function HistoricoDoGarcomPage({ params, searchParams }: PageProps<"/garcom/[restaurantId]/historico">) {
  const { restaurantId } = await params;
  const { user, restaurant } = await requireRestaurantAccess(restaurantId);
  if (!noAr("salaoEnabled") || !restaurant.salaoEnabled) return <SalaoNaoLiberado nome={restaurant.name} />;
  const busca = await searchParams;
  const base = `/garcom/${restaurant.id}`;

  const hoje = todayKey();
  const pedido = typeof busca.dia === "string" && DIA.test(busca.dia) ? busca.dia : hoje;
  const dia = pedido > hoje ? hoje : pedido;

  const linhas = await lerHistorico(restaurant.id, { ...intervaloDoDia(inicioDe(dia)), ator: user.id });

  const nomeDoDia =
    dia === hoje
      ? "Hoje"
      : dia === outroDia(hoje, -1)
        ? "Ontem"
        : new Date(`${dia}T16:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  const link = (d: string) => `${base}/historico${d === hoje ? "" : "?dia=" + d}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-4 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Meu histórico</h1>
        <div className="flex items-center gap-1 rounded-control border border-line bg-surface p-1">
          <Link href={link(outroDia(dia, -1))} aria-label="Dia anterior" className="grid size-9 place-items-center rounded-control">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          <span className="min-w-16 text-center text-sm font-semibold capitalize">{nomeDoDia}</span>
          {dia < hoje ? (
            <Link href={link(outroDia(dia, 1))} aria-label="Dia seguinte" className="grid size-9 place-items-center rounded-control">
              <ChevronRight className="size-5" aria-hidden="true" />
            </Link>
          ) : (
            <span className="grid size-9 place-items-center text-faint/50" aria-hidden="true">
              <ChevronRight className="size-5" />
            </span>
          )}
        </div>
      </div>

      <ResumoDoHistorico linhas={linhas} />

      <ListaDoHistorico linhas={linhas} mostrarQuem={false} vazio={dia === hoje ? "Você ainda não fez nada hoje." : "Nada seu neste dia."} />

      <GarcomNav base={base} />
    </main>
  );
}
