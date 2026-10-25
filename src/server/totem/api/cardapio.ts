import { db } from "@/lib/db";

// "O cardápio mudou?", respondido com o mínimo possível.
//
// O totem fica horas na mesma tela, e até aqui ele só descobria uma
// mudança ao se recarregar sozinho -- depois de um minuto parado, ou de
// cinco em cinco minutos atrás do cartaz de descanso. Quem esgota um prato
// no painel olha para o tablet e vê o prato ainda à venda, o que é a mesma
// coisa que o sistema não funcionar.
//
// Esta porta existe para fechar essa janela. Ela devolve uma assinatura do
// cardápio -- quando algo mudou pela última vez e quantos itens há -- e o
// totem compara com a que ele carregou. Mudou, ele se renova no primeiro
// momento em que isso não atrapalha ninguém.
//
// É de propósito a consulta mais barata que dá: dois agregados por número,
// sem trazer produto nenhum. O totem pergunta de meio em meio minuto, e
// isso precisa custar quase nada mesmo com dezenas deles no ar.

/** a cara do cardápio agora, para comparar com a de quando a tela abriu */
export async function assinaturaDoCardapio(restaurantId: string) {
  const [restaurante, produtos, categorias, opcoes] = await Promise.all([
    db.restaurant.findUnique({ where: { id: restaurantId }, select: { updatedAt: true } }),
    db.product.aggregate({ where: { restaurantId }, _count: { _all: true }, _max: { updatedAt: true } }),
    db.menuCategory.aggregate({ where: { restaurantId }, _count: { _all: true }, _max: { updatedAt: true } }),
    // as opções (tamanho, sabor, adicional) não guardam quando mudaram:
    // o que as pega é a contagem, porque salvar um produto as recria
    db.productOption.count({ where: { group: { product: { restaurantId } } } }),
  ]);

  const quando = [restaurante?.updatedAt, produtos._max.updatedAt, categorias._max.updatedAt]
    .map((d) => (d ? d.getTime() : 0))
    .reduce((a, b) => Math.max(a, b), 0);

  // a contagem entra porque apagar um item não mexe no updatedAt de ninguém
  return `${quando}:${produtos._count._all}:${categorias._count._all}:${opcoes}`;
}

export async function cardapio(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!slug) return Response.json({ erro: "diga o restaurante" }, { status: 400 });

  const restaurante = await db.restaurant.findUnique({ where: { slug }, select: { id: true } });
  if (!restaurante) return Response.json({ erro: "restaurante não encontrado" }, { status: 404 });

  return Response.json(
    { assinatura: await assinaturaDoCardapio(restaurante.id) },
    { headers: { "cache-control": "no-store" } },
  );
}
