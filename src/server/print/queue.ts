import "server-only";

import type { PrintRole } from "@/generated/prisma/enums";

import { db } from "@/lib/db";
import { OPEN_ORDER_STATUSES } from "@/lib/labels";
import { pedeSecao } from "@/lib/nomes-parecidos";
import { EXCLUDE_UNPAID } from "@/lib/order-flow";
import { contaLines, contaText, receiptLines, receiptText, ticketLines, ticketText } from "@/lib/ticket";

import { verConta } from "@/server/salao/comanda";

import { divisaoDaImpressora, filtroDeItem, impressoraPrincipal, meuItem } from "./divisao";
import { secoesQuePedemDestaque } from "./secoes";

// A fila do Print Fácil: os pedidos que ainda não saíram no papel daquele
// restaurante. O "printedAt" é a trava contra imprimir duas vezes — o
// programa só marca depois que a impressora aceitou a via.
//
// Um pedido de totem rende dois papéis, em duas impressoras diferentes:
//
// - COMANDA: a cozinha, na impressora do computador do balcão. É a via de
//   sempre, com tudo que o cozinheiro precisa.
// - SENHA: o recibo do cliente, na impressora do próprio tablet. Sai só com
//   o que ele pediu, quanto pagou e a senha.
//
// Cada papel tem a sua trava (printedAt e senhaPrintedAt), então um não
// atrapalha o outro: a cozinha não deixa de receber porque o tablet já
// imprimiu, e nenhum dos dois sai duas vezes. Quem não tem totem continua
// como sempre — toda impressora nasce COMANDA.

/** pedido velho não sai do nada quando o programa liga depois de horas */
const WINDOW_HOURS = 12;
const BATCH = 10;

const ticketSelect = {
  id: true,
  number: true,
  code: true,
  createdAt: true,
  type: true,
  dineIn: true,
  origin: true,
  customerName: true,
  customerWhatsapp: true,
  deliveryStreet: true,
  deliveryNumber: true,
  deliveryComplement: true,
  deliveryNeighborhood: true,
  deliveryReference: true,
  notes: true,
  subtotalCents: true,
  deliveryFeeCents: true,
  totalCents: true,
  paymentMethod: true,
  payment: { select: { cardType: true, changeForCents: true } },
  items: {
    orderBy: { id: "asc" },
    select: {
      productName: true,
      optionsText: true,
      quantity: true,
      totalCents: true,
      notes: true,
      product: { select: { category: { select: { id: true, name: true } } } },
    },
  },
} as const;

/** o que falta sair naquela impressora, conforme o papel dela */
const aindaNaoSaiu = (role: PrintRole) =>
  role === "SENHA"
    ? // a impressora de senha só olha pedido de totem: pedido de delivery
      // não tem senha para o cliente levar
      { origin: "TOTEM" as const, senhaPrintedAt: null }
    : { printedAt: null };

export async function pendingOrders(restaurantId: string, role: PrintRole = "COMANDA", deviceId?: string) {
  const comum = {
    restaurantId,
    status: { in: [...OPEN_ORDER_STATUSES] },
    // 100% Delivery: a via só sai depois que o Mercado Pago confirmou
    ...EXCLUDE_UNPAID,
    createdAt: { gte: new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000) },
  };
  const escolha = { orderBy: { createdAt: "asc" }, take: BATCH, select: { id: true, number: true, createdAt: true, printRuns: true } } as const;

  // o recibo do cliente não se divide: ele é o pedido inteiro, e sai na
  // impressora do próprio tablet
  const divisao = role === "SENHA" || !deviceId ? null : await divisaoDaImpressora(restaurantId, deviceId);

  const pedidos = !divisao?.dividido
    ? await db.order.findMany({ where: { ...comum, ...aindaNaoSaiu(role) }, ...escolha })
    : // no modo dividido a trava é por impressora, e o pedido só entra na
      // fila de quem tem algo para imprimir dele
      await db.order.findMany({
        where: { ...comum, impressoes: { none: { deviceId } }, items: { some: filtroDeItem(divisao) } },
        ...escolha,
      });

  const contas = role === "SENHA" || !deviceId ? [] : await contasPedidas(restaurantId, deviceId);
  return [...contas, ...pedidos];
}

/** o prefixo que distingue a conta de uma mesa de um pedido, na mesma fila */
const CONTA = "conta_";
export const ehConta = (id: string) => id.startsWith(CONTA);
const comandaDe = (id: string) => id.slice(CONTA.length);

/**
 * As contas de mesa que o garçom pediu e ainda não saíram.
 *
 * Entram na mesma fila dos pedidos, com um id marcado, porque assim o
 * programa do balcão imprime a conta sem precisar aprender nada novo: ele
 * continua pedindo a via daquele id e mandando o texto para a impressora.
 *
 * Só na impressora principal: a conta é um papel só, e sai onde o garçom
 * vai buscá-lo.
 */
async function contasPedidas(restaurantId: string, deviceId: string) {
  const principal = await impressoraPrincipal(restaurantId);
  if (principal !== deviceId) return [];

  const comandas = await db.comanda.findMany({
    where: {
      restaurantId,
      contaPedidaAt: { not: null, gte: new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000) },
      contaPrintedAt: null,
    },
    orderBy: { contaPedidaAt: "asc" },
    take: BATCH,
    select: { id: true, contaPedidaAt: true, mesa: { select: { numero: true } } },
  });

  return comandas.map((c) => ({
    id: CONTA + c.id,
    number: c.mesa.numero,
    createdAt: c.contaPedidaAt ?? new Date(),
    printRuns: 0,
  }));
}

/** a via pronta: o mesmo texto que sai pela impressão do navegador */
export async function orderTicket(restaurantId: string, orderId: string, role: PrintRole = "COMANDA", deviceId?: string) {
  if (ehConta(orderId)) return contaTicket(restaurantId, comandaDe(orderId));

  const achado = await db.order.findFirst({
    where: { id: orderId, restaurantId },
    select: { ...ticketSelect, restaurant: { select: { name: true, receiptWidth: true } } },
  });
  if (!achado) return null;

  // no modo dividido, esta impressora leva só o que é dela. Sobrando nada,
  // não há via: o pedido era todo da outra impressora.
  const divisao = role === "SENHA" || !deviceId ? null : await divisaoDaImpressora(restaurantId, deviceId);

  // A via parcial soma só o que está nela: dizer "total R$ 36,90" num papel
  // que tem uma água de R$ 4,00 confunde quem confere, e a taxa de entrega
  // não cabe nos dois papéis.
  const meus = divisao?.dividido ? achado.items.filter((i) => meuItem(divisao, i.product?.category?.id)) : achado.items;
  const soma = meus.reduce((s, i) => s + i.totalCents, 0);
  const order = divisao?.dividido
    ? { ...achado, items: meus, subtotalCents: soma, deliveryFeeCents: 0, totalCents: soma }
    : achado;
  if (order.items.length === 0) return null;

  const paper = order.restaurant.receiptWidth;
  // só pedido de totem tem recibo de cliente; se a impressora de senha
  // pedir a via de um pedido de delivery, sai a comanda normal
  const senha = role === "SENHA" && order.origin === "TOTEM";
  const monta = senha ? { linhas: receiptLines, texto: receiptText } : { linhas: ticketLines, texto: ticketText };
  // quais pratos precisam dizer a seção; o recibo do cliente não leva seção
  const secoes = senha ? undefined : await secoesQuePedemDestaque(restaurantId);

  return {
    id: order.id,
    numero: order.number,
    codigo: order.code,
    criadoEm: order.createdAt.toISOString(),
    // a largura vem do painel: 80 mm por padrão, 58 mm para bobina estreita
    papel_mm: paper,
    // qual dos dois papéis é este, para a térmica dar o destaque certo
    papel: senha ? ("senha" as const) : ("comanda" as const),
    // texto pronto, para a impressora comum do Windows
    texto: monta.texto(order, order.restaurant.name, paper, secoes),
    linhas: monta.linhas(order, order.restaurant.name, paper, secoes),
    // os mesmos dados em partes, para a térmica ESC/POS dar destaque ao
    // número do pedido, ao total e ao que o cliente escreveu
    dados: {
      papel: senha ? ("senha" as const) : ("comanda" as const),
      restaurante: order.restaurant.name,
      numero: order.number,
      criado_em: order.createdAt.toISOString(),
      tipo: order.type,
      origem: order.origin,
      comer_aqui: order.dineIn,
      cliente: { nome: order.customerName, whatsapp: order.customerWhatsapp },
      endereco: {
        rua: order.deliveryStreet,
        numero: order.deliveryNumber,
        complemento: order.deliveryComplement,
        bairro: order.deliveryNeighborhood,
        referencia: order.deliveryReference,
      },
      itens: order.items.map((i) => ({
        quantidade: i.quantity,
        nome: i.productName,
        // A seção entra como a primeira "opção" do item, e não como campo
        // novo, de propósito: o programa do balcão já imprime a lista de
        // opções, então a seção aparece na comanda sem ninguém precisar
        // atualizar o Menu Fácil para PC nem o aplicativo do totem.
        opcoes: [
          ...(i.product?.category?.name && pedeSecao(secoes, i.productName)
            ? [`[${i.product.category.name.toUpperCase()}]`]
            : []),
          ...(i.optionsText ?? "").split(" · ").filter(Boolean),
        ],
        observacao: i.notes,
        total_centavos: i.totalCents,
      })),
      subtotal_centavos: order.subtotalCents,
      entrega_centavos: order.deliveryFeeCents,
      total_centavos: order.totalCents,
      pagamento: {
        forma: order.paymentMethod,
        cartao: order.payment?.cardType ?? null,
        troco_para_centavos: order.payment?.changeForCents ?? null,
      },
      observacao: order.notes,
    },
  };
}

/** só marca quem ainda não estava marcado: dois programas não duplicam a via */
export async function markOrderPrinted(restaurantId: string, orderId: string, role: PrintRole = "COMANDA", deviceId?: string) {
  const agora = new Date();

  if (ehConta(orderId)) {
    const { count } = await db.comanda.updateMany({
      where: { id: comandaDe(orderId), restaurantId, contaPrintedAt: null },
      data: { contaPrintedAt: agora },
    });
    return { marcado: count > 0 };
  }

  const divisao = role === "SENHA" || !deviceId ? null : await divisaoDaImpressora(restaurantId, deviceId);

  if (divisao?.dividido && deviceId) {
    // a trava desta impressora. O createMany ignora repetição por causa do
    // índice único, então dois programas apontando para o mesmo papel não
    // duplicam a via nem derrubam um ao outro.
    const { count } = await db.orderPrint.createMany({ data: [{ orderId, deviceId }], skipDuplicates: true });
    // o painel continua dizendo "impresso" na primeira via que sai: quem
    // olha a lista quer saber se o papel chegou na cozinha, não em quantas
    // impressoras ele passou
    if (count > 0) {
      await db.order.updateMany({ where: { id: orderId, restaurantId, printedAt: null }, data: { printedAt: agora } });
    }
    return { marcado: count > 0 };
  }

  const { count } = await db.order.updateMany({
    where: { id: orderId, restaurantId, ...aindaNaoSaiu(role) },
    data: role === "SENHA" ? { senhaPrintedAt: agora } : { printedAt: agora },
  });
  return { marcado: count > 0 };
}

/**
 * A via da conta de uma mesa, no mesmo formato do pedido.
 *
 * O programa do balcão não sabe que isto é uma conta, e não precisa saber:
 * ele recebe texto e linhas como sempre, e manda para a impressora.
 */
async function contaTicket(restaurantId: string, comandaId: string) {
  const [conta, restaurant] = await Promise.all([
    verConta(restaurantId, comandaId),
    db.restaurant.findUnique({ where: { id: restaurantId }, select: { name: true, receiptWidth: true } }),
  ]);
  if (!conta || !restaurant) return null;

  const paper = restaurant.receiptWidth;
  const linhas = contaLines(conta, restaurant.name, paper);

  return {
    id: CONTA + comandaId,
    numero: 0,
    codigo: conta.rotulo,
    criadoEm: new Date().toISOString(),
    papel_mm: paper,
    papel: "comanda" as const,
    texto: contaText(conta, restaurant.name, paper),
    linhas,
    // a térmica recebe a conta já montada em linhas; os campos separados
    // existem para o destaque do número e do total, e numa conta o destaque
    // é o total, que já está no texto
    dados: {
      papel: "comanda" as const,
      restaurante: restaurant.name,
      numero: 0,
      criado_em: new Date().toISOString(),
      tipo: "PICKUP" as const,
      origem: "SALAO" as const,
      comer_aqui: true,
      cliente: { nome: conta.rotulo, whatsapp: "" },
      endereco: { rua: null, numero: null, complemento: null, bairro: null, referencia: null },
      itens: conta.itens.map((i) => ({
        quantidade: i.quantidade,
        nome: i.nome,
        opcoes: (i.opcoes ?? "").split(" · ").filter(Boolean),
        observacao: i.observacao,
        total_centavos: i.centavos,
      })),
      subtotal_centavos: conta.subtotalCents,
      entrega_centavos: 0,
      total_centavos: conta.totalCents,
      pagamento: { forma: "CASH" as const, cartao: null, troco_para_centavos: null },
      observacao: null,
    },
  };
}
