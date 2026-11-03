import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntregadorNav } from "@/components/panel/entregador-nav";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { requireEntregador } from "@/server/auth/dal";
import { entregasLivres, minhasEntregas } from "@/server/entregadores/entregas";

import { CartaoDePedido, ListaVazia, Topo } from "../componentes";

export const metadata: Metadata = { title: "Entregas" };

// As duas listas: o que é meu e o que está livre.
//
// Separadas, e não misturadas com um selo: são duas decisões diferentes --
// uma é "para onde eu vou agora", a outra é "eu pego este?".

export default async function EntregasPage({ params }: PageProps<"/entregador/[restaurantId]/entregas">) {
  const { restaurantId } = await params;
  const { entregador, restaurant } = await requireEntregador();
  if (restaurantId !== restaurant.id) notFound();
  const base = `/entregador/${restaurant.id}`;

  const [levando, livres] = await Promise.all([minhasEntregas(restaurant.id, entregador.id), entregasLivres(restaurant.id)]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <AutoRefresh seconds={30} />
      <Topo titulo="Entregas" />

      <div className="flex flex-col gap-6 pb-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-extrabold tracking-wide text-muted uppercase">Minhas ({levando.length})</h2>
          {levando.length === 0 ? (
            <ListaVazia titulo="Nenhuma com você">Os pedidos que o restaurante mandar para você ficam aqui.</ListaVazia>
          ) : (
            levando.map((p) => <CartaoDePedido key={p.id} pedido={p} base={base} selo={<Badge tone="info">Em rota</Badge>} />)
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-extrabold tracking-wide text-muted uppercase">Disponíveis ({livres.length})</h2>
          {livres.length === 0 ? (
            <ListaVazia titulo="Nada esperando">Quando sair um pedido sem entregador, ele aparece aqui para quem pegar primeiro.</ListaVazia>
          ) : (
            livres.map((p) => <CartaoDePedido key={p.id} pedido={p} base={base} selo={<Badge tone="warning">Livre</Badge>} />)
          )}
        </section>
      </div>

      <EntregadorNav base={base} />
    </main>
  );
}
