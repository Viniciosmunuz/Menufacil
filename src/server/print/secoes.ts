import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import { nomesQuePedemSecao } from "@/lib/nomes-parecidos";

// Quais pratos deste restaurante precisam dizer, na comanda, de que seção
// vieram.
//
// A conta é contra o cardápio inteiro, não contra os itens do pedido: o
// cozinheiro se perde mesmo quando só um dos dois pratos de nome parecido
// está na comanda. Por isso o cardápio todo vem do banco aqui -- são 138
// nomes no Papaléguas, uma consulta curta, e ela acontece uma vez por via.
//
// Dentro de cache() porque a via em JSON pede isto duas vezes no mesmo
// acesso: a rota do navegador e o orderTicket que ela chama.

export const secoesQuePedemDestaque = cache(async (restaurantId: string) => {
  const produtos = await db.product.findMany({
    where: { restaurantId, category: { active: true } },
    select: { name: true, category: { select: { name: true } } },
  });
  return nomesQuePedemSecao(produtos.map((p) => ({ name: p.name, categoryName: p.category.name })));
});
