import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RestaurantCard } from "@/components/public/restaurant-card";
import { CategoryStrip } from "@/components/site/home-sections";
import { SearchBox } from "@/components/site/site-header";
import { EmptyState } from "@/components/ui/empty-state";
import { selectedCity } from "@/server/public/city";
import { listPublicCategories, listRestaurants } from "@/server/public/restaurants";

export const metadata: Metadata = { title: "Restaurantes" };

export default async function RestaurantsPage({ searchParams }: PageProps<"/restaurantes">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const category = typeof sp.categoria === "string" ? sp.categoria : null;
  const city = await selectedCity();

  const [categories, restaurants] = await Promise.all([listPublicCategories(), listRestaurants({ q, category, city })]);
  const categoryName = categories.find((c) => c.slug === category)?.name;
  const openCount = restaurants.filter((r) => r.open).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          {q ? `Resultados para “${q}”` : categoryName ?? "Restaurantes"}
        </h1>
        <p className="mt-1 text-muted">
          {restaurants.length} restaurante{restaurants.length === 1 ? "" : "s"}
          {city ? ` em ${city}` : ""} · {openCount} aberto{openCount === 1 ? "" : "s"} agora
        </p>
      </div>
      <SearchBox defaultValue={q} className="lg:hidden" />
      {categories.length > 0 && <CategoryStrip categories={categories} current={category} />}
      {restaurants.length === 0 ? (
        <EmptyState icon={<SearchX />} title="Nenhum restaurante encontrado">
          {q || category ? (
            <>
              Tente outra busca ou{" "}
              <Link href="/restaurantes" className="font-bold text-brand hover:underline">
                veja todos
              </Link>
              .
            </>
          ) : (
            "Em breve, novos sabores por aqui!"
          )}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {restaurants.map((r) => (
            <RestaurantCard key={r.id} data={r} href={`/restaurante/${r.slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}
