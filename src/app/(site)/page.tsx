import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";
import { RestaurantCard } from "@/components/public/restaurant-card";
import { CategoryStrip, Hero, HowItWorks, PlaceholderCard, SectionHeading, WhyMenuFacil } from "@/components/site/home-sections";
import { OwnerCta } from "@/components/site/owner-cta";
import { selectedCity } from "@/server/public/city";
import { listPublicCategories, listRestaurants } from "@/server/public/restaurants";

const placeholders = ["Lanches · Pizzas · Bebidas", "Comida caseira · Marmitex", "Sushi · Japonesa", "Self service · Marmitex"];

export default async function HomePage() {
  const city = await selectedCity();
  const [categories, featured] = await Promise.all([
    listPublicCategories(),
    listRestaurants({ featuredOnly: true, city, take: 8 }),
  ]);
  // sem nenhum em destaque, mostra os que estão no ar
  const restaurants = featured.length ? featured : await listRestaurants({ city, take: 8 });

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-8">
        <Hero hasRestaurants={restaurants.length > 0} city={city} />

        {categories.length > 0 && (
          <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
            <SectionHeading
              title="Categorias"
              action={
                <Link href="/categorias" className="flex items-center gap-1 text-sm font-bold text-muted hover:text-ink">
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
                <LogoIcon className="h-8" />
                Restaurantes em destaque
              </span>
            }
            description={
              restaurants.length
                ? `Confira quem já faz parte da plataforma${city ? ` em ${city}` : ""}.`
                : "Confira alguns restaurantes que já fazem parte da nossa plataforma."
            }
            action={
              restaurants.length ? (
                <Link href="/restaurantes" className="flex shrink-0 items-center gap-1 text-sm font-bold text-muted hover:text-ink">
                  Ver todos
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {restaurants.length
              ? restaurants.map((r) => <RestaurantCard key={r.id} data={r} href={`/restaurante/${r.slug}`} />)
              : placeholders.map((p) => <PlaceholderCard key={p} categories={p} />)}
          </div>
        </section>

        <OwnerCta className="xl:hidden" />
        <HowItWorks />
      </div>

      <aside className="hidden flex-col gap-6 xl:flex">
        <WhyMenuFacil />
        <OwnerCta />
      </aside>
    </div>
  );
}
