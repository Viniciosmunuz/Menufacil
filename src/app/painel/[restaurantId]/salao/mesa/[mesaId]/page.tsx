import { ArrowLeft, Clock, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ComandaDaMesa } from "@/components/panel/comanda-mesa";
import { NomeDaMesa } from "@/components/panel/nome-da-mesa";
import { Badge } from "@/components/ui/badge";
import { requireSalao } from "@/server/auth/dal";
import { cardapioDoSalao, verMesa } from "@/server/salao/comanda";

export const metadata: Metadata = { title: "Mesa" };

export default async function MesaPage({ params }: PageProps<"/painel/[restaurantId]/salao/mesa/[mesaId]">) {
  const { restaurantId, mesaId } = await params;
  const { restaurant, pode } = await requireSalao(restaurantId);

  const [achado, categorias] = await Promise.all([verMesa(restaurant.id, mesaId), cardapioDoSalao(restaurant.id)]);
  if (!achado) notFound();

  const { mesa, comanda } = achado;
  const rotulo = mesa.tipo === "BALCAO" ? "Balcão" : "Mesa";
  // comanda sem id é a mesa livre: ela existe para o toque cair no cardápio
  const aberta = comanda.id !== "";
  const base = `/painel/${restaurant.id}/salao`;

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col gap-4">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={base} className="grid size-10 shrink-0 place-items-center rounded-control border border-line text-muted hover:text-ink" aria-label="Voltar ao salão">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <NomeDaMesa restaurantId={restaurant.id} mesaId={mesa.id} rotulo={rotulo} numero={mesa.numero} nome={mesa.nome} />
        {/* Mesa sem nada lançado é mesa livre, e aqui ela chega como uma
            comanda vazia -- é o que faz o toque cair direto no cardápio.
            Sem este teste o cabeçalho anunciava "Ocupada · 0 pessoas · 0
            min" numa mesa em que ninguém sentou. */}
        {aberta ? (
          <>
            <Badge tone={comanda.status === "PAGO" ? "success" : "brand"}>{comanda.status === "PAGO" ? "Pago" : "Ocupada"}</Badge>
            <span className="flex items-center gap-3 text-sm text-muted">
              {comanda.pessoas > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="size-4" aria-hidden="true" />
                  {comanda.pessoas}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="size-4" aria-hidden="true" />
                {comanda.minutos} min
              </span>
              {comanda.garcom && <span className="truncate">{comanda.garcom}</span>}
            </span>
          </>
        ) : (
          <Badge tone="neutral">Livre</Badge>
        )}
      </header>

      <ComandaDaMesa
        comanda={comanda}
        categorias={categorias}
        podeFinanceiro={pode.finalizarMesa}
        podeApagarItem={pode.excluirItem}
        restaurantId={restaurant.id}
        mesaId={mesa.id}
      />
    </div>
  );
}
