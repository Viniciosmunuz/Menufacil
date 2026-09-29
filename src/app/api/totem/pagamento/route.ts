import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { orderTicket } from "@/server/print/queue";
import { credenciais } from "@/server/totem/config";
import { tocarTotem, totemDaRequisicao } from "@/server/totem/dispositivos";
import { cancelarIntencao, criarIntencao, situacao, verIntencao } from "@/server/totem/mercado-pago";
import { conferirCarrinho, criarPedidoDoTotem, TotemError, type ItemDoTotem } from "@/server/totem/pedido";

// A passada de cartão no totem, em três chamadas:
//
// POST   manda a cobrança para a maquininha e devolve um id para acompanhar
// GET    pergunta em que pé está; quando aprova, grava o pedido e devolve a via
// DELETE o cliente desistiu: tira a cobrança da tela da maquininha
//
// Quem grava o pedido é o GET, e não o webhook: assim o totem funciona
// mesmo em restaurante que não cadastrou o webhook no Mercado Pago, e
// mesmo quando o aviso deles demora. O webhook, quando existe, só adianta
// o trabalho.
//
// O pedido nunca é gravado duas vezes: antes de criar, a linha do
// pagamento é virada de PENDING para APPROVED numa instrução só. Quem
// conseguir virar grava; quem chegar depois lê o pedido já gravado.

export const dynamic = "force-dynamic";

/** dinheiro que a maquininha aceita numa passada */
const MAX_CENTAVOS = 500_000_00;

async function viaDoPedido(restaurantId: string, orderId: string) {
  const via = await orderTicket(restaurantId, orderId);
  return via ?? null;
}

export async function POST(request: Request) {
  const totem = await totemDaRequisicao(request);
  if (!totem) return Response.json({ erro: "totem não reconhecido" }, { status: 401 });

  let corpo: { nome?: unknown; itens?: unknown; observacao?: unknown };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return Response.json({ erro: "envie o carrinho" }, { status: 400 });
  }

  const nome = typeof corpo.nome === "string" ? corpo.nome : "";
  const observacao = typeof corpo.observacao === "string" ? corpo.observacao : null;
  const itens = (Array.isArray(corpo.itens) ? corpo.itens : []) as ItemDoTotem[];

  const conta = await conferirCarrinho(totem.restaurantId, itens).catch((erro: unknown) => {
    if (erro instanceof TotemError) return erro;
    throw erro;
  });
  if (conta instanceof TotemError) return Response.json({ erro: conta.message }, { status: 400 });
  if (conta.totalCents > MAX_CENTAVOS) return Response.json({ erro: "Valor acima do limite do totem." }, { status: 400 });

  const contas = await credenciais(totem.restaurantId);
  if (!contas) {
    return Response.json({ erro: "A maquininha ainda não está configurada no painel deste restaurante." }, { status: 409 });
  }

  const referencia = randomUUID();
  const resposta = await criarIntencao({
    accessToken: contas.accessToken,
    deviceId: contas.deviceId,
    amountCents: conta.totalCents,
    descricao: `${totem.restaurant.name} - totem`,
    referencia,
  });
  if (!resposta.ok) return Response.json({ erro: resposta.erro }, { status: 502 });

  const pagamento = await db.totemPayment.create({
    data: {
      restaurantId: totem.restaurantId,
      deviceId: totem.id,
      intentId: String(resposta.dados.id),
      reference: referencia,
      amountCents: conta.totalCents,
      // o carrinho fica guardado para o pedido sair igual ao que o cliente viu
      cart: { nome, observacao, itens: itens as unknown as object[] },
    },
    select: { id: true },
  });

  await tocarTotem(totem.id);
  return Response.json({ pagamento_id: pagamento.id, total_centavos: conta.totalCents });
}

export async function GET(request: Request) {
  const totem = await totemDaRequisicao(request);
  if (!totem) return Response.json({ erro: "totem não reconhecido" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id") ?? "";
  const pagamento = await db.totemPayment.findFirst({
    where: { id, restaurantId: totem.restaurantId },
    select: { id: true, intentId: true, status: true, amountCents: true, orderId: true, cart: true },
  });
  if (!pagamento) return Response.json({ erro: "pagamento não encontrado" }, { status: 404 });

  // já gravado: devolve o pedido de novo, sem falar com o Mercado Pago
  if (pagamento.orderId) {
    const via = await viaDoPedido(totem.restaurantId, pagamento.orderId);
    return Response.json({ situacao: "aprovado", pedido: via });
  }
  if (pagamento.status === "CANCELED" || pagamento.status === "REJECTED" || pagamento.status === "EXPIRED") {
    return Response.json({ situacao: pagamento.status === "CANCELED" ? "cancelado" : "recusado" });
  }

  const contas = await credenciais(totem.restaurantId);
  if (!contas) return Response.json({ erro: "A maquininha não está configurada." }, { status: 409 });

  const resposta = await verIntencao(contas.accessToken, pagamento.intentId);
  if (!resposta.ok) {
    // não deu para perguntar agora: o totem tenta de novo daqui a pouco
    return Response.json({ situacao: "esperando", aviso: resposta.erro });
  }

  const estado = situacao(resposta.dados.state);
  if (estado === "esperando") return Response.json({ situacao: "esperando" });

  if (estado !== "aprovado") {
    await db.totemPayment.updateMany({
      where: { id: pagamento.id, status: "PENDING" },
      data: { status: estado === "cancelado" ? "CANCELED" : "REJECTED", lastEvent: resposta.dados as object },
    });
    return Response.json({ situacao: estado });
  }

  // Aprovado. Vira a linha primeiro: só quem conseguir virar grava o pedido.
  const { count } = await db.totemPayment.updateMany({
    where: { id: pagamento.id, status: "PENDING" },
    data: {
      status: "APPROVED",
      paidAt: new Date(),
      mpPaymentId: resposta.dados.payment?.id ? String(resposta.dados.payment.id) : null,
      lastEvent: resposta.dados as object,
    },
  });
  if (count === 0) {
    // outra chamada chegou antes: ou o pedido já está lá, ou está saindo agora
    const atual = await db.totemPayment.findUnique({ where: { id: pagamento.id }, select: { orderId: true } });
    if (!atual?.orderId) return Response.json({ situacao: "esperando" });
    return Response.json({ situacao: "aprovado", pedido: await viaDoPedido(totem.restaurantId, atual.orderId) });
  }

  const carrinho = (pagamento.cart ?? {}) as { nome?: string; observacao?: string | null; itens?: ItemDoTotem[] };
  try {
    const pedido = await criarPedidoDoTotem({
      restaurantId: totem.restaurantId,
      nome: carrinho.nome ?? "",
      itens: carrinho.itens ?? [],
      observacao: carrinho.observacao ?? null,
    });
    await db.totemPayment.update({ where: { id: pagamento.id }, data: { orderId: pedido.id }, select: { id: true } });
    await tocarTotem(totem.id);
    return Response.json({ situacao: "aprovado", pedido: await viaDoPedido(totem.restaurantId, pedido.id) });
  } catch (erro) {
    // Cartão passou e o pedido não entrou (produto esgotou entre uma coisa e
    // outra, banco fora do ar). O dinheiro é real: fica registrado para o
    // restaurante devolver, e a tela manda chamar o atendente.
    const motivo = erro instanceof TotemError ? erro.message : "falha ao gravar o pedido";
    await db.totemPayment.update({
      where: { id: pagamento.id },
      data: { lastEvent: { pago_sem_pedido: true, motivo } },
      select: { id: true },
    });
    return Response.json({ situacao: "pago_sem_pedido", erro: motivo }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  const totem = await totemDaRequisicao(request);
  if (!totem) return Response.json({ erro: "totem não reconhecido" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id") ?? "";
  const pagamento = await db.totemPayment.findFirst({
    where: { id, restaurantId: totem.restaurantId },
    select: { id: true, intentId: true, status: true },
  });
  if (!pagamento) return Response.json({ erro: "pagamento não encontrado" }, { status: 404 });
  if (pagamento.status !== "PENDING") return Response.json({ erro: "Esse pagamento já foi fechado." }, { status: 409 });

  const contas = await credenciais(totem.restaurantId);
  if (!contas) return Response.json({ erro: "A maquininha não está configurada." }, { status: 409 });

  const resposta = await cancelarIntencao(contas.accessToken, contas.deviceId, pagamento.intentId);
  // o Mercado Pago recusa cancelar o que já foi pago: nesse caso o GET resolve
  if (!resposta.ok) return Response.json({ erro: resposta.erro }, { status: 409 });

  await db.totemPayment.updateMany({ where: { id: pagamento.id, status: "PENDING" }, data: { status: "CANCELED" } });
  return Response.json({ ok: true });
}
