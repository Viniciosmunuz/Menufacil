import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MesaDoGarcom } from "@/components/panel/mesa-garcom";
import { db } from "@/lib/db";
import { requireSalao } from "@/server/auth/dal";
import { cardapioDoSalao, verMesa } from "@/server/salao/comanda";
import { mesasParaDestino } from "@/server/salao/mexer";

export const metadata: Metadata = { title: "Mesa" };

// A mesa na mão do garçom.
//
// A mesma comanda e o mesmo cardápio do painel do dono, num componente só:
// um código, dois tamanhos de tela. O que muda é o que ele pode fazer:
// lançar e receber todo garçom faz, porque é disso que o trabalho dele é
// feito; liberar a mesa, dar desconto e apagar item o dono libera um a um,
// para quem ele confia.

export default async function MesaDoGarcomPage({ params }: PageProps<"/garcom/[restaurantId]/mesa/[mesaId]">) {
  const { restaurantId, mesaId } = await params;
  const { restaurant, pode } = await requireSalao(restaurantId);

  const [achado, categorias, mesas, impressoras] = await Promise.all([
    verMesa(restaurant.id, mesaId),
    cardapioDoSalao(restaurant.id),
    mesasParaDestino(restaurant.id, mesaId),
    // com o Menu Fácil PC ligado, a conta vai para a impressora do balcão
    db.printDevice.count({ where: { restaurantId: restaurant.id, role: "COMANDA", pairedAt: { not: null } } }),
  ]);
  if (!achado) notFound();

  const { mesa, comanda } = achado;
  const rotulo = mesa.nome ?? (mesa.tipo === "BALCAO" ? "Balcão" : "Mesa") + " " + mesa.numero;
  const base = `/garcom/${restaurant.id}`;

  return (
    <MesaDoGarcom
      comanda={comanda}
      categorias={categorias}
      mesaRotulo={rotulo}
      voltarHref={base}
      restaurantId={restaurant.id}
      mesaId={mesa.id}
      podeFinanceiro={pode.finalizarMesa}
      podeApagarItem={pode.excluirItem}
      podeMexer={pode.mexerNaMesa}
      mesas={mesas}
      temImpressora={impressoras > 0}
    />
  );
}
