import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";
import { RestaurantMiniCard } from "@/components/public/restaurant-mini-card";
import { FeaturedCarousel } from "@/components/site/featured-carousel";
import { CategoryStrip, Hero, HowItWorks, PlaceholderCard, SectionHeading, WhyMenuFacil } from "@/components/site/home-sections";
import { OwnerCta } from "@/components/site/owner-cta";
import { selectedCity } from "@/server/public/city";
import { listPublicCategories, listRestaurants } from "@/server/public/restaurants";

const placeholders = ["Lanches • Pizzas • Bebidas", "Comida caseira • Marmitex", "Sushi • Japonesa", "Self service • Marmitex"];

export default async function HomePage() {
  const city = await selectedCity();
  const [categories, featured] = await Promise.all([
    listPublicCategories(),
    listRestaurants({ featuredOnly: true, city, take: 8 }),
  ]);
  // sem nenhum em destaque, mostra os que estão no ar
  const restaurants = featured.length ? featured : await listRestaurants({ city, take: 8 });

  const cards = restaurants.length
    ? restaurants.map((r, i) => <RestaurantMiniCard key={r.id} data={r} priority={i === 0} />)
    : placeholders.map((p) => <PlaceholderCard key={p} categories={p} />);

  return (
    <div className="grid grid-cols-1 gap-5 sm:gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-5 sm:gap-8">
        <Hero hasRestaurants={restaurants.length > 0} city={city} />

        {categories.length > 0 && (
          <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
            <SectionHeading
              title="Categorias"
              action={
                <Link href="/categorias" className="flex shrink-0 items-center gap-1 text-sm font-bold text-muted hover:text-ink">
                  Ver todas
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              }
            />
            <CategoryStrip categories={categories} />
          </section>
        )}

        <section>
          <SectionHeading
            title={
              <span className="flex items-center gap-2.5">
                <LogoIcon className="h-7 sm:h-8" />
                Restaurantes em destaque
              </span>
            }
            action={
              restaurants.length ? (
                <Link href="/restaurantes" className="hidden shrink-0 items-center gap-1 text-sm font-bold text-muted hover:text-ink sm:flex">
                  Ver todos
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />
          {/* celular: um restaurante por vez ao lado do "É dono de um restaurante?", como na referência */}
          <div className="grid grid-cols-[1.12fr_1fr] items-start gap-3 sm:hidden">
            <FeaturedCarousel label="Restaurantes em destaque">{cards}</FeaturedCarousel>
            <OwnerCta compact className="h-full" />
          </div>
          <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{cards}</div>
        </section>

        <OwnerCta className="hidden sm:flex xl:hidden" />
        <HowItWorks />
      </div>

      <aside className="hidden flex-col gap-6 xl:flex">
        <WhyMenuFacil />
        <OwnerCta />
      </aside>
    </div>
  );
}
