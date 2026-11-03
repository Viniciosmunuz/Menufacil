import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntregadorNav } from "@/components/panel/entregador-nav";
import { Badge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { requireEntregador } from "@/server/auth/dal";
import { entregasLivres, fechadasHoje, minhasEntregas } from "@/server/entregadores/entregas";

import { CartaoDePedido, ListaVazia, Topo } from "./componentes";
import { ChaveDeDisponibilidade } from "./disponibilidade";

export const metadata: Metadata = { title: "Minhas entregas" };

// A primeira tela do entregador.
//
// Responde a uma pergunta só: o que eu tenho para fazer agora. Por isso a
// entrega em andamento vem antes de qualquer número -- quem está com um
// pedido na garupa não abriu o aplicativo para ver estatística.

export default async function EntregadorPage({ params }: PageProps<"/entregador/[restaurantId]">) {
  const { restaurantId } = await params;
  const { entregador, restaurant } = await requireEntregador();
  // o endereço aponta para outro restaurante: para ele, esta tela não existe
  if (restaurantId !== restaurant.id) notFound();
  const base = `/entregador/${restaurant.id}`;

  const [levando, livres, hoje] = await Promise.all([
    minhasEntregas(restaurant.id, entregador.id),
    entregasLivres(restaurant.id),
    fechadasHoje(restaurant.id, entregador.id),
  ]);

  const primeiroNome = entregador.nome.split(" ")[0];

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      {/* o pedido novo aparece sem ninguém puxar a tela */}
      <AutoRefresh seconds={30} />

      <Topo
        titulo={`Olá, ${primeiroNome}`}
        acao={<ChaveDeDisponibilidade atual={entregador.disponibilidade} />}
      />
      <p className="-mt-2 pb-4 text-sm text-muted">{restaurant.name}</p>

      <div className="flex flex-col gap-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-muted">Em entrega</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{levando.length}</p>
          </div>
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-muted">Entregues hoje</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-extrabold tabular-nums">
              {hoje}
              <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
            </p>
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-extrabold tracking-wide text-muted uppercase">Com você agora</h2>
          {levando.length === 0 ? (
            <ListaVazia titulo="Nada na garupa">
              Quando o restaurante mandar um pedido para você, ele aparece aqui.
            </ListaVazia>
          ) : (
            levando.map((p) => <CartaoDePedido key={p.id} pedido={p} base={base} selo={<Badge tone="info">Em rota</Badge>} />)
          )}
        </section>

        {livres.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-extrabold tracking-wide text-muted uppercase">Esperando quem leve</h2>
            {livres.map((p) => (
              <CartaoDePedido key={p.id} pedido={p} base={base} selo={<Badge tone="warning">Livre</Badge>} />
            ))}
          </section>
        )}
      </div>

      <EntregadorNav base={base} />
    </main>
  );
}
