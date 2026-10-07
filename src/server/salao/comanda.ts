import "server-only";

import { db } from "@/lib/db";
import { NOME_DA_FORMA, type FormaNaMesa, type PagamentoNaMesa } from "@/server/salao/pagamento";

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
  /** cada recebimento, com a forma de quem pagou */
  pagamentos: PagamentoNaMesa[];
  pagoCents: number;
  /** quanto ainda falta receber; zero quer dizer mesa pronta para liberar */
  faltaCents: number;
};

export type OpcaoDoProduto = { id: string; nome: string; centavos: number; disponivel: boolean };
export type GrupoDoProduto = {
  id: string;
  nome: string;
  /** escolher é obrigatório (tamanho) ou não (adicionais) */
  obrigatorio: boolean;
  /** quantas opções o garçom pode marcar */
  maximo: number;
  opcoes: OpcaoDoProduto[];
};

export type ProdutoDoCardapio = {
  id: string;
  nome: string;
  centavos: number;
  imagem: string | null;
  disponivel: boolean;
  /** tamanho, sabor, adicionais: os mesmos do cardápio do cliente */
  grupos: GrupoDoProduto[];
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
          pagamentos: {
            orderBy: { createdAt: "asc" },
            select: { id: true, forma: true, centavos: true, createdAt: true, recebidoPor: { select: { name: true } } },
          },
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

  const dadosDaMesa = { id: mesa.id, numero: mesa.numero, tipo: mesa.tipo, nome: mesa.nome, lugares: mesa.lugares };
  const c = mesa.comandas[0];

  // Mesa livre devolve uma comanda vazia, não nada.
  //
  // Ninguém "abre mesa" como passo separado: o garçom toca na mesa, cai no
  // cardápio e lança -- e a comanda de verdade nasce no banco nesse
  // momento. Uma tela de "abrir mesa" no meio seria um toque para dizer o
  // que o próximo toque já diz.
  if (!c) {
    return {
      mesa: dadosDaMesa,
      comanda: {
        id: "",
        mesaId: mesa.id,
        numero: mesa.numero,
        tipo: mesa.tipo,
        nome: mesa.nome,
        status: "LIVRE" as const,
        pessoas: 0,
        garcom: null,
        abertaAt: agora,
        minutos: 0,
        itens: [],
        subtotalCents: 0,
        descontoCents: 0,
        servicoCents: 0,
        totalCents: 0,
        pagamentos: [],
        pagoCents: 0,
        faltaCents: 0,
      },
    };
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
  const total = subtotal + c.servicoCents - c.descontoCents;

  const pagamentos: PagamentoNaMesa[] = c.pagamentos.map((p) => ({
    id: p.id,
    forma: p.forma as FormaNaMesa,
    nomeDaForma: NOME_DA_FORMA[p.forma as FormaNaMesa],
    centavos: p.centavos,
    recebidoPor: p.recebidoPor?.name ?? null,
    createdAt: p.createdAt,
  }));
  const pago = pagamentos.reduce((s, p) => s + p.centavos, 0);

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
    totalCents: total,
    pagamentos,
    pagoCents: pago,
    faltaCents: Math.max(0, total - pago),
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
        select: {
          id: true,
          name: true,
          priceCents: true,
          promoPriceCents: true,
          imageUrl: true,
          available: true,
          // as mesmas opções do cardápio do cliente: um produto só, vários
          // canais -- o garçom escolhe o tamanho e os adicionais iguais a
          // quem pede pelo link
          optionGroups: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              minSelect: true,
              maxSelect: true,
              options: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, priceCents: true, available: true } },
            },
          },
        },
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
        grupos: p.optionGroups
          .filter((g) => g.options.length > 0)
          .map((g) => ({
            id: g.id,
            nome: g.name,
            obrigatorio: g.minSelect > 0,
            maximo: Math.max(1, g.maxSelect),
            opcoes: g.options.map((o) => ({ id: o.id, nome: o.name, centavos: o.priceCents, disponivel: o.available })),
          })),
      })),
    }));
}

/**
 * A conta da mesa, pelo id da comanda, para sair no papel.
 *
 * É a mesma soma da tela -- os itens dos pedidos que já foram para a
 * cozinha --, lida por outro caminho porque quem imprime tem o número da
 * comanda na mão, não o da mesa. O cliente pede "a conta", e o que ele
 * confere é esta folha.
 */
export async function verConta(restaurantId: string, comandaId: string) {
  const c = await db.comanda.findFirst({
    where: { id: comandaId, restaurantId },
    select: {
      id: true,
      abertaAt: true,
      fechadaAt: true,
      pessoas: true,
      servicoCents: true,
      descontoCents: true,
      garcom: { select: { name: true } },
      mesa: { select: { numero: true, tipo: true, nome: true } },
      pagamentos: { orderBy: { createdAt: "asc" }, select: { forma: true, centavos: true } },
      orders: {
        where: { status: { not: "CANCELED" } },
        orderBy: { createdAt: "asc" },
        select: {
          number: true,
          items: { orderBy: { id: "asc" }, select: { productName: true, optionsText: true, notes: true, quantity: true, totalCents: true } },
        },
      },
    },
  });
  if (!c) return null;

  const itens = c.orders.flatMap((o) =>
    o.items.map((i) => ({
      nome: i.productName,
      opcoes: i.optionsText,
      observacao: i.notes,
      quantidade: i.quantity,
      centavos: i.totalCents,
    })),
  );

  const subtotal = itens.reduce((s, i) => s + i.centavos, 0);
  const total = subtotal + c.servicoCents - c.descontoCents;
  const pago = c.pagamentos.reduce((s, p) => s + p.centavos, 0);

  return {
    abertaAt: c.abertaAt,
    fechadaAt: c.fechadaAt,
    pessoas: c.pessoas,
    garcom: c.garcom?.name ?? null,
    rotulo: (c.mesa.tipo === "BALCAO" ? "Balcão" : "Mesa") + " " + c.mesa.numero,
    nomeDaMesa: c.mesa.nome,
    itens,
    subtotalCents: subtotal,
    servicoCents: c.servicoCents,
    descontoCents: c.descontoCents,
    totalCents: total,
    pagamentos: c.pagamentos.map((p) => ({ forma: NOME_DA_FORMA[p.forma as FormaNaMesa], centavos: p.centavos })),
    pagoCents: pago,
    faltaCents: Math.max(0, total - pago),
  };
}
