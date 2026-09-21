import { BookOpen, ChevronDown, ChevronUp, ImageOff, Pencil, Plus, Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SwitchButton } from "@/components/ui/switch-button";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { requireRestaurantAccess } from "@/server/auth/dal";

import { moveProduct, toggleProduct } from "./actions";
import { CategoryCard, NewCategoryButton } from "./category-card";

export const metadata: Metadata = { title: "Cardápio" };

type Product = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  promoPriceCents: number | null;
  available: boolean;
  featured: boolean;
};

function Price({ p }: { p: Product }) {
  if (p.promoPriceCents) {
    return (
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-extrabold text-brand">{formatCents(p.promoPriceCents)}</span>
        <s className="text-faint">{formatCents(p.priceCents)}</s>
      </p>
    );
  }
  return <p className="text-sm font-extrabold">{formatCents(p.priceCents)}</p>;
}

function ProductRow({ restaurantId, p, first, last }: { restaurantId: string; p: Product; first: boolean; last: boolean }) {
  const hidden = (
    <>
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="id" value={p.id} />
    </>
  );
  return (
    <li id={`produto-${p.id}`} className={cn("flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5", !p.available && "bg-bg/40")}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn("relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-surface-2 text-faint", !p.available && "opacity-50")}>
          {p.imageUrl ? (
            <Image src={p.imageUrl} alt="" fill sizes="64px" className="object-cover" />
          ) : (
            <ImageOff className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("flex items-center gap-1.5 font-bold", !p.available && "text-muted")}>
            <span className="truncate">{p.name}</span>
            {p.featured && <Star className="size-4 shrink-0 fill-brand text-brand" aria-label="Destaque" />}
          </p>
          {p.description && <p className="truncate text-sm text-muted">{p.description}</p>}
          <Price p={p} />
        </div>
        <Link
          href={`/painel/${restaurantId}/cardapio/produto/${p.id}`}
          className={buttonClasses("secondary", "sm", "shrink-0")}
          aria-label={`Editar ${p.name}`}
        >
          <Pencil className="size-4" aria-hidden="true" />
          <span className="hidden md:inline">Editar</span>
        </Link>
      </div>

      <div className="flex items-center justify-between gap-1 pl-[4.75rem] sm:pl-0">
        <form action={toggleProduct}>
          {hidden}
          <input type="hidden" name="field" value="available" />
          <SwitchButton checked={p.available} label={p.available ? "Disponível" : "Esgotado"} className="w-36" />
        </form>
        <div className="flex">
          <form action={moveProduct}>
            {hidden}
            <input type="hidden" name="direction" value="up" />
            <Button type="submit" variant="ghost" size="sm" disabled={first} aria-label={`Subir ${p.name}`}>
              <ChevronUp className="size-5" aria-hidden="true" />
            </Button>
          </form>
          <form action={moveProduct}>
            {hidden}
            <input type="hidden" name="direction" value="down" />
            <Button type="submit" variant="ghost" size="sm" disabled={last} aria-label={`Descer ${p.name}`}>
              <ChevronDown className="size-5" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </div>
    </li>
  );
}

export default async function MenuPage({ params }: PageProps<"/painel/[restaurantId]/cardapio">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);

  const categories = await db.menuCategory.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      products: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          priceCents: true,
          promoPriceCents: true,
          available: true,
          featured: true,
        },
      },
    },
  });

  const productCount = categories.reduce((sum, c) => sum + c.products.length, 0);
  const firstCategory = categories[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cardápio"
        description={
          categories.length
            ? `${productCount} produto${productCount === 1 ? "" : "s"} em ${categories.length} categoria${categories.length === 1 ? "" : "s"}. Toque no interruptor quando algo acabar.`
            : "Monte o cardápio em dois passos: crie as categorias e depois os produtos."
        }
        actions={
          firstCategory ? (
            <Link href={`/painel/${restaurant.id}/cardapio/produto/novo?categoria=${firstCategory.id}`} className={buttonClasses("primary")}>
              <Plus className="size-4" aria-hidden="true" />
              Novo produto
            </Link>
          ) : undefined
        }
      />

      <div>
        <NewCategoryButton restaurantId={restaurant.id} highlight={categories.length === 0} />
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={<BookOpen />} title="Seu cardápio está vazio">
          Comece criando uma categoria, por exemplo <strong>Pizzas</strong>, <strong>Lanches</strong> ou{" "}
          <strong>Bebidas</strong>. Depois é só adicionar os produtos dentro dela.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-5">
          {categories.map((c, i) => (
            <CategoryCard
              key={c.id}
              restaurantId={restaurant.id}
              category={{ id: c.id, name: c.name, description: c.description, active: c.active, productCount: c.products.length }}
              first={i === 0}
              last={i === categories.length - 1}
            >
              {c.products.length === 0 ? (
                <p className="px-4 py-5 text-sm text-muted sm:px-5">Nenhum produto nesta categoria ainda.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {c.products.map((p, j) => (
                    <ProductRow key={p.id} restaurantId={restaurant.id} p={p} first={j === 0} last={j === c.products.length - 1} />
                  ))}
                </ul>
              )}
            </CategoryCard>
          ))}
        </div>
      )}
    </div>
  );
}
