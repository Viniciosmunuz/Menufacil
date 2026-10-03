import { processar } from "@/server/whatsapp/api/processar";
import { eventos, verificar } from "@/server/whatsapp/api/webhook";

// Uma porta só para as duas do WhatsApp.
//
// Os endereços são exatamente os de antes -- /api/whatsapp/webhook, que
// está cadastrado na Meta, e /api/whatsapp/processar, que a Vercel Cron
// chama. O que mudou é que eles entram por aqui em vez de cada um ter o
// próprio arquivo de rota.
//
// O motivo é o mesmo da rota do totem: na Vercel cada rota vira uma função,
// e o plano do MenuFácil aceita 12. Juntar estas duas abriu a vaga do
// /api/pagamento, que o 100% Delivery precisa para receber o aviso do
// Mercado Pago.
//
// Quem faz o trabalho continua em src/server/whatsapp/api/, um arquivo por
// assunto -- só a porta de entrada é compartilhada.

export const dynamic = "force-dynamic";

const naoExiste = () => Response.json({ erro: "não existe" }, { status: 404 });

export async function GET(request: Request, { params }: RouteContext<"/api/whatsapp/[acao]">) {
  const { acao } = await params;
  // a Meta confere o endereço com um GET; o cron aceita os dois verbos
  if (acao === "webhook") return verificar(request);
  if (acao === "processar") return processar(request);
  return naoExiste();
}

export async function POST(request: Request, { params }: RouteContext<"/api/whatsapp/[acao]">) {
  const { acao } = await params;
  if (acao === "webhook") return eventos(request);
  if (acao === "processar") return processar(request);
  return naoExiste();
}
