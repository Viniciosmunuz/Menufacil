import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { RestaurantCard } from "@/components/public/restaurant-card";
import { db } from "@/lib/db";
import { isOpenNow } from "@/lib/opening-hours";
import { requireRestaurantAccess } from "@/server/auth/dal";

import { AddressSection, ContactSection, DeliveryAreasSection, DeliverySection, HoursSection, InfoSection, PaymentMethodsSection, PaymentSection, PizzaSection } from "./forms";

export const metadata: Metadata = { title: "Restaurante" };

const sections = [
  { href: "#informacoes", label: "Informações" },
  { href: "#contato", label: "Contato" },
  { href: "#endereco", label: "Endereço" },
  { href: "#horarios", label: "Horários" },
  { href: "#entrega", label: "Entrega" },
  { href: "#area", label: "Bairros" },
  { href: "#pagamento", label: "Pix" },
  { href: "#formas-de-pagamento", label: "Cartão e dinheiro" },
  { href: "#pizza", label: "Pizza" },
];

export default async function MyRestaurantPage({ params }: PageProps<"/painel/[restaurantId]/restaurante">) {
  const { restaurantId } = await params;
  const { restaurant: r0 } = await requireRestaurantAccess(restaurantId);

  const r = await db.restaurant.findUniqueOrThrow({
    where: { id: r0.id },
    include: {
      openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
      categories: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true } },
      menuCategories: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, pizzaFlavors: true, _count: { select: { products: true } } },
      },
      deliveryAreas: { orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true, apelidos: true, feeCents: true } },
    },
  });

  const hours = r.openingHours;
  const menuCategories = r.menuCategories.map((c) => ({ id: c.id, name: c.name, pizzaFlavors: c.pizzaFlavors, products: c._count.products }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Restaurante" />

      {/* Os atalhos acompanham a rolagem: a página é comprida, e sem isso
          trocar de seção era subir tudo de novo. Ficam logo abaixo da
          faixa do alto, numa linha só que rola para o lado. */}
      <nav
        className="sticky top-[3.75rem] z-10 -mx-4 flex gap-1.5 overflow-x-auto bg-bg/95 px-4 py-2 backdrop-blur [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:top-[3.25rem] lg:-mx-10 lg:px-10"
        aria-label="Partes da página"
      >
        {sections.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="flex h-9 shrink-0 items-center rounded-full bg-surface-2 px-3.5 text-sm font-bold text-muted transition-colors hover:bg-brand-soft hover:text-brand"
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
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <InfoSection r={{ ...r, hours, menuCategories }} />
          <ContactSection r={{ ...r, hours, menuCategories }} />
          <AddressSection r={{ ...r, hours, menuCategories }} />
          <HoursSection r={{ ...r, hours, menuCategories }} />
          <DeliverySection r={{ ...r, hours, menuCategories }} />
          <DeliveryAreasSection r={{ ...r, hours, menuCategories }} areas={r.deliveryAreas} />
          <PaymentSection r={{ ...r, hours, menuCategories }} />
          <PaymentMethodsSection r={{ ...r, hours, menuCategories }} />
          <PizzaSection r={{ ...r, hours, menuCategories }} />
        </div>
      </div>
    </div>
  );
}
