import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { RestaurantCard } from "@/components/public/restaurant-card";
import { db } from "@/lib/db";
import { isOpenNow } from "@/lib/opening-hours";
import { requireRestaurantAccess } from "@/server/auth/dal";

import { AddressSection, ContactSection, DeliverySection, HoursSection, InfoSection, PaymentMethodsSection, PaymentSection } from "./forms";

export const metadata: Metadata = { title: "Meu restaurante" };

const sections = [
  { href: "#informacoes", label: "Informações" },
  { href: "#contato", label: "Contato" },
  { href: "#endereco", label: "Endereço" },
  { href: "#horarios", label: "Horários" },
  { href: "#entrega", label: "Entrega" },
  { href: "#pagamento", label: "Pix" },
];

export default async function MyRestaurantPage({ params }: PageProps<"/painel/[restaurantId]/restaurante">) {
  const { restaurantId } = await params;
  const { restaurant: r0 } = await requireRestaurantAccess(restaurantId);

  const r = await db.restaurant.findUniqueOrThrow({
    where: { id: r0.id },
    include: {
      openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
      categories: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true } },
    },
  });

  const hours = r.openingHours;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Meu restaurante" description="O que você preencher aqui aparece para os clientes no site." />

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Partes da página">
        {sections.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="flex h-10 shrink-0 items-center rounded-full border border-line bg-surface px-4 text-sm font-bold text-muted hover:text-ink"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6 lg:order-2">
          <p className="text-sm font-bold text-muted">Como aparece no site</p>
          <div className="max-w-sm">
            <RestaurantCard
              data={{
                name: r.name,
                slug: r.slug,
                logoUrl: r.logoUrl,
                coverUrl: r.coverUrl,
                city: r.city,
                state: r.state,
                categories: r.categories.map((c) => c.name),
                open: isOpenNow(r.openMode, hours),
                ratingAverage: r.ratingAverage,
                ratingCount: r.ratingCount,
                deliveryEnabled: r.deliveryEnabled,
                deliveryFeeCents: r.deliveryFeeCents,
                deliveryTimeMin: r.deliveryTimeMin,
                deliveryTimeMax: r.deliveryTimeMax,
              }}
            />
          </div>
          <p className="text-xs text-faint">A prévia muda depois que você salva.</p>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <InfoSection r={{ ...r, hours }} />
          <ContactSection r={{ ...r, hours }} />
          <AddressSection r={{ ...r, hours }} />
          <HoursSection r={{ ...r, hours }} />
          <DeliverySection r={{ ...r, hours }} />
          <PaymentSection r={{ ...r, hours }} />
          <PaymentMethodsSection r={{ ...r, hours }} />
        </div>
      </div>
    </div>
  );
}
