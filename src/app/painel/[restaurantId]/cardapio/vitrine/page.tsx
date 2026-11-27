import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { db } from "@/lib/db";
import { LIMITE_DOS_MAIS_PEDIDOS } from "@/lib/mais-pedidos";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { vendasDoMes } from "@/server/public/restaurants";

import { Vitrine } from "./vitrine";

export const metadata: Metadata = { title: "Destaques e mais pedidos" };

export default async function VitrinePage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);

  const [banners, marca, produtos, vendas] = await Promise.all([
    db.banner.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        imageUrl: true,
        titulo: true,
        ativo: true,
        escala: true,
        focoX: true,
        focoY: true,
        largura: true,
        altura: true,
      },
    }),
    db.restaurant.findUnique({ where: { id: restaurant.id }, select: { destaquesLigados: true } }),
    // Só o que o cliente do link enxerga como prato: fora as seções
    // desligadas, as de "só no salão" e as de sabores de pizza, que são
    // catálogo de dentro da pizza e não item solto.
    db.product.findMany({
      where: {
        restaurantId: restaurant.id,
        category: { active: true, somenteSalao: false, pizzaFlavors: false },
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        imageUrl: true,
        priceCents: true,
        promoPriceCents: true,
        available: true,
        featured: true,
        featuredOrder: true,
        category: { select: { name: true } },
      },
    }),
    vendasDoMes(restaurant.id),
  ]);

  const prato = (p: (typeof produtos)[number]) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.imageUrl,
    priceCents: p.priceCents,
    promoPriceCents: p.promoPriceCents,
    available: p.available,
    categoria: p.category.name,
  });

  // Os fixados, na ordem que o dono escolheu -- a mesma em que o cliente
  // vê. Quem empata (tudo zerado, que é como nasce) fica na ordem do
  // cardápio, como lá.
  const fixados = produtos
    .filter((p) => p.featured)
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p.featuredOrder - b.p.featuredOrder || a.i - b.i)
    .map(({ p }) => prato(p));

  // O que o sistema põe sozinho agora, com a mesma conta do cardápio:
  // mais vendidos do mês (duas unidades ou mais), disponíveis e não
  // fixados, até completar a seção.
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const vagas = Math.max(0, LIMITE_DOS_MAIS_PEDIDOS - fixados.filter((p) => p.available).length);
  const automaticos = vendas
    .filter((v) => v.quantidade >= 2)
    .map((v) => ({ p: porId.get(v.productId), quantidade: v.quantidade }))
    .filter((v): v is { p: (typeof produtos)[number]; quantidade: number } => Boolean(v.p && v.p.available && !v.p.featured))
    .slice(0, vagas)
    .map((v) => ({ ...prato(v.p), vendidos: v.quantidade }));

  // a lista para fixar um prato: tudo o que ainda não está fixado
  const paraFixar = produtos.filter((p) => !p.featured).map((p) => ({ id: p.id, name: p.name, categoria: p.category.name }));

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/painel/${restaurant.id}/cardapio`}
        className="flex w-fit items-center gap-1.5 text-sm font-bold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Cardápio
      </Link>

      <PageHeader title="Destaques e mais pedidos" description="O que o cliente vê antes das categorias do cardápio." />

      <Vitrine
        restaurantId={restaurant.id}
        destaquesLigados={marca?.destaquesLigados ?? false}
        banners={banners}
        fixados={fixados}
        automaticos={automaticos}
        paraFixar={paraFixar}
      />
    </div>
  );
}
