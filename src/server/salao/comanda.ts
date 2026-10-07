import "server-only";

import { db } from "@/lib/db";

// A comanda de uma mesa, e o cardápio para lançar nela.
//
// Os itens não são lidos de uma tabela de comanda: eles são os itens dos
// pedidos que já foram para a cozinha, agrupados. É o que mantém o salão
// usando o mesmo caminho de pedido, impressão e relatório do delivery, em
// vez de um segundo sistema -- e é o que garante que o total da tela e o
// total do relatório nunca discordem, porque são a mesma soma.

export type ItemDaComanda = {
  id: string;
  nome: string;
  opcoes: string | null;
  observacao: string | null;
  quantidade: number;
  centavos: number;
  /** já saiu na impressora: o que foi para a cozinha não se apaga sem mais */
  enviado: boolean;
};

export type ComandaAberta = {
  id: string;
  mesaId: string;
  numero: number;
  tipo: "MESA" | "BALCAO";
  nome: string | null;
  status: "LIVRE" | "OCUPADA" | "PAGO";
  pessoas: number;
  garcom: string | null;
  abertaAt: Date;
  /** há quantos minutos está aberta; contado no servidor, fora do desenho */
  minutos: number;
  itens: ItemDaComanda[];
  subtotalCents: number;
  descontoCents: number;
  servicoCents: number;
  totalCents: number;
};

export type ProdutoDoCardapio = {
  id: string;
  nome: string;
  centavos: number;
  imagem: string | null;
  disponivel: boolean;
};

export type CategoriaDoCardapio = { id: string; nome: string; produtos: ProdutoDoCardapio[] };

/** a mesa e a comanda aberta nela, se houver */
export async function verMesa(restaurantId: string, mesaId: string, agora = new Date()) {
  const mesa = await db.mesa.findFirst({
    where: { id: mesaId, restaurantId },
    select: {
      id: true,
      numero: true,
      tipo: true,
      nome: true,
      lugares: true,
      comandas: {
        where: { fechadaAt: null },
        orderBy: { abertaAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          pessoas: true,
          abertaAt: true,
          descontoCents: true,
          servicoCents: true,
          garcom: { select: { name: true } },
          orders: {
            where: { status: { not: "CANCELED" } },
            orderBy: { createdAt: "asc" },
            select: {
              printedAt: true,
              items: {
                orderBy: { id: "asc" },
                select: { id: true, productName: true, optionsText: true, notes: true, quantity: true, totalCents: true },
              },
            },
          },
        },
      },
    },
  });
  if (!mesa) return null;

  const c = mesa.comandas[0];
  if (!c) {
    return { mesa: { id: mesa.id, numero: mesa.numero, tipo: mesa.tipo, nome: mesa.nome, lugares: mesa.lugares }, comanda: null };
  }

  const itens: ItemDaComanda[] = c.orders.flatMap((o) =>
    o.items.map((i) => ({
      id: i.id,
      nome: i.productName,
      opcoes: i.optionsText,
      observacao: i.notes,
      quantidade: i.quantity,
      centavos: i.totalCents,
      enviado: o.printedAt !== null,
    })),
  );

  const subtotal = itens.reduce((s, i) => s + i.centavos, 0);

  const comanda: ComandaAberta = {
    id: c.id,
    mesaId: mesa.id,
    numero: mesa.numero,
    tipo: mesa.tipo,
    nome: mesa.nome,
    status: c.status,
    pessoas: c.pessoas,
    garcom: c.garcom?.name ?? null,
    abertaAt: c.abertaAt,
    minutos: Math.max(0, Math.floor((agora.getTime() - c.abertaAt.getTime()) / 60000)),
    itens,
    subtotalCents: subtotal,
    descontoCents: c.descontoCents,
    servicoCents: c.servicoCents,
    totalCents: subtotal + c.servicoCents - c.descontoCents,
  };

  return { mesa: { id: mesa.id, numero: mesa.numero, tipo: mesa.tipo, nome: mesa.nome, lugares: mesa.lugares }, comanda };
}

/**
 * O cardápio para lançar na mesa.
 *
 * É o mesmo catálogo do delivery e do totem -- um produto só, em vários
 * canais. Mudou o preço no Cardápio, mudou aqui, sem segundo cadastro.
 *
 * As seções de acompanhamento ficam de fora da grade principal: elas são
 * opções de prato, não pratos, e apareceriam como itens soltos para o
 * garçom escolher por engano.
 */
export async function cardapioDoSalao(restaurantId: string): Promise<CategoriaDoCardapio[]> {
  const categorias = await db.menuCategory.findMany({
    where: { restaurantId, active: true, addons: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      products: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, priceCents: true, promoPriceCents: true, imageUrl: true, available: true },
      },
    },
  });

  return categorias
    .filter((c) => c.products.length > 0)
    .map((c) => ({
      id: c.id,
      nome: c.name,
      produtos: c.products.map((p) => ({
        id: p.id,
        nome: p.name,
        centavos: p.promoPriceCents ?? p.priceCents,
        imagem: p.imageUrl,
        disponivel: p.available,
      })),
    }));
}
