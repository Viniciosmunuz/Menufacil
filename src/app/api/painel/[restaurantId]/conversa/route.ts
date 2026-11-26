import { falasDaConversa } from "@/server/ia/conversas";
import { requireRestaurantAccess } from "@/server/auth/dal";

// O que foi dito numa conversa da Lia, para a faixa do balcão abrir.
//
// Separado da faixa de propósito: carregar o texto de todas as conversas
// junto com os cartões seria pagar a consulta inteira a cada volta do
// retrato, de dez em dez segundos, com o painel aberto a noite toda. Foi
// um canal assim que estourou a memória da conta na Vercel em 15/11/2026.
// Aqui a consulta acontece uma vez, no toque de quem quis ler.
//
// Só o dono: o número da Lia é o pessoal dele, e quem está no balcão não
// tem o que ver nas conversas que chegam ali. É a mesma regra que a aba
// da IA já segue.

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: RouteContext<"/api/painel/[restaurantId]/conversa">) {
  const { restaurantId } = await params;
  const { restaurant, papel } = await requireRestaurantAccess(restaurantId);
  if (papel === "STAFF") return new Response("não encontrado", { status: 404 });

  const contato = new URL(request.url).searchParams.get("contato")?.trim();
  if (!contato) return Response.json({ falas: [] }, { headers: { "Cache-Control": "no-store" } });

  const falas = await falasDaConversa(restaurant.id, contato);
  return Response.json(
    { falas: falas.map((f) => ({ id: f.id, papel: f.papel, texto: f.texto })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
