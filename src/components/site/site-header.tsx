import { Search, User } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { CitySelect } from "./city-select";
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
        className="h-12 w-full rounded-full border border-line bg-surface-2 pr-4 pl-12 text-base text-ink placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
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
          <Logo withSlogan sloganClassName="hidden sm:block" />
        </Link>
        <SearchBox className="mx-auto hidden w-full max-w-xl lg:block" />
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="hidden xl:block">
            <CitySelect cities={cities} current={city} />
          </div>
          <Link
            href="/entrar"
            className="flex h-11 items-center gap-2 rounded-control px-2.5 font-bold text-ink hover:bg-surface-2 sm:px-3"
            aria-label="Entrar no painel do restaurante"
          >
            <User className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">Entrar</span>
          </Link>
          <Link href="/cadastre-seu-restaurante" className={buttonClasses("primary", "sm", "h-10 px-4")}>
            Cadastrar
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-2 px-4 pb-3 lg:hidden">
        <SearchBox />
        {cities.length > 1 && (
          <div className="flex justify-end">
            <CitySelect cities={cities} current={city} />
          </div>
        )}
      </div>
    </header>
  );
}
