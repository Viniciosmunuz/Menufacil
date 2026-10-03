import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { LogoIcon } from "@/components/brand/logo";
import { RestaurantMenu } from "@/components/site/restaurant-menu";
import { isOpenNow } from "@/lib/opening-hours";
import { getPublicRestaurant } from "@/server/public/restaurants";

import { AtivarTotem } from "./ativar";
import { TotemOcioso } from "./ocioso";

// A tela do totem: o mesmo cardápio que o cliente abre pelo link do
// restaurante, com os mesmos componentes.
//
// Não é uma cópia parecida -- é o <RestaurantMenu /> em pessoa, o mesmo que
// roda em /restaurante/[slug]. Mexer no cardápio muda os dois de uma vez, e
// nunca um vai ficar diferente do outro por esquecimento.
//
// O que muda no totem:
// - fica fora de (site): sem cabeçalho, sem rodapé e sem a barra de navegação,
//   para ninguém sair do restaurante nem chegar em outro;
// - o carrinho leva para /totem/[slug]/pedido, que pergunta se é para comer
//   aqui ou levar e cobra no cartão ou no Pix -- em vez do endereço de entrega.

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function TotemMenuPage({ params, searchParams }: PageProps<"/totem/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const dados = await getPublicRestaurant(slug, false);
  if (!dados) notFound();

  const r = dados.restaurant;
  // o admin da plataforma libera o totem restaurante por restaurante
  if (!r.totemEnabled) notFound();

  // o dono abre esta tela uma vez por aparelho, com o codigo do painel
  if (sp.ativar === "1") return <AtivarTotem slug={r.slug} nome={r.name} />;

  const aberto = isOpenNow(r.openMode, r.openingHours);
  const categorias = r.menuCategories.filter((c) => c.products.length > 0 && !c.pizzaFlavors);
  const sabores = r.menuCategories
    .filter((c) => c.pizzaFlavors)
    .flatMap((c) =>
      c.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        priceCents: p.promoPriceCents ?? p.priceCents,
        available: p.available,
        sizes: (p.optionGroups[0]?.options ?? []).map((o) => ({ name: o.name, priceCents: o.priceCents, available: o.available })),
        categoryId: c.id,
        categoryName: c.name,
      })),
    );

  // A largura fica travada: o totem de verdade tem 7 polegadas, e sem limite
  // o mesmo cardápio num monitor grande estica a ponto de a pessoa ter que
  // varrer a tela com os olhos para achar o preço.
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      {/* o cardápio do totem acompanha o do dono: esgotou lá, some daqui.
          Parado, vira o cartaz de descanso que chama quem passa. */}
      <TotemOcioso href={`/totem/${r.slug}`} nome={r.name} cartazUrl={r.totemIdleUrl} capaUrl={r.coverUrl} />

      {/* A faixa de cima do totem é fina de propósito.
          
          Na página do link vem a capa grande, o logo por cima e o nome: ali
          a pessoa está decidindo se pede naquele restaurante, e a foto
          ajuda a decidir. No balcão ela já decidiu -- está parada na frente
          do lugar, e quem anunciou o restaurante foi a tela de descanso,
          que ela acabou de tocar.
          
          Num tablet de 7 polegadas, a capa mais o logo tomavam quase um
          terço da altura para dizer o que a pessoa já sabe. Esse espaço
          agora é cardápio. */}
      {/* sem grudar no topo: quem precisa ficar à mão o tempo todo é a
          busca com as categorias, logo abaixo. Duas barras presas numa tela
          de 7 polegadas comeriam a altura que a mudança acabou de liberar */}
      <header className="border-b border-line bg-surface/40">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-surface">
            {r.logoUrl ? (
              <Image src={r.logoUrl} alt="" width={88} height={88} className="size-full object-cover" />
            ) : (
              <LogoIcon className="h-6" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg leading-tight font-extrabold">{r.name}</h1>
            <p className="truncate text-xs text-muted">Monte seu pedido e retire no balcão</p>
          </div>
          {/* o traço da marca: diz de quem é o sistema sem roubar uma linha
              inteira do cardápio */}
          <LogoIcon className="h-6 shrink-0 opacity-70" />
        </div>
        <span aria-hidden="true" className="block h-0.5 bg-gradient-to-r from-brand via-brand/40 to-transparent" />
      </header>

      {/* sem margem própria: a busca já vem com o respiro dela, e os dois
          juntos abriam um vão escuro entre a faixa e o cardápio */}
      <div className="px-4 pb-24">
        {categorias.length === 0 ? (
          <p className="mt-10 text-center text-muted">O cardápio ainda está sendo montado.</p>
        ) : (
          <RestaurantMenu
            restaurant={{ id: r.id, slug: r.slug, name: r.name }}
            categories={categorias}
            pizzaFlavors={sabores}
            canOrder={aberto}
            closedMessage={aberto ? null : "O restaurante está fechado agora. Chame um atendente."}
            carrinhoHref={`/totem/${r.slug}/pedido`}
            // no totem não existe barra de navegação embaixo
            barraDoCarrinho="bottom-3"
            // e não existe coluna do carrinho à direita: a barra tem que ficar
            // mesmo em monitor grande, senão não há como chegar ao pedido
            barraSempreVisivel
          />
        )}
      </div>
    </div>
  );
}
