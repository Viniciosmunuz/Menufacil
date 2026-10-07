import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MesaDoGarcom } from "@/components/panel/mesa-garcom";
import { requireSalao } from "@/server/auth/dal";
import { cardapioDoSalao, verMesa } from "@/server/salao/comanda";

export const metadata: Metadata = { title: "Mesa" };

// A mesa na mão do garçom.
//
// A mesma comanda e o mesmo cardápio do painel do dono, num componente só:
// um código, dois tamanhos de tela. O que muda é o que ele pode fazer --
// desconto e cancelamento ficam fora até as permissões existirem.

export default async function MesaDoGarcomPage({ params }: PageProps<"/garcom/[restaurantId]/mesa/[mesaId]">) {
  const { restaurantId, mesaId } = await params;
  const { restaurant } = await requireSalao(restaurantId);

  const [achado, categorias] = await Promise.all([verMesa(restaurant.id, mesaId), cardapioDoSalao(restaurant.id)]);
  if (!achado) notFound();

  const { mesa, comanda } = achado;
  const rotulo = mesa.tipo === "BALCAO" ? "Balcão" : "Mesa";
  const base = `/garcom/${restaurant.id}`;

  return (
    <MesaDoGarcom
      comanda={comanda}
      categorias={categorias}
      mesaRotulo={rotulo + " " + mesa.numero}
      voltarHref={base}
      restaurantId={restaurant.id}
      mesaId={mesa.id}
    />
  );
}
