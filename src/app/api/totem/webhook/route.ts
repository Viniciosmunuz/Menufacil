import { createHmac, timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";
import { credenciais } from "@/server/totem/config";
import { verPagamento } from "@/server/totem/mercado-pago";
import { criarPedidoDoTotem, TotemError, type ItemDoTotem } from "@/server/totem/pedido";

// Aviso de pagamento do Mercado Pago.
//
// Cada restaurante cadastra este endereço no painel dele com o próprio id
// na ponta (?r=...): é assim que sabemos de qual conta veio o aviso, já
// que todos os restaurantes usam contas diferentes e a mesma URL.
//
// O aviso é conferido pela assinatura (x-signature) com a chave secreta
// que o restaurante cadastrou. Sem chave cadastrada, o aviso é ignorado:
// nada aqui é feito com base num POST que qualquer um poderia mandar.
//
// Este endereço é um atalho, não o caminho principal: o totem pergunta
// sozinho como está o pagamento (ver /api/totem/pagamento). Se o webhook
// não estiver configurado, o balcão funciona igual.

export const dynamic = "force-dynamic";

/**
 * Assinatura do Mercado Pago: o cabeçalho traz "ts=...,v1=...", e o que é
 * assinado é "id:<data.id>;request-id:<x-request-id>;ts:<ts>;".
 */
function assinaturaConfere(request: Request, chave: string, dataId: string) {
  const assinatura = request.headers.get("x-signature") ?? "";
  const partes = Object.fromEntries(
    assinatura.split(",").map((p) => {
      const [k, ...resto] = p.split("=");
      return [k?.trim() ?? "", resto.join("=").trim()];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const requestId = request.headers.get("x-request-id") ?? "";
  const base = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const esperado = createHmac("sha256", chave).update(base).digest("hex");

  const a = Buffer.from(esperado, "utf8");
  const b = Buffer.from(v1, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const restaurantId = url.searchParams.get("r") ?? "";
  // data.id vem na query em alguns formatos e no corpo em outros
  const dataIdNaQuery = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";

  let corpo: { type?: unknown; action?: unknown; data?: { id?: unknown } } = {};
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    // corpo vazio acontece no teste do painel do Mercado Pago
  }

  const tipo = String(corpo.type ?? url.searchParams.get("type") ?? "");
  const dataId = String(corpo.data?.id ?? dataIdNaQuery ?? "");

  // sempre 200: o Mercado Pago reenvia o que falha, e não há nada a
  // reenviar quando o aviso não é de pagamento ou não é para nós
  if (!restaurantId || !dataId) return Response.json({ ok: true });
  if (tipo && tipo !== "payment") return Response.json({ ok: true });

  const contas = await credenciais(restaurantId);
  if (!contas?.webhookKey) return Response.json({ ok: true });
  if (!assinaturaConfere(request, contas.webhookKey, dataId)) {
    return Response.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  const pagamento = await verPagamento(contas.accessToken, dataId);
  if (!pagamento.ok) return Response.json({ ok: true });

  const referencia = pagamento.dados.external_reference;
  if (!referencia) return Response.json({ ok: true });

  const linha = await db.totemPayment.findFirst({
    where: { reference: referencia, restaurantId },
    select: { id: true, status: true, orderId: true, cart: true },
  });
  if (!linha || linha.orderId) return Response.json({ ok: true });

  if (pagamento.dados.status !== "approved") {
    await db.totemPayment.updateMany({
      where: { id: linha.id, status: "PENDING" },
      data: { status: pagamento.dados.status === "cancelled" ? "CANCELED" : "REJECTED", lastEvent: pagamento.dados as object },
    });
    return Response.json({ ok: true });
  }

  // mesma trava do /api/totem/pagamento: só quem virar a linha grava o pedido
  const { count } = await db.totemPayment.updateMany({
    where: { id: linha.id, status: "PENDING" },
    data: { status: "APPROVED", paidAt: new Date(), mpPaymentId: String(pagamento.dados.id), lastEvent: pagamento.dados as object },
  });
  if (count === 0) return Response.json({ ok: true });

  const carrinho = (linha.cart ?? {}) as { nome?: string; observacao?: string | null; itens?: ItemDoTotem[] };
  try {
    const pedido = await criarPedidoDoTotem({
      restaurantId,
      nome: carrinho.nome ?? "",
      itens: carrinho.itens ?? [],
      observacao: carrinho.observacao ?? null,
    });
    await db.totemPayment.update({ where: { id: linha.id }, data: { orderId: pedido.id }, select: { id: true } });
  } catch (erro) {
    const motivo = erro instanceof TotemError ? erro.message : "falha ao gravar o pedido";
    await db.totemPayment.update({ where: { id: linha.id }, data: { lastEvent: { pago_sem_pedido: true, motivo } }, select: { id: true } });
  }

  return Response.json({ ok: true });
}
