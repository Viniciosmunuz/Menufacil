import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RestaurantMiniCard } from "@/components/public/restaurant-mini-card";
import { buttonClasses } from "@/components/ui/button";
import { linkDoWhatsapp, PLANOS, SECOES } from "@/components/venda/conteudo";
import { LeadForm } from "@/components/venda/lead-form";
import {
  ChamadaFinal,
  ComoFunciona,
  Depoimentos,
  Duvidas,
  Parceiros,
  Planos,
  Recursos,
  Topo,
  Totem,
} from "@/components/venda/sections";
import { getCurrentUser } from "@/server/auth/dal";
import { listRestaurants } from "@/server/public/restaurants";

// A página principal do MenuFácil.
//
// Era duas: uma vitrine de restaurantes, na cara de aplicativo de delivery,
// e uma página de venda escondida em /cadastre-seu-restaurante. Viraram
// esta. O MenuFácil não vende comida -- vende o sistema com que o
// restaurante vende a dele --, e dois endereços dividiam a mesma visita,
// cada um contando metade da história.
//
// Os restaurantes continuam na página, mas abaixo do produto e com outro
// papel: prova de quem já usa, e um cardápio de verdade para o dono abrir
// e ver funcionando antes de falar com a gente.

// o preço vem do mesmo lugar que a página mostra: escrito duas vezes, ele
// desencontra na primeira troca -- e foi o que aconteceu
const essencial = PLANOS[0];

export const metadata: Metadata = {
  // absoluto: o título da raiz já termina em "MenuFácil", e o padrão da
  // aplicação acrescentaria outro
  title: { absolute: "MenuFácil · Sistema de delivery e salão para restaurantes" },
  description: `Receba pedidos, imprima comandas e gerencie delivery e salão em um só sistema, sem comissão por pedido. A partir de ${essencial.preco}${essencial.periodo}.`,
};

export default async function HomePage({ searchParams }: PageProps<"/">) {
  // Quem trabalha no sistema cai no trabalho, não na página de venda: o
  // atalho que o dono salva na tela inicial do celular aponta para cá.
  // `/?site` abre a página mesmo logado, para ele ver o que o cliente vê.
  const [{ site }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user && site === undefined) {
    redirect(user.role === "ADMIN" ? "/admin" : "/painel");
  }

  // sem cidade: aqui a lista não é vitrine, é prova -- mostrar todos é o certo
  const parceiros = await listRestaurants({ take: 8 });
  const whatsapp = linkDoWhatsapp();

  return (
    <div className="flex w-full flex-col gap-11 sm:gap-16">
      <Topo />
      <ComoFunciona />
      <Recursos />
      <Planos />

      <div className="grid gap-4 lg:grid-cols-2">
        <Totem />
        <ChamadaFinal whatsapp={whatsapp} />
      </div>

      <Depoimentos />

      <Parceiros total={parceiros.length}>
        {parceiros.map((r, i) => (
          <RestaurantMiniCard key={r.id} data={r} priority={i === 0} />
        ))}
      </Parceiros>

      <Duvidas />

      <section id={SECOES.comece} className="scroll-mt-20">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-[1.45rem] leading-tight font-extrabold sm:text-[2rem]">Comece agora</h2>
          <p className="mt-1 text-sm text-muted sm:text-base">Te chamamos no WhatsApp em até 24h.</p>
        </div>
        <LeadForm
          submitLabel="Quero o MenuFácil no meu restaurante"
          successTitle="Recebemos!"
          successText="Vamos te chamar no WhatsApp em breve."
          footer={
            whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "lg", "w-full")}>
                <MessageCircle className="size-5" aria-hidden="true" />
                Prefiro falar no WhatsApp
              </a>
            ) : null
          }
        />
      </section>
    </div>
  );
}
