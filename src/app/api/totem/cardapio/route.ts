import { isOpenNow } from "@/lib/opening-hours";
import { db } from "@/lib/db";
import { cardapioDoTotem } from "@/server/totem/cardapio";
import { totemDaRequisicao, tocarTotem } from "@/server/totem/dispositivos";

// O cardápio que o totem mostra. Ele pergunta ao abrir e de tempos em
// tempos: assim, esgotar um produto no painel apaga o botão da tela do
// balcão sem ninguém reiniciar nada.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const totem = await totemDaRequisicao(request);
  if (!totem) return Response.json({ erro: "totem não reconhecido" }, { status: 401 });

  const [categorias, restaurante] = await Promise.all([
    cardapioDoTotem(totem.restaurantId),
    db.restaurant.findUnique({
      where: { id: totem.restaurantId },
      select: {
        name: true,
        logoUrl: true,
        openMode: true,
        minOrderCents: true,
        receiptWidth: true,
        openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
      },
    }),
  ]);
  if (!restaurante) return Response.json({ erro: "restaurante não encontrado" }, { status: 404 });

  await tocarTotem(totem.id);

  return Response.json(
    {
      restaurante: {
        id: totem.restaurantId,
        nome: restaurante.name,
        logo: restaurante.logoUrl,
        aberto: isOpenNow(restaurante.openMode, restaurante.openingHours),
        pedido_minimo_centavos: restaurante.minOrderCents,
        papel_mm: restaurante.receiptWidth,
      },
      categorias,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
