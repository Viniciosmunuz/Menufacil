import { CategoryIcon } from "@/lib/category-icons";

// Categorias da plataforma em forma de fichas marcáveis.
export function CategoryPicker({
  categories,
  selected,
}: {
  categories: { id: string; name: string; icon: string | null }[];
  selected: Set<string>;
}) {
  if (categories.length === 0) {
    return <p className="text-sm text-faint">Nenhuma categoria cadastrada ainda.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => (
        <label
          key={c.id}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface-2 px-4 text-sm font-bold text-muted hover:border-line-strong has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40"
        >
          <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={selected.has(c.id)} className="sr-only" />
          <CategoryIcon name={c.icon} className="size-4" />
          {c.name}
        </label>
      ))}
    </div>
  );
}
