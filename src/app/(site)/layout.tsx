import { LogIn } from "lucide-react";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";

import { OwnerCtaSmall } from "@/components/site/owner-cta";
import { SiteHeader } from "@/components/site/site-header";
import { BottomNav, SiteNavLinks } from "@/components/site/site-nav";
import { StoreHeader } from "@/components/site/store-header";
import { selectedCity } from "@/server/public/city";
import { listCities, listPopularCategories } from "@/server/public/restaurants";
import { lockedStore } from "@/server/public/store";

// Casca do site público: topo com busca, menu lateral no computador e
// barra de baixo no celular (como nas telas de referência). Quem entrou
// pelo link de um restaurante vê só a casca dele.
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const store = await lockedStore();
  if (store) {
    return (
      <div className="min-h-dvh">
        <StoreHeader store={store} />
        <main className="mx-auto max-w-[90rem] px-4 pt-4 pb-28 lg:px-6 lg:pt-6 lg:pb-12">{children}</main>
        <BottomNav store={store} />
      </div>
    );
  }

  const [cities, city, categories] = await Promise.all([listCities(), selectedCity(), listPopularCategories()]);

  return (
    <div className="min-h-dvh">
      <SiteHeader cities={cities} city={city} categories={categories} />
      <div className="mx-auto flex max-w-[90rem] gap-8 px-4 lg:px-6">
        <aside className="sticky top-[4.75rem] hidden h-[calc(100dvh-4.75rem)] w-60 shrink-0 flex-col gap-8 overflow-y-auto py-6 lg:flex">
          <SiteNavLinks categories={categories} />
          <OwnerCtaSmall />
          <div className="mt-auto flex flex-col gap-4 px-2 pb-2 text-sm">
            <Link href="/entrar" className="flex items-center gap-2 font-bold text-muted hover:text-ink">
              <LogIn className="size-4" aria-hidden="true" />
              Entrar no painel
            </Link>
            <div className="flex items-start gap-3">
              <LogoIcon className="mt-0.5 h-7 shrink-0" />
              <p>
                <span className="block font-extrabold">MenuFácil</span>
                <span className="text-faint">Conectando sabores e pessoas.</span>
              </p>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 pt-4 pb-28 lg:pt-6 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
