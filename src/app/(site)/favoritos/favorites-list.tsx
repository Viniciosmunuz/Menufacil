"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { RestaurantCard } from "@/components/public/restaurant-card";
import { useFavorites } from "@/components/site/favorites";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { PublicRestaurantCard } from "@/server/public/restaurants";

import { favoriteRestaurants } from "./actions";

export function FavoritesList() {
  const slugs = useFavorites();
  const key = slugs.join(",");
  const [result, setResult] = useState<{ key: string; cards: PublicRestaurantCard[] } | null>(null);

  useEffect(() => {
    let active = true;
    favoriteRestaurants(key ? key.split(",") : []).then((cards) => {
      if (active) setResult({ key, cards });
    });
    return () => {
      active = false;
    };
  }, [key]);

  if (!result || result.key !== key) {
    return <p className="text-muted">Carregando seus favoritos...</p>;
  }
  if (result.cards.length === 0) {
    return (
      <EmptyState icon={<Heart />} title="Nenhum favorito ainda">
        Toque no coração na página de um restaurante para guardar aqui.
        <span className="mt-4 block">
          <Link href="/restaurantes" className={buttonClasses("primary")}>
            Ver restaurantes
          </Link>
        </span>
      </EmptyState>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {result.cards.map((r) => (
        <RestaurantCard key={r.id} data={r} href={`/restaurante/${r.slug}`} />
      ))}
    </div>
  );
}
