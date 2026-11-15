import { ExternalLink } from "lucide-react";
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
        {/* self-stretch: a coluna desce até o fim da página, e é isso que
            deixa o celular lá embaixo grudar enquanto o resto rola */}
        <aside className="flex flex-col gap-3 lg:order-2 lg:self-stretch">
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

          {/* O cardápio de verdade, aberto num celular ao lado do formulário.
              Navega como o cliente navega: abre item, troca de categoria,
              põe no carrinho. É o mesmo endereço do link, carregado do
              próprio site. Só no computador: no celular a tela já é o
              celular, e a moldura não caberia. */}
          <div className="hidden lg:sticky lg:top-28 lg:mt-3 lg:flex lg:flex-col lg:gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-muted">Seu cardápio</p>
              <a
                href={`/restaurante/${r.slug}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1 text-sm font-bold text-brand hover:underline"
              >
                Abrir
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
            {/* 390 x 780 é a tela de um celular comum; o 0,78 encolhe para
                caber nos 20rem da coluna sem o cardápio virar versão de
                computador */}
            <div className="mx-auto w-fit rounded-[2.4rem] border-[7px] border-night bg-night p-0.5 shadow-xl shadow-black/15">
              <div className="relative h-[608px] w-[304px] overflow-hidden rounded-[1.9rem] bg-bg">
                <iframe
                  // a hora da última mudança no endereço: salvou, o endereço muda e
                  // o celular recarrega sozinho com o que acabou de ser gravado
                  src={`/restaurante/${r.slug}?v=${r.updatedAt.getTime()}`}
                  title={`Cardápio de ${r.name}`}
                  loading="lazy"
                  className="absolute top-0 left-0 h-[780px] w-[390px] origin-top-left scale-[0.78] border-0"
                />
              </div>
            </div>
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
