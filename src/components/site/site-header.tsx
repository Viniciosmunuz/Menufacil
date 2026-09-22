import { Search } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

import { CitySelect } from "./city-select";
import { HideOnRestaurantPage } from "./hide-on-restaurant-page";
import { MobileMenu } from "./mobile-menu";

export function SearchBox({ defaultValue, className, autoFocus }: { defaultValue?: string; className?: string; autoFocus?: boolean }) {
  return (
    <form action="/restaurantes" role="search" className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-faint" aria-hidden="true" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="Busque por restaurantes, lanches, pizzas..."
        aria-label="Buscar restaurantes e pratos"
        enterKeyHint="search"
        className="h-12 w-full rounded-2xl border border-line bg-surface-2 pr-4 pl-12 text-base text-ink placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
      />
    </form>
  );
}

export function SiteHeader({ cities, city }: { cities: { city: string; state: string | null }[]; city: string | null }) {
  return (
    <header className="z-30 border-b border-line bg-bg/90 backdrop-blur lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[90rem] items-center gap-2 px-4 py-3 sm:gap-3 lg:px-6">
        <MobileMenu />
        <Link href="/" className="min-w-0 shrink" aria-label="MenuFácil: início">
          <Logo />
        </Link>
        <SearchBox className="mx-auto hidden w-full max-w-xl lg:block" />
        {/* topo limpo: entrar e cadastrar ficam no menu (☰) e no menu lateral */}
        <div className="ml-auto hidden shrink-0 xl:block">
          <CitySelect cities={cities} current={city} />
        </div>
      </div>
      {/* na página do restaurante a busca geral sai: a capa aparece inteira */}
      <HideOnRestaurantPage>
        <div className="flex flex-col gap-2 px-4 pb-3 lg:hidden">
          <SearchBox />
          {cities.length > 1 && (
            <div className="flex justify-end">
              <CitySelect cities={cities} current={city} />
            </div>
          )}
        </div>
      </HideOnRestaurantPage>
    </header>
  );
}
