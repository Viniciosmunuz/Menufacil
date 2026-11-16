import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { db } from "@/lib/db";
import { requireRestaurantAccess } from "@/server/auth/dal";

import { AddressSection, ContactSection, DeliveryAreasSection, DeliverySection, HoursSection, InfoSection, PaymentMethodsSection, PaymentSection, PizzaSection } from "./forms";

export const metadata: Metadata = { title: "Restaurante" };

// A tira de atalhos que ficava aqui (Informações, Contato, Endereço...)
// saiu em 16/11/2026 junto com os cartões abertos: com as seções em
// gaveta a lista inteira cabe numa tela, e um atalho para rolar dois
// dedos é mais coisa na tela do que ajuda. As âncoras continuam vivas --
// o cartão de pendências do painel manda para `#pagamento`, `#horarios`
// --, só que agora elas abrem a gaveta de destino.

export default async function MyRestaurantPage({ params }: PageProps<"/painel/[restaurantId]/restaurante">) {
  const { restaurantId } = await params;
  const { restaurant: r0 } = await requireRestaurantAccess(restaurantId);

  const r = await db.restaurant.findUniqueOrThrow({
    where: { id: r0.id },
    include: {
      openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
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

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* self-stretch: a coluna desce até o fim da página, e é isso que
            deixa o celular grudar enquanto o resto rola */}
        <aside className="flex flex-col gap-3 lg:order-2 lg:self-stretch">
          {/* O cartão da vitrine ("Como aparece no site") ficava aqui em
              cima e saiu em 16/11/2026. Mostrava o restaurante como ele
              aparece na lista de /restaurantes -- uma página por onde
              quase ninguém chega, já que o cliente vem pelo link direto
              ou pela Lia. E dizia, em miniatura, o que o celular logo
              abaixo já diz inteiro e de verdade: eram duas prévias
              disputando a mesma coluna. */}

          {/* O cardápio de verdade, aberto num celular ao lado do formulário.
              Navega como o cliente navega: abre item, troca de categoria,
              põe no carrinho. É o mesmo endereço do link, carregado do
              próprio site. Só no computador: no celular a tela já é o
              celular, e a moldura não caberia. */}
          <div className="hidden lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-3">
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
                  src={`/restaurante/${r.slug}?previa=${r.updatedAt.getTime()}`}
                  title={`Cardápio de ${r.name}`}
                  loading="lazy"
                  className="absolute top-0 left-0 h-[780px] w-[390px] origin-top-left scale-[0.78] border-0"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* gap-3 e não gap-6: fechadas, as gavetas são uma lista de
            linhas, e o respiro de cartão separado as desmancharia */}
        <div className="flex min-w-0 flex-col gap-3">
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
