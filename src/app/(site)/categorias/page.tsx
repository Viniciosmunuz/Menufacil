import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { CategoryIcon } from "@/lib/category-icons";
import { listPublicCategories } from "@/server/public/restaurants";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const categories = await listPublicCategories();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Categorias" description="Escolha o que você está com vontade de comer." />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              href={`/restaurantes?categoria=${c.slug}`}
              className="flex h-full flex-col items-center gap-3 rounded-card border border-line bg-surface p-5 text-center hover:border-brand/60"
            >
              <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
                <CategoryIcon name={c.icon} className="size-7" />
              </span>
              <span className="font-extrabold">{c.name}</span>
              <span className="text-sm text-muted">
                {c._count.restaurants} restaurante{c._count.restaurants === 1 ? "" : "s"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
