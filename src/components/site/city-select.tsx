"use client";

import { ChevronDown, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

import { CITY_COOKIE } from "@/lib/site";

// Cidade escolhida no topo (fica num cookie por um ano). Filtra as listas de
// restaurantes do site.
export function CitySelect({ cities, current }: { cities: { city: string; state: string | null }[]; current: string | null }) {
  const router = useRouter();
  if (cities.length === 0) return null;

  function change(value: string) {
    document.cookie = value
      ? `${CITY_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`
      : `${CITY_COOKIE}=; path=/; max-age=0`;
    router.refresh();
  }

  return (
    <label className="relative flex h-11 items-center gap-2 rounded-control px-3 font-bold hover:bg-surface-2">
      <MapPin className="size-5 shrink-0 text-brand" aria-hidden="true" />
      <span className="sr-only">Cidade</span>
      <select
        value={current ?? ""}
        onChange={(e) => change(e.target.value)}
        className="max-w-52 appearance-none truncate bg-transparent pr-6 text-sm font-bold text-ink focus:outline-none"
      >
        <option value="">Todas as cidades</option>
        {cities.map((c) => (
          <option key={c.city} value={c.city}>
            {c.city}
            {c.state ? ` - ${c.state}` : ""}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted" aria-hidden="true" />
    </label>
  );
}
