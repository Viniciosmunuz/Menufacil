import { requireRestaurantAccess } from "@/server/auth/dal";
import { pedidosEsperando } from "@/server/stats";

// O número do selo de Pedidos, para a barra de baixo do celular conferir
// de tempos em tempos. Uma contagem só, e nada mais: a lista inteira e o
// sino continuam com a tela de Pedidos, que tem o canal ao vivo dela.

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: RouteContext<"/api/painel/[restaurantId]/esperando">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  const n = await pedidosEsperando(restaurant.id);
  return Response.json({ n }, { headers: { "Cache-Control": "no-store" } });
}
