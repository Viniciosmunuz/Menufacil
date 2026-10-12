import "server-only";

import { db } from "@/lib/db";

// De onde sai cada coisa.
//
// Restaurante com uma impressora só não tem o que decidir: o pedido
// inteiro sai no balcão, e é assim que tudo funcionou até aqui. Quem tem
// duas -- a da cozinha e a do bar -- precisa que a bebida saia num lugar e
// o prato no outro, senão alguém atravessa o salão com o papel na mão toda
// vez.
//
// A escolha é por seção do cardápio, e não por produto: é assim que o dono
// pensa o cardápio ("Bebidas sai no bar"), e um produto novo já nasce
// sabendo para onde vai.
//
// Enquanto nenhuma seção tiver impressora escolhida, nada disto entra em
// cena: a fila, a via e a trava continuam as de sempre. É o que mantém a
// impressão de quem já usa o sistema exatamente como está hoje.

/** o que esta impressora leva do cardápio */
export type Divisao = {
  /** o restaurante dividiu a impressão entre impressoras? */
  dividido: boolean;
  /** alguma seção foi escolhida para esta impressora */
  souDestino: boolean;
  /** seções desta impressora */
  minhas: string[];
  /** seções de outra impressora: o que a impressora do balcão não leva */
  deOutros: string[];
};

export async function divisaoDaImpressora(restaurantId: string, deviceId: string): Promise<Divisao> {
  const atribuidas = await db.menuCategory.findMany({
    where: { restaurantId, printDeviceId: { not: null } },
    select: { id: true, printDeviceId: true },
  });

  const minhas = atribuidas.filter((c) => c.printDeviceId === deviceId).map((c) => c.id);
  const deOutros = atribuidas.filter((c) => c.printDeviceId !== deviceId).map((c) => c.id);

  return { dividido: atribuidas.length > 0, souDestino: minhas.length > 0, minhas, deOutros };
}

/**
 * O filtro de item desta impressora, para o Prisma.
 *
 * A impressora que não é destino de nenhuma seção recebe o resto: o que
 * não foi atribuído a ninguém tem de sair em algum lugar, e o balcão é o
 * lugar de sempre. É também o que faz uma seção criada depois da
 * configuração -- ou um produto sem seção -- nunca ficar sem impressora.
 */
export function filtroDeItem(d: Divisao) {
  if (d.souDestino) return { product: { categoryId: { in: d.minhas } } };
  return { OR: [{ productId: null }, { product: { categoryId: { notIn: d.deOutros } } }] };
}

/** a mesma regra aplicada a itens já lidos do banco */
export function meuItem(d: Divisao, categoriaId: string | null | undefined) {
  if (d.souDestino) return categoriaId !== null && categoriaId !== undefined && d.minhas.includes(categoriaId);
  return categoriaId === null || categoriaId === undefined || !d.deOutros.includes(categoriaId);
}
