import { ArrowDown, ArrowUp, BookOpen, ImageOff, Plus, Star } from "lucide-react";
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

import { moveProduct, toggleProduct, toggleProductOption } from "./actions";
import { BuscaDeProdutos, type ProdutoDaBusca } from "./busca";
import { CardapioLayout, type CategoriaResumo } from "./cardapio-layout";
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
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-extrabold text-brand">{formatCents(p.promoPriceCents)}</span>
        <s className="text-xs text-faint">{formatCents(p.priceCents)}</s>
      </span>
    );
  }
  return <span className="text-sm font-extrabold">{formatCents(p.priceCents)}</span>;
}

/**
 * A linha de um produto.
 *
 * Ela era alta: foto de 64px, nome, descrição, preço, um botão "Editar"
 * escrito e, embaixo, o interruptor com as duas setas. Dois produtos por
 * tela de celular, num cardápio de cento e quarenta.
 *
 * Agora o nome inteiro é o link da edição -- o botão escrito saiu, não a
 * ação -- e o interruptor, que é o que mais se toca no meio do movimento,
 * fica do lado. A descrição sai da lista: ela pertence à edição e ao
 * cardápio do cliente, não a conferir o que acabou.
 *
 * Os dois atributos são o que o filtro da casca enxerga pelo CSS, sem
 * precisar que esta lista vire componente de cliente.
 */
function ProductRow({ restaurantId, p, first, last }: { restaurantId: string; p: Product; first: boolean; last: boolean }) {
  const hidden = (
    <>
      <input type="hidden" name="restaurantId" value={restaurantId} />
      <input type="hidden" name="id" value={p.id} />
    </>
  );
  return (
    <li
      id={`produto-${p.id}`}
      data-esgotado={p.available ? "nao" : "sim"}
      data-sem-foto={p.imageUrl ? "nao" : "sim"}
      className={cn("flex items-center gap-2 px-2.5 py-2", !p.available && "bg-warning/8")}
    >
      <Link
        href={`/painel/${restaurantId}/cardapio/produto/${p.id}`}
        aria-label={`Editar ${p.name}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-control p-1 transition-colors hover:bg-surface-2"
      >
        <span
          className={cn(
            "relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-control bg-surface-3 text-faint",
            !p.available && "opacity-60",
          )}
        >
          {p.imageUrl ? (
            <Image src={p.imageUrl} alt="" fill sizes="48px" className="object-cover" />
          ) : (
            <ImageOff className="size-4" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("flex items-start gap-1.5 text-sm leading-tight font-bold", !p.available && "text-muted")}>
            <span className="min-w-0 flex-1">{p.name}</span>
            {p.featured && <Star className="mt-0.5 size-3.5 shrink-0 fill-brand text-brand" aria-label="Destaque" />}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Price p={p} />
            {!p.available && (
              <span className="rounded-full bg-warning/15 px-1.5 text-[0.65rem] font-extrabold text-warning">esgotado</span>
            )}
          </span>
        </span>
      </Link>

      <form action={toggleProduct} className="shrink-0">
        {hidden}
        <input type="hidden" name="field" value="available" />
        <SwitchButton checked={p.available} label={p.available ? "Disponível" : "Esgotado"} className="w-32" />
      </form>

      {/* a ordem do cardápio: discreta, porque se mexe nela uma vez e
          depois não se mexe mais */}
      <div className="hidden shrink-0 flex-col sm:flex">
        <form action={moveProduct}>
          {hidden}
          <input type="hidden" name="direction" value="up" />
          <Button type="submit" variant="ghost" size="sm" disabled={first} aria-label={`Subir ${p.name}`} className="min-h-7 px-1.5">
            <ArrowUp className="size-3.5" aria-hidden="true" />
          </Button>
        </form>
        <form action={moveProduct}>
          {hidden}
          <input type="hidden" name="direction" value="down" />
          <Button type="submit" variant="ghost" size="sm" disabled={last} aria-label={`Descer ${p.name}`} className="min-h-7 px-1.5">
            <ArrowDown className="size-3.5" aria-hidden="true" />
          </Button>
        </form>
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
          // sabores e tamanhos: a busca liga e desliga cada um sem abrir a
          // edição do produto
          optionGroups: {
            orderBy: { sortOrder: "asc" },
            select: {
              name: true,
              options: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, available: true } },
            },
          },
        },
      },
    },
  });

  const productCount = categories.reduce((sum, c) => sum + c.products.length, 0);
  const firstCategory = categories[0];

  // o que a casca precisa para montar os filtros e a coluna das categorias
  const resumo: CategoriaResumo[] = categories.map((c) => ({
    id: c.id,
    nome: c.name,
    produtos: c.products.length,
    esgotados: c.products.filter((p) => !p.available).length,
    semFoto: c.products.filter((p) => !p.imageUrl).length,
    escondida: !c.active,
  }));

  // a lista reta que a busca filtra no aparelho: leve de propósito, só o
  // que a linha do resultado mostra
  const paraBusca: ProdutoDaBusca[] = categories.flatMap((c) =>
    c.products.map((p) => ({
      id: p.id,
      name: p.name,
      categoria: c.name,
      priceCents: p.priceCents,
      promoPriceCents: p.promoPriceCents,
      available: p.available,
      // grupo de uma opção só não é escolha: "Tamanho: Único" não serve
      // para nada na tela e só rouba espaço dos sabores que importam
      grupos: p.optionGroups
        .filter((g) => g.options.length > 1)
        .map((g) => ({ nome: g.name, opcoes: g.options.map((o) => ({ id: o.id, nome: o.name, available: o.available })) })),
    })),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Cardápio"
        description={
          categories.length
            ? `${productCount} produto${productCount === 1 ? "" : "s"} em ${categories.length} categoria${categories.length === 1 ? "" : "s"}. Toque no interruptor quando algo acabar.`
            : "Monte o cardápio em dois passos: crie as categorias e depois os produtos."
        }
      />

      {/* Os dois botões dividem uma linha no celular.

          Empilhados, eles empurravam a busca e a primeira categoria para
          fora da tela: quem abria o cardápio via dois botões de criar coisa
          antes de ver o cardápio. Lado a lado, sobra tela para o que a
          pessoa veio fazer. O de criar categoria vira um formulário de
          largura inteira quando abre, e aí ele toma a linha sozinho. */}
      <div className="flex flex-wrap items-start gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
        {firstCategory && (
          <Link
            href={`/painel/${restaurant.id}/cardapio/produto/novo?categoria=${firstCategory.id}`}
            className={buttonClasses("primary")}
          >
            <Plus className="size-4" aria-hidden="true" />
            Novo produto
          </Link>
        )}
        <NewCategoryButton restaurantId={restaurant.id} highlight={categories.length === 0} />
      </div>

      {categories.length === 0 ? (
        <EmptyState icon={<BookOpen />} title="Seu cardápio está vazio">
          Comece criando uma categoria, por exemplo <strong>Pizzas</strong>, <strong>Lanches</strong> ou{" "}
          <strong>Bebidas</strong>. Depois é só adicionar os produtos dentro dela.
        </EmptyState>
      ) : (
        <BuscaDeProdutos
          produtos={paraBusca}
          restaurantId={restaurant.id}
          toggleAction={toggleProduct}
          toggleOptionAction={toggleProductOption}
        >
          <CardapioLayout categorias={resumo}>
            {categories.map((c, i) => (
              <CategoryCard
                key={c.id}
                restaurantId={restaurant.id}
                category={{ id: c.id, name: c.name, description: c.description, active: c.active, addons: c.addons, somenteSalao: c.somenteSalao, productCount: c.products.length, esgotados: c.products.filter((p) => !p.available).length }}
                first={i === 0}
                last={i === categories.length - 1}
              >
                {c.products.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-muted">Nenhum produto nesta categoria ainda.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {c.products.map((p, j) => (
                      <ProductRow key={p.id} restaurantId={restaurant.id} p={p} first={j === 0} last={j === c.products.length - 1} />
                    ))}
                  </ul>
                )}
              </CategoryCard>
            ))}
          </CardapioLayout>
        </BuscaDeProdutos>
      )}
    </div>
  );
}
