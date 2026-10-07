import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MesaDoGarcom } from "@/components/panel/mesa-garcom";
import { buttonClasses } from "@/components/ui/button";
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

  if (!comanda) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-xl font-extrabold">
          {rotulo} {mesa.numero} está livre
        </p>
        <p className="text-muted">{mesa.lugares} lugares.</p>
        <span className={buttonClasses("primary")}>Abrir {rotulo.toLowerCase()}</span>
        <Link href={base} className="text-sm font-bold text-muted hover:text-ink">
          Voltar às mesas
        </Link>
      </main>
    );
  }

  return <MesaDoGarcom comanda={comanda} categorias={categorias} mesaRotulo={rotulo + " " + mesa.numero} voltarHref={base} />;
}
