import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { db } from "@/lib/db";
import { requireRestaurantAccess } from "@/server/auth/dal";

import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage({ params, searchParams }: PageProps<"/painel/[restaurantId]/cardapio/produto/novo">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  const sp = await searchParams;

  const categories = await db.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });
  // sem categoria não há onde pôr o produto: volta para criar uma
  if (categories.length === 0) redirect(`/painel/${restaurant.id}/cardapio`);

  const wanted = typeof sp.categoria === "string" ? sp.categoria : null;
  const categoryId = categories.find((c) => c.id === wanted)?.id ?? categories[0].id;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: `/painel/${restaurant.id}/cardapio`, label: "Cardápio" }} title="Novo produto" />
      <ProductForm
        restaurantId={restaurant.id}
        categories={categories}
        product={{
          categoryId,
          name: "",
          description: null,
          imageUrl: null,
          priceCents: null,
          promoPriceCents: null,
          available: true,
          featured: false,
        }}
      />
    </div>
  );
}
