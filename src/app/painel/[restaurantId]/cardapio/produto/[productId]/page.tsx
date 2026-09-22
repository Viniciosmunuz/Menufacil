import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { centsToInput } from "@/components/ui/money-input";
import { db } from "@/lib/db";
import { requireRestaurantAccess } from "@/server/auth/dal";

import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Editar produto" };

export default async function EditProductPage({ params }: PageProps<"/painel/[restaurantId]/cardapio/produto/[productId]">) {
  const { restaurantId, productId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);

  const [product, categories] = await Promise.all([
    // o produto precisa ser deste restaurante
    db.product.findFirst({
      where: { id: productId, restaurantId: restaurant.id },
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        imageUrl: true,
        priceCents: true,
        promoPriceCents: true,
        available: true,
        featured: true,
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            minSelect: true,
            maxSelect: true,
            halfHalf: true,
            halfFromOptionId: true,
            options: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, priceCents: true, available: true } },
          },
        },
      },
    }),
    db.menuCategory.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: `/painel/${restaurant.id}/cardapio#categoria-${product.categoryId}`, label: "Cardápio" }} title={product.name} />
      <ProductForm
        restaurantId={restaurant.id}
        categories={categories}
        product={{
          ...product,
          optionGroups: product.optionGroups.map((g) => {
            // o "a partir de" do meio a meio vira posição (grupo, opção) no editor
            const group = product.optionGroups.findIndex((og) => og.options.some((o) => o.id === g.halfFromOptionId));
            const option = group >= 0 ? product.optionGroups[group].options.findIndex((o) => o.id === g.halfFromOptionId) : -1;
            return {
              id: g.id,
              name: g.name,
              required: g.minSelect > 0,
              max: g.maxSelect,
              half: g.halfHalf,
              halfFrom: g.halfHalf && group >= 0 ? { group, option } : null,
              options: g.options.map((o) => ({ id: o.id, name: o.name, price: centsToInput(o.priceCents), available: o.available })),
            };
          }),
        }}
      />
    </div>
  );
}
