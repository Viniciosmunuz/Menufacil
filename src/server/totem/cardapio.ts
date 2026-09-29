import "server-only";

import { db } from "@/lib/db";
import { appUrl } from "@/lib/site";

// O cardápio do jeito que o totem precisa: só o que dá para pedir ali.
//
// Fica de fora o que não cabe numa tela de toque de 7 polegadas nem faz
// sentido no balcão: produto esgotado, categoria desligada e a pizza
// montada por sabores (que tem tela própria no cardápio do link).
//
// É consulta própria, e não a do site, porque as duas telas mudam por
// motivos diferentes: mexer no totem não pode mudar o que o cliente vê
// pelo link do restaurante.

export type ProdutoDoTotem = {
  id: string;
  nome: string;
  descricao: string | null;
  foto: string | null;
  preco_centavos: number;
  /** o produto em destaque ganha estrela, igual ao cardápio do link */
  destaque: boolean;
  grupos: {
    id: string;
    nome: string;
    minimo: number;
    maximo: number;
    opcoes: { id: string; nome: string; preco_centavos: number }[];
  }[];
};

export type CategoriaDoTotem = { id: string; nome: string; produtos: ProdutoDoTotem[] };

/**
 * A foto sai com o endereço inteiro: no totem a tela é um arquivo local, e
 * um caminho começando em "/" apontaria para dentro do próprio aplicativo.
 */
function comEndereco(caminho: string | null) {
  if (!caminho) return null;
  return caminho.startsWith("/") ? `${appUrl()}${caminho}` : caminho;
}

export async function cardapioDoTotem(restaurantId: string): Promise<CategoriaDoTotem[]> {
  const categorias = await db.menuCategory.findMany({
    where: { restaurantId, active: true, pizzaFlavors: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      products: {
        // produto de pizza montada por sabores tem tela própria no cardápio
        // do link; no totem ele ainda não existe
        where: { available: true, OR: [{ pizzaFlavors: null }, { pizzaFlavors: 0 }] },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          featured: true,
          priceCents: true,
          promoPriceCents: true,
          optionGroups: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              minSelect: true,
              maxSelect: true,
              options: {
                where: { available: true },
                orderBy: { sortOrder: "asc" },
                select: { id: true, name: true, priceCents: true },
              },
            },
          },
        },
      },
    },
  });

  return categorias
    .map((c) => ({
      id: c.id,
      nome: c.name,
      produtos: c.products.map((p) => ({
        id: p.id,
        nome: p.name,
        descricao: p.description,
        foto: comEndereco(p.imageUrl),
        preco_centavos: p.promoPriceCents ?? p.priceCents,
        destaque: p.featured,
        grupos: p.optionGroups.map((g) => ({
          id: g.id,
          nome: g.name,
          minimo: g.minSelect,
          maximo: g.maxSelect,
          opcoes: g.options.map((o) => ({ id: o.id, nome: o.name, preco_centavos: o.priceCents })),
        })),
      })),
    }))
    .filter((c) => c.produtos.length > 0);
}
