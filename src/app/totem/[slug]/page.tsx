import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { LogoIcon } from "@/components/brand/logo";
import { RestaurantMenu } from "@/components/site/restaurant-menu";
import { isOpenNow } from "@/lib/opening-hours";
import { getPublicRestaurant } from "@/server/public/restaurants";

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

export default async function TotemMenuPage({ params }: PageProps<"/totem/[slug]">) {
  const { slug } = await params;
  const dados = await getPublicRestaurant(slug, false);
  if (!dados) notFound();

  const r = dados.restaurant;
  // o admin da plataforma libera o totem restaurante por restaurante
  if (!r.totemEnabled) notFound();

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
      {/* o cardápio do totem acompanha o do dono: esgotou lá, some daqui */}
      <TotemOcioso href={`/totem/${r.slug}`} />

      {/* capa e nome, como na página do link -- só sem os botões de voltar,
          compartilhar e favoritar, que no balcão não levam a lugar nenhum */}
      <section>
        <div className="relative h-40 overflow-hidden bg-surface-2 sm:h-48">
          {r.coverUrl ? (
            <Image src={r.coverUrl} alt="" fill priority sizes="100vw" className="object-cover" />
          ) : (
            <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_70%_30%,rgb(255_138_31/0.25),transparent_60%)]">
              <LogoIcon className="h-14 opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-bg/40" aria-hidden="true" />
        </div>

        <div className="relative -mt-10 px-4">
          <div className="flex items-end gap-3">
            <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-card border border-line bg-surface">
              {r.logoUrl ? (
                <Image src={r.logoUrl} alt="" width={80} height={80} className="size-full object-cover" />
              ) : (
                <LogoIcon className="h-9" />
              )}
            </span>
            <div className="min-w-0 pb-1">
              <h1 className="truncate text-2xl font-extrabold">{r.name}</h1>
              <p className="text-sm text-muted">Monte seu pedido aqui e retire no balcão.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 px-4 pb-24">
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
