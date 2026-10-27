import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { linkDoWhatsapp, PLANOS, VITRINE } from "@/components/venda/conteudo";
import { BarraDeContato } from "@/components/venda/contato-rapido";
import {
  Adicionais,
  AntesEDepois,
  ChamadaFinal,
  Depoimentos,
  Duvidas,
  Planos,
  QuemJaUsa,
  Segmentos,
  Solucoes,
  Topo,
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
// Os restaurantes continuam na página, logo abaixo do topo e com outro
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

  // só os escolhidos (ver VITRINE): restaurante de teste também fica ativo
  const parceiros = await listRestaurants({ slugs: VITRINE });
  const whatsapp = linkDoWhatsapp();

  return (
    <>
      <Topo />

      <QuemJaUsa restaurantes={parceiros} />

      <div className="mt-14 sm:mt-20">
        <AntesEDepois />
      </div>
      <Solucoes />
      <Segmentos />
      <Planos />
      <Adicionais />
      <Depoimentos />
      <Duvidas />
      <ChamadaFinal whatsapp={whatsapp} />

      <BarraDeContato />
    </>
  );
}
