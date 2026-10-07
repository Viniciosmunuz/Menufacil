import { Lock } from "lucide-react";
import type { Metadata } from "next";

import { SalaoComBusca } from "@/components/panel/busca-mesa";
import { GarcomNav } from "@/components/panel/garcom-nav";
import { requireSalao } from "@/server/auth/dal";
import { mapaDoSalao } from "@/server/salao/mesas";
import { turnoAberto } from "@/server/salao/turno";

export const metadata: Metadata = { title: "Salão" };

// O salão na mão do garçom.
//
// Tela própria, e não o painel do dono espremido: quem usa isto está de pé,
// com uma mão só, no meio do movimento. Mesas e balcão, e nada mais --
// caixa e configuração não aparecem, e não por estarem escondidas: o painel
// do dono exige papel de dono no servidor, então o garçom não chega lá nem
// digitando o endereço.
//
// Entra pelo mesmo login do restaurante. A sessão se renova a cada visita,
// então o atalho salvo na tela inicial do celular abre direto nas mesas.

export default async function GarcomPage({ params }: PageProps<"/garcom/[restaurantId]">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireSalao(restaurantId);
  const [salao, turno] = await Promise.all([mapaDoSalao(restaurant.id), turnoAberto(restaurant.id)]);
  const base = `/garcom/${restaurant.id}`;

  // Sem caixa aberto, o salão não opera.
  //
  // Lançar pedido num turno que ninguém abriu produz uma noite de vendas
  // sem dono, que no fim não bate com a gaveta. Fechado, o garçom vê que
  // está fechado -- e sabe que a conversa é com o balcão, não com o
  // aplicativo dele.
  if (!turno) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-faint">
          <Lock className="size-7" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-extrabold">Salão fechado</h1>
        <p className="text-muted">O caixa ainda não foi aberto. Fale com o balcão: assim que abrirem, suas mesas aparecem aqui.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col gap-4 px-4 pt-4">
      <SalaoComBusca mesas={salao.mesas} balcoes={salao.balcoes} base={base} cols="grid grid-cols-2 gap-2.5" />
      <GarcomNav base={base} />
    </main>
  );
}
