import { situacaoDoPedido } from "@/server/pagamentos/api/situacao";
import { webhookDoPagamento } from "@/server/pagamentos/webhook";

// A porta do 100% Delivery.
//
// Duas coisas entram por aqui, e as duas são de fora do painel:
//
// - POST /api/pagamento/webhook?r=<restaurante>: o aviso do Mercado Pago de
//   que um pagamento mudou. É este endereço que o dono cadastra no painel
//   do Mercado Pago dele.
// - GET /api/pagamento/situacao?code=<pedido>: a página do cliente
//   perguntando como está o pedido dele.
//
// Juntas numa rota só pelo mesmo motivo da rota do totem: na Vercel cada
// rota vira uma função, e o plano aceita 12.
//
// O resto do 100% Delivery -- ligar a conta, cobrar, conversar, mudar o
// status -- é server action ou página, e por isso não gasta função nenhuma.

export const dynamic = "force-dynamic";

const naoExiste = () => Response.json({ erro: "não existe" }, { status: 404 });

export async function POST(request: Request, { params }: RouteContext<"/api/pagamento/[acao]">) {
  const { acao } = await params;
  return acao === "webhook" ? webhookDoPagamento(request) : naoExiste();
}

export async function GET(request: Request, { params }: RouteContext<"/api/pagamento/[acao]">) {
  const { acao } = await params;
  return acao === "situacao" ? situacaoDoPedido(request) : naoExiste();
}
