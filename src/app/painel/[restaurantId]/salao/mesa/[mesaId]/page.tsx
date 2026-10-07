import { ArrowLeft, Clock, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ComandaDaMesa } from "@/components/panel/comanda-mesa";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { requireSalao } from "@/server/auth/dal";
import { cardapioDoSalao, verMesa } from "@/server/salao/comanda";

export const metadata: Metadata = { title: "Mesa" };

export default async function MesaPage({ params }: PageProps<"/painel/[restaurantId]/salao/mesa/[mesaId]">) {
  const { restaurantId, mesaId } = await params;
  const { restaurant } = await requireSalao(restaurantId);

  const [achado, categorias] = await Promise.all([verMesa(restaurant.id, mesaId), cardapioDoSalao(restaurant.id)]);
  if (!achado) notFound();

  const { mesa, comanda } = achado;
  const rotulo = mesa.tipo === "BALCAO" ? "Balcão" : "Mesa";
  const base = `/painel/${restaurant.id}/salao`;

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col gap-4">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={base} className="grid size-10 shrink-0 place-items-center rounded-control border border-line text-muted hover:text-ink" aria-label="Voltar ao salão">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-extrabold">
          {rotulo} {mesa.numero}
        </h1>
        {comanda && (
          <>
            <Badge tone={comanda.status === "PAGO" ? "success" : "brand"}>{comanda.status === "PAGO" ? "Pago" : "Ocupada"}</Badge>
            <span className="flex items-center gap-3 text-sm text-muted">
              <span className="flex items-center gap-1">
                <Users className="size-4" aria-hidden="true" />
                {comanda.pessoas}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-4" aria-hidden="true" />
                {comanda.minutos} min
              </span>
              {comanda.garcom && <span className="truncate">{comanda.garcom}</span>}
            </span>
          </>
        )}
      </header>

      {comanda ? (
        <ComandaDaMesa comanda={comanda} categorias={categorias} />
      ) : (
        <div className="rounded-card border border-line bg-surface px-5 py-10 text-center">
          <p className="text-lg font-extrabold">
            {rotulo} {mesa.numero} está livre
          </p>
          <p className="mt-1 text-muted">{mesa.lugares} lugares. Abra a mesa para começar a lançar.</p>
          <p className="mt-5">
            <span className={buttonClasses("primary")}>Abrir {rotulo.toLowerCase()}</span>
          </p>
        </div>
      )}
    </div>
  );
}
