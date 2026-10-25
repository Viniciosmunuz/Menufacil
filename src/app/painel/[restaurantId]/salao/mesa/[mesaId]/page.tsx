import { ArrowLeft, Clock, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ComandaDaMesa } from "@/components/panel/comanda-mesa";
import { tempoDeMesa } from "@/components/panel/mesa-card";
import { MexerNaMesa } from "@/components/panel/mexer-na-mesa";
import { NomeDaMesa } from "@/components/panel/nome-da-mesa";
import { db } from "@/lib/db";
import { requireSalao } from "@/server/auth/dal";
import { cardapioDoSalao, verMesa } from "@/server/salao/comanda";
import { mesasParaDestino } from "@/server/salao/mexer";

export const metadata: Metadata = { title: "Mesa" };

export default async function MesaPage({ params }: PageProps<"/painel/[restaurantId]/salao/mesa/[mesaId]">) {
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
  const rotulo = mesa.tipo === "BALCAO" ? "Balcão" : "Mesa";
  // comanda sem id é a mesa livre: ela existe para o toque cair no cardápio
  const aberta = comanda.id !== "";
  const base = `/painel/${restaurant.id}/salao`;

  // "Mesa 4 ✎ ⇅" em cima da comanda, como no Yooga. A seta de voltar só
  // aparece no celular: no computador quem volta é o VOLTAR do cardápio.
  const cabecalho = (
    <>
      <Link
        href={base}
        className="grid size-10 shrink-0 place-items-center rounded-control border border-line text-muted hover:text-ink lg:hidden"
        aria-label="Voltar ao salão"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>
      <span className="min-w-0 flex-1">
        <NomeDaMesa restaurantId={restaurant.id} mesaId={mesa.id} rotulo={rotulo} numero={mesa.numero} nome={mesa.nome} />
        {/* Mesa sem nada lançado é mesa livre, e aqui ela chega como uma
            comanda vazia -- é o que faz o toque cair direto no cardápio.
            Sem este teste o cabeçalho anunciava "0 min" numa mesa em que
            ninguém sentou. */}
        <span className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
          {aberta ? (
            <>
              <span className={comanda.status === "PAGO" ? "font-semibold text-[#2f7de1]" : "font-semibold text-[#1e9a52]"}>
                {comanda.status === "PAGO" ? "Paga" : "Aberta"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                {tempoDeMesa(comanda.minutos)}
              </span>
              {comanda.pessoas > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" aria-hidden="true" />
                  {comanda.pessoas}
                </span>
              )}
              {comanda.garcom && <span className="truncate">{comanda.garcom}</span>}
            </>
          ) : (
            <span className="font-semibold">Livre</span>
          )}
        </span>
      </span>
      {/* as setas só existem com a mesa aberta: é a comanda que muda de
          lugar, e mesa livre não tem comanda */}
      {aberta && pode.mexerNaMesa && (
        <MexerNaMesa comanda={comanda} restaurantId={restaurant.id} mesas={mesas} rotulo={mesa.nome ?? rotulo + " " + mesa.numero} />
      )}
    </>
  );

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col lg:h-[calc(100dvh-3rem)] lg:min-h-[36rem]">
      <ComandaDaMesa
        comanda={comanda}
        categorias={categorias}
        pode={pode}
        mesaRotulo={mesa.nome ?? rotulo + " " + mesa.numero}
        temImpressora={impressoras > 0}
        restaurantId={restaurant.id}
        mesaId={mesa.id}
        voltarHref={base}
        cabecalho={cabecalho}
      />
    </div>
  );
}
