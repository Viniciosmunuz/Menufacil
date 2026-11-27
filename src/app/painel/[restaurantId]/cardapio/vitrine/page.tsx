import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { db } from "@/lib/db";
import { requireRestaurantAccess } from "@/server/auth/dal";

import { Vitrine } from "./vitrine";

export const metadata: Metadata = { title: "Capa e destaques" };

export default async function VitrinePage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);

  const [banners, destaques] = await Promise.all([
    db.banner.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, imageUrl: true, titulo: true, ativo: true },
    }),
    // Na mesma ordem em que a vitrine do cliente sai: é a lista que o
    // dono está olhando no celular dele, e uma ordem diferente aqui
    // faria as setas mexerem no que não está na frente.
    db.product.findMany({
      where: { restaurantId: restaurant.id, featured: true },
      orderBy: [{ featuredOrder: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        imageUrl: true,
        priceCents: true,
        promoPriceCents: true,
        available: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/painel/${restaurant.id}/cardapio`}
        className="flex w-fit items-center gap-1.5 text-sm font-bold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Cardápio
      </Link>

      <PageHeader
        title="Capa e destaques"
        description="O que o cliente vê antes de rolar o cardápio."
      />

      <Vitrine
        restaurantId={restaurant.id}
        banners={banners}
        destaques={destaques.map((p) => ({
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
          priceCents: p.priceCents,
          promoPriceCents: p.promoPriceCents,
          available: p.available,
          categoria: p.category.name,
        }))}
      />
    </div>
  );
}
