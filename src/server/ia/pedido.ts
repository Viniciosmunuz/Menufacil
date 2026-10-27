import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { db } from "@/lib/db";
import { formatCents, formatTime, normalizePhone } from "@/lib/format";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/labels";
import { paymentText } from "@/lib/payment";
import { formatPixKey, pixKeyTypeLabel } from "@/lib/pix";
import { appUrl } from "@/lib/site";
import { OrderError, checkoutSchema, parseItems, placeOrder, prepararPedido } from "@/server/orders/place-order";
import { pixDoPedido } from "@/server/pagamentos/pix";

// O Menu Fácil IA anotando pedido e ajudando com o Pix.
//
// Só existe quando o admin liga "IA faz pedidos" no restaurante. A IA não
// grava nada por conta própria: ela chama estas ferramentas, e cada uma
// passa pelo mesmo caminho do site.
//
// As travas que não dependem do modelo obedecer:
//
// - **O preço é do sistema.** A IA manda só códigos de produto e de opção;
//   valores, taxa, mínimo e disponibilidade saem de `prepararPedido`, a
//   mesma conferência do site.
// - **Cria só o que o cliente viu.** `conferir_pedido` guarda o pedido e
//   devolve o resumo; `criar_pedido` não recebe pedido nenhum -- cria o
//   guardado, e só depois que o cliente mandou mensagem nova depois do
//   resumo.
// - **O pedido é do número que está conversando.** O telefone vem do
//   WhatsApp, não do que a IA escreveu.
// - **Pagamento nunca é dado como feito.** A IA manda o Pix e pede o
//   comprovante; quem confirma é o Mercado Pago (100% Delivery) ou o
//   restaurante, no painel.

/** quanto tempo o resumo vale para o cliente dizer "sim" */
const RASCUNHO_VALE_MIN = 30;
/** até quando um pedido é "o pedido de hoje" para a IA procurar */
const JANELA_DE_BUSCA_H = 12;

export type ContextoDoPedido = {
  restaurantId: string;
  slug: string;
  /** o telefone ou o id da Meta: é a chave da conversa */
  contato: string;
  /** o telefone de quem conversa; sem ele não há pedido */
  telefone: string | null;
};

export type ResultadoDaFerramenta = {
  /** o que volta para a IA ler */
  texto: string;
  erro?: boolean;
  /** mensagens mandadas ao cliente do jeito que estão, depois da resposta da IA (o código do Pix, a chave) */
  anexos?: string[];
};

// ─── as ferramentas, do jeito que a IA as vê ──────────────────────────

const itemSchema = {
  type: "object",
  properties: {
    produto_id: { type: "string", description: "código do produto, entre colchetes no cardápio" },
    quantidade: { type: "integer", minimum: 1 },
    opcoes: { type: "array", items: { type: "string" }, description: "códigos das opções escolhidas (tamanho, ponto, sabor...)" },
    sabores: { type: "array", items: { type: "string" }, description: "só pizza montada: códigos dos sabores" },
    acompanhamentos: {
      type: "array",
      description: "só prato que aceita acompanhamentos",
      items: {
        type: "object",
        properties: { produto_id: { type: "string" }, quantidade: { type: "integer", minimum: 1 } },
        required: ["produto_id", "quantidade"],
      },
    },
    observacao: { type: "string", description: "ex.: sem cebola" },
  },
  required: ["produto_id", "quantidade"],
} as const;

export const FERRAMENTAS_DE_PEDIDO: Anthropic.Beta.BetaTool[] = [
  {
    name: "conferir_pedido",
    description:
      "Confere o pedido no sistema e devolve o resumo com o total calculado. Não cria nada. Use quando tiver itens, entrega ou retirada, endereço (se entrega), pagamento e nome. Mande o resumo ao cliente e pergunte se confirma.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "nome do cliente" },
        tipo: { type: "string", enum: ["ENTREGA", "RETIRADA"] },
        rua: { type: "string" },
        numero: { type: "string", description: "número da casa, ou s/n" },
        complemento: { type: "string" },
        bairro: { type: "string" },
        referencia: { type: "string", description: "ponto de referência; obrigatório na entrega" },
        pagamento: { type: "string", enum: ["PIX", "CARTAO", "DINHEIRO"] },
        cartao: { type: "string", enum: ["CREDITO", "DEBITO"], description: "só no cartão" },
        troco_para: { type: "string", description: "só no dinheiro, quando precisa de troco: o valor, ex.: 100,00" },
        observacoes: { type: "string" },
        itens: { type: "array", items: itemSchema, minItems: 1 },
      },
      required: ["nome", "tipo", "pagamento", "itens"],
    },
  },
  {
    name: "criar_pedido",
    description:
      "Cria o último pedido conferido com conferir_pedido. Só use depois que o cliente respondeu, numa mensagem nova, que confirma o resumo.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "buscar_pedidos",
    description:
      "Procura os pedidos de hoje deste cliente pelo número do WhatsApp dele. Se não achar, chame de novo com o nome que o cliente usou no pedido.",
    input_schema: {
      type: "object",
      properties: { nome: { type: "string", description: "só quando a busca pelo número não achou nada" } },
    },
  },
  {
    name: "mandar_pix",
    description:
      "Manda ao cliente o Pix de um pedido de hoje que ainda não foi pago. Use depois de confirmar com o cliente o número e o total do pedido.",
    input_schema: {
      type: "object",
      properties: { numero_pedido: { type: "integer", description: "o número do pedido, ex.: 12" } },
      required: ["numero_pedido"],
    },
  },
];

// ─── execução ─────────────────────────────────────────────────────────

const erro = (texto: string): ResultadoDaFerramenta => ({ texto, erro: true });

/**
 * O telefone do WhatsApp no formato do site.
 *
 * O WhatsApp ainda manda muito celular brasileiro sem o 9 da frente
 * (5592 8123-4567); o site grava com ele. Sem acertar isso, o pedido do
 * site não seria achado pelo número da conversa.
 */
function telefoneDoSite(telefone: string) {
  const d = normalizePhone(telefone);
  return /^55\d{2}[6-9]\d{7}$/.test(d) ? `${d.slice(0, 4)}9${d.slice(4)}` : d;
}

/** o mesmo número com e sem o 9, para achar pedido gravado de qualquer jeito */
function variantes(telefone: string) {
  const d = telefoneDoSite(telefone);
  const sem9 = /^55\d{2}9\d{8}$/.test(d) ? `${d.slice(0, 4)}${d.slice(5)}` : null;
  return sem9 ? [d, sem9] : [d];
}

const texto = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined);
const lista = (v: unknown) => (Array.isArray(v) ? v : []);

/** traduz o pedido da IA para o formato do formulário do site */
function paraOCheckout(entrada: Record<string, unknown>, telefone: string) {
  const pagamento = texto(entrada.pagamento);
  const metodo = pagamento === "CARTAO" ? "CARD" : pagamento === "DINHEIRO" ? "CASH" : pagamento;
  const troco = texto(entrada.troco_para)?.trim();
  const tipo = texto(entrada.tipo);
  const cartao = texto(entrada.cartao);
  const checkout = {
    customerName: texto(entrada.nome),
    customerWhatsapp: telefoneDoSite(telefone),
    type: tipo === "ENTREGA" ? "DELIVERY" : tipo === "RETIRADA" ? "PICKUP" : tipo,
    street: texto(entrada.rua),
    number: texto(entrada.numero),
    complement: texto(entrada.complemento),
    neighborhood: texto(entrada.bairro),
    reference: texto(entrada.referencia),
    notes: texto(entrada.observacoes),
    paymentMethod: metodo,
    cardType: cartao === "CREDITO" ? "CREDIT" : cartao === "DEBITO" ? "DEBIT" : undefined,
    needsChange: metodo === "CASH" ? (troco ? "sim" : "nao") : undefined,
    changeFor: metodo === "CASH" ? troco : undefined,
  };
  const itens = lista(entrada.itens).map((bruto) => {
    const i = (bruto ?? {}) as Record<string, unknown>;
    return {
      productId: texto(i.produto_id),
      quantity: Number(i.quantidade),
      notes: texto(i.observacao) ?? "",
      optionIds: lista(i.opcoes),
      flavorIds: lista(i.sabores),
      addons: lista(i.acompanhamentos).map((a) => {
        const x = (a ?? {}) as Record<string, unknown>;
        return { productId: texto(x.produto_id), quantity: Number(x.quantidade) };
      }),
    };
  });
  return { checkout, itens };
}

/** confere com as regras do site; devolve o pedido pronto para criar ou o primeiro problema */
async function conferir(slug: string, dados: { checkout: unknown; itens: unknown }) {
  const input = checkoutSchema.safeParse(dados.checkout);
  if (!input.success) return { problema: input.error.issues[0]?.message ?? "Pedido incompleto." } as const;
  try {
    const items = parseItems(dados.itens);
    const preparado = await prepararPedido({ slug, input: input.data, items });
    return { input: input.data, items, preparado } as const;
  } catch (e) {
    if (e instanceof OrderError) return { problema: e.message } as const;
    throw e;
  }
}

async function conferirPedido(ctx: ContextoDoPedido, entrada: Record<string, unknown>): Promise<ResultadoDaFerramenta> {
  if (!ctx.telefone) return erro("Sem o número do cliente não dá para anotar. Mande o link do cardápio.");
  const dados = paraOCheckout(entrada, ctx.telefone);
  const r = await conferir(ctx.slug, dados);
  if ("problema" in r) return erro(`O sistema não aceitou o pedido: ${r.problema} Acerte com o cliente e confira de novo.`);

  const { input, preparado: p } = r;
  const linhas = p.lines.map(
    (l) => `${l.quantity}x ${l.productName}${l.optionsText ? ` (${l.optionsText})` : ""}${l.notes ? ` — obs.: ${l.notes}` : ""} — ${formatCents(l.totalCents)}`,
  );
  const entrega =
    p.type === "DELIVERY"
      ? `Entrega em: ${input.street}, ${input.number}${input.complement ? ` (${input.complement})` : ""} - ${input.neighborhood}. Ref.: ${input.reference}`
      : "Retirada no restaurante";
  const pagamento = `${paymentText({ method: p.method, cardType: input.cardType ?? null, changeForCents: p.changeForCents })}${
    p.method === "CARD" ? (p.type === "DELIVERY" ? " na entrega" : " na retirada") : ""
  }`;
  const resumo = [
    `Pedido de ${input.customerName}`,
    ...linhas,
    `Subtotal: ${formatCents(p.subtotalCents)}`,
    ...(p.type === "DELIVERY" ? [`Taxa de entrega: ${p.deliveryFeeCents > 0 ? formatCents(p.deliveryFeeCents) : "grátis"}`] : []),
    `Total: ${formatCents(p.totalCents)}`,
    entrega,
    `Pagamento: ${pagamento}`,
    ...(input.notes ? [`Observações: ${input.notes}`] : []),
  ].join("\n");

  // um rascunho por conversa: conferir de novo troca o anterior, e o
  // relógio do "sim" recomeça
  await db.iaRascunho.upsert({
    where: { restaurantId_contato: { restaurantId: ctx.restaurantId, contato: ctx.contato } },
    create: { restaurantId: ctx.restaurantId, contato: ctx.contato, dados, resumo, totalCents: p.totalCents },
    update: { dados, resumo, totalCents: p.totalCents, createdAt: new Date() },
  });

  return {
    texto: `Conferido, ainda NÃO criado. Mande este resumo ao cliente, com o total, e pergunte se confirma:\n\n${resumo}`,
  };
}

async function criarPedido(ctx: ContextoDoPedido): Promise<ResultadoDaFerramenta> {
  const rascunho = await db.iaRascunho.findUnique({
    where: { restaurantId_contato: { restaurantId: ctx.restaurantId, contato: ctx.contato } },
  });
  if (!rascunho) return erro("Não há pedido conferido nesta conversa. Monte o pedido e chame conferir_pedido primeiro.");

  if (Date.now() - rascunho.createdAt.getTime() > RASCUNHO_VALE_MIN * 60_000) {
    await db.iaRascunho.deleteMany({ where: { id: rascunho.id } });
    return erro("O resumo foi mostrado há mais de 30 minutos. Confira de novo e mostre o resumo atualizado ao cliente.");
  }
  // o "sim" tem de ter vindo depois do resumo: sem isso, a IA poderia
  // conferir e criar na mesma resposta, sem o cliente ver nada
  const respondeu = await db.iaMensagem.count({
    where: { restaurantId: ctx.restaurantId, contato: ctx.contato, papel: "CLIENTE", createdAt: { gt: rascunho.createdAt } },
  });
  if (respondeu === 0) return erro("O cliente ainda não respondeu ao resumo. Mande o resumo e espere ele confirmar.");

  // Apagar antes de criar é o que impede dois "sim" seguidos de virarem
  // dois pedidos na cozinha: só quem apagou segue.
  const { count } = await db.iaRascunho.deleteMany({ where: { id: rascunho.id, createdAt: rascunho.createdAt } });
  if (count === 0) return erro("Este pedido já está sendo criado. Não chame de novo.");

  const dados = rascunho.dados as { checkout: unknown; itens: unknown };
  const r = await conferir(ctx.slug, dados);
  if ("problema" in r) {
    return erro(`O pedido não pôde ser criado: ${r.problema} Avise o cliente, acerte e confira de novo.`);
  }

  let pedido;
  try {
    pedido = await placeOrder({ slug: ctx.slug, input: r.input, items: r.items, pelaIa: true });
  } catch (e) {
    if (e instanceof OrderError) return erro(`O pedido não pôde ser criado: ${e.message} Avise o cliente, acerte e confira de novo.`);
    throw e;
  }

  const base = `Pedido #${pedido.number} criado, total ${formatCents(pedido.totalCents)}.`;
  if (pedido.paymentMethod !== "PIX") {
    return {
      texto: `${base} O pagamento é na ${pedido.type === "DELIVERY" ? "entrega" : "retirada"}. Diga o número ao cliente e que o restaurante já recebeu o pedido.`,
    };
  }
  const pix = await instrucoesDoPix(ctx, pedido.id, true);
  return { ...pix, texto: `${base} Diga o número ao cliente. ${pix.texto}` };
}

/** o Pix de um pedido: o do Mercado Pago no 100% Delivery, a chave do restaurante nos outros */
async function instrucoesDoPix(ctx: ContextoDoPedido, orderId: string, doCliente: boolean): Promise<ResultadoDaFerramenta> {
  const pedido = await db.order.findUnique({
    where: { id: orderId },
    select: { code: true, origin: true, totalCents: true, restaurant: { select: { pixKey: true, pixKeyType: true, pixHolderName: true } } },
  });
  if (!pedido) return erro("Pedido não encontrado.");

  if (pedido.origin === "FULL_DELIVERY") {
    // "renovar" devolve o QR que ainda vale, ou gera outro se o anterior venceu
    const pix = await pixDoPedido(orderId, { renovar: true });
    if (!pix.ok) return erro(`${pix.erro} Chame alguém da equipe.`);
    const link = `${appUrl()}/pedido/${pedido.code}`;
    return {
      texto: [
        `Pix gerado: ${formatCents(pix.pix.totalCents)}${pix.pix.venceEm ? `, vale até ${formatTime(pix.pix.venceEm)}` : ""}.`,
        "O código Pix copia e cola vai numa mensagem separada, logo depois da sua: não repita o código, só diga para copiar e colar no app do banco.",
        doCliente ? `Mande também o link do pedido, onde está o QR Code e onde ele acompanha a entrega: ${link}` : "",
        "O pagamento é confirmado sozinho quando cai; você não confirma nada.",
      ]
        .filter(Boolean)
        .join(" "),
      anexos: [pix.pix.copiaECola],
    };
  }

  const r = pedido.restaurant;
  if (!r.pixKey) return erro("O restaurante não tem chave Pix cadastrada. Chame alguém da equipe.");
  return {
    texto: [
      `Pix por chave ${r.pixKeyType ? pixKeyTypeLabel[r.pixKeyType] : ""} (${formatPixKey(r.pixKeyType, r.pixKey)})${r.pixHolderName ? ` em nome de ${r.pixHolderName}` : ""}, valor ${formatCents(pedido.totalCents)}.`,
      "A chave vai numa mensagem separada, logo depois da sua: não repita a chave.",
      "Peça para o cliente mandar o comprovante aqui e diga que o restaurante vai conferir. Você não confirma pagamento.",
    ].join(" "),
    // a chave do jeito que o botão "copiar" do site entrega: sem parênteses
    // nem traços, que o app do banco recusa
    anexos: [r.pixKey],
  };
}

const desde = () => new Date(Date.now() - JANELA_DE_BUSCA_H * 60 * 60_000);
// o salão e o totem não têm conversa de WhatsApp
const DO_WHATSAPP = { in: ["WHATSAPP" as const, "FULL_DELIVERY" as const] };

async function buscarPedidos(ctx: ContextoDoPedido, entrada: Record<string, unknown>): Promise<ResultadoDaFerramenta> {
  const select = {
    number: true,
    customerName: true,
    status: true,
    totalCents: true,
    paymentMethod: true,
    payment: { select: { status: true, cardType: true, changeForCents: true } },
  } as const;

  const porNumero = ctx.telefone
    ? await db.order.findMany({
        where: { restaurantId: ctx.restaurantId, origin: DO_WHATSAPP, createdAt: { gte: desde() }, customerWhatsapp: { in: variantes(ctx.telefone) } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select,
      })
    : [];
  if (porNumero.length > 0) {
    const linhas = porNumero.map(
      (o) =>
        `#${o.number} — ${o.customerName} — ${orderStatusLabel[o.status]} — ${formatCents(o.totalCents)} — ${paymentText({ method: o.paymentMethod, cardType: o.payment?.cardType, changeForCents: o.payment?.changeForCents })} (${o.payment ? paymentStatusLabel[o.payment.status] : "sem pagamento"})`,
    );
    return { texto: `Pedidos de hoje deste número:\n${linhas.join("\n")}` };
  }

  const nome = texto(entrada.nome)?.trim();
  if (!nome) return { texto: "Nenhum pedido de hoje com este número. Pergunte o nome que o cliente usou no pedido e busque de novo." };
  if (nome.length < 3) return erro("Nome curto demais para buscar. Peça o nome completo.");

  // Pelo nome só aparece pedido esperando Pix, e só com o primeiro nome:
  // quem pergunta não provou ser o dono do pedido, e ali tem endereço.
  const porNome = await db.order.findMany({
    where: {
      restaurantId: ctx.restaurantId,
      origin: DO_WHATSAPP,
      createdAt: { gte: desde() },
      status: "AWAITING_PAYMENT",
      paymentMethod: "PIX",
      customerName: { contains: nome, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select,
  });
  if (porNome.length === 0) return { texto: "Nenhum pedido esperando Pix hoje com esse nome. Chame alguém da equipe." };
  const linhas = porNome.map((o) => `#${o.number} — ${o.customerName.split(" ")[0]} — ${formatCents(o.totalCents)} — esperando o Pix`);
  return {
    texto: `Achados pelo nome (o número do WhatsApp é outro). Confirme com o cliente o número do pedido e o total antes de mandar o Pix:\n${linhas.join("\n")}`,
  };
}

async function mandarPix(ctx: ContextoDoPedido, entrada: Record<string, unknown>): Promise<ResultadoDaFerramenta> {
  const numero = Number(entrada.numero_pedido);
  if (!Number.isInteger(numero) || numero < 1) return erro("Número de pedido inválido.");

  // o número recomeça todo dia: o de hoje é o mais recente com esse número
  const pedido = await db.order.findFirst({
    where: { restaurantId: ctx.restaurantId, origin: DO_WHATSAPP, number: numero, createdAt: { gte: desde() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, paymentMethod: true, customerWhatsapp: true, payment: { select: { status: true } } },
  });
  if (!pedido) return erro(`Não achei o pedido #${numero} de hoje.`);
  if (pedido.paymentMethod !== "PIX") return erro(`O pedido #${numero} não é no Pix.`);
  if (pedido.status === "CANCELED") return erro(`O pedido #${numero} foi cancelado. Chame alguém da equipe.`);
  if (pedido.payment?.status === "CONFIRMED") return { texto: `O pedido #${numero} já está pago.` };

  const doCliente = !!ctx.telefone && variantes(ctx.telefone).includes(pedido.customerWhatsapp);
  return instrucoesDoPix(ctx, pedido.id, doCliente);
}

export async function executarFerramenta(ctx: ContextoDoPedido, nome: string, entrada: unknown): Promise<ResultadoDaFerramenta> {
  const e = (entrada && typeof entrada === "object" ? entrada : {}) as Record<string, unknown>;
  switch (nome) {
    case "conferir_pedido":
      return conferirPedido(ctx, e);
    case "criar_pedido":
      return criarPedido(ctx);
    case "buscar_pedidos":
      return buscarPedidos(ctx, e);
    case "mandar_pix":
      return mandarPix(ctx, e);
    default:
      return erro(`Ferramenta desconhecida: ${nome}`);
  }
}

/**
 * Tem um Pix em aberto deste número hoje? É o que decide se uma foto que o
 * cliente mandou é, provavelmente, um comprovante.
 */
export async function pixEmAberto(restaurantId: string, telefone: string) {
  const pedido = await db.order.findFirst({
    where: {
      restaurantId,
      origin: DO_WHATSAPP,
      createdAt: { gte: desde() },
      customerWhatsapp: { in: variantes(telefone) },
      paymentMethod: "PIX",
      status: { not: "CANCELED" },
      payment: { status: { in: ["PENDING", "PROOF_SENT"] } },
    },
    orderBy: { createdAt: "desc" },
    select: { number: true, origin: true },
  });
  return pedido;
}
