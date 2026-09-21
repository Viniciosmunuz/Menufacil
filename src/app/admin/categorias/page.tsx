import { Tags } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/auth/dal";

import { CategoryRow, NewCategoryForm } from "./category-form";

export const metadata: Metadata = { title: "Categorias" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await db.platformCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, icon: true, active: true, _count: { select: { restaurants: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorias"
        description="Os filtros da página inicial (Lanches, Pizzas, Bebidas...). A ordem aqui é a ordem no site."
      />
      <NewCategoryForm />
      {categories.length === 0 ? (
        <EmptyState icon={<Tags />} title="Nenhuma categoria ainda">
          Crie as categorias que aparecem como filtro na página inicial.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {categories.map((c, i) => (
            <CategoryRow
              key={c.id}
              category={{ ...c, restaurants: c._count.restaurants }}
              first={i === 0}
              last={i === categories.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
