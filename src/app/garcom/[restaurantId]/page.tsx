import type { Metadata } from "next";

import { SalaoComBusca } from "@/components/panel/busca-mesa";
import { GarcomNav } from "@/components/panel/garcom-nav";
import { requireSalao } from "@/server/auth/dal";
import { mapaDoSalao } from "@/server/salao/mesas";

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
  const salao = await mapaDoSalao(restaurant.id);
  const base = `/garcom/${restaurant.id}`;

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col gap-4 px-4 pt-4">
      <SalaoComBusca mesas={salao.mesas} balcoes={salao.balcoes} base={base} cols="grid grid-cols-2 gap-2.5" />
      <GarcomNav base={base} />
    </main>
  );
}
