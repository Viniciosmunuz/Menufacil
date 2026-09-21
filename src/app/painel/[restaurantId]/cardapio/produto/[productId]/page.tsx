import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
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
      <ProductForm restaurantId={restaurant.id} categories={categories} product={product} />
    </div>
  );
}
