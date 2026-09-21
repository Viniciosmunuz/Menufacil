import { UtensilsCrossed } from "lucide-react";

import { OwnerCtaSmall } from "@/components/site/owner-cta";
import { SiteHeader } from "@/components/site/site-header";
import { BottomNav, SiteNavLinks } from "@/components/site/site-nav";
import { selectedCity } from "@/server/public/city";
import { listCities } from "@/server/public/restaurants";

// Casca do site público: topo com busca, menu lateral no computador e
// barra de baixo no celular (como nas telas de referência).
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [cities, city] = await Promise.all([listCities(), selectedCity()]);

  return (
    <div className="min-h-dvh">
      <SiteHeader cities={cities} city={city} />
      <div className="mx-auto flex max-w-[90rem] gap-8 px-4 lg:px-6">
        <aside className="sticky top-[4.75rem] hidden h-[calc(100dvh-4.75rem)] w-60 shrink-0 flex-col gap-8 overflow-y-auto py-6 lg:flex">
          <SiteNavLinks />
          <OwnerCtaSmall />
          <div className="mt-auto flex items-start gap-3 px-2 pb-2 text-sm">
            <UtensilsCrossed className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden="true" />
            <p>
              <span className="block font-extrabold">MenuFácil</span>
              <span className="text-faint">Conectando sabores e pessoas.</span>
            </p>
          </div>
        </aside>
        <main className="min-w-0 flex-1 pt-4 pb-28 lg:pt-6 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
