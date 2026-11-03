import { NextResponse } from "next/server";

import { noAr } from "@/lib/features";
import { db } from "@/lib/db";
import { tracarRota } from "@/server/entregadores/rota";

// A rota de uma entrega, para quem está olhando o mapa.
//
// O mapa roda no navegador e a chave do serviço de rotas não pode sair do
// servidor -- então o navegador pergunta aqui, e é este endereço que fala
// com o serviço de fora.
//
// O destino não vem do pedido de quem chama: vem do pedido. Pede-se o
// código do pedido, e o endereço de entrega dele é o que serve de chegada.
// Assim ninguém usa este endereço para traçar rota entre dois pontos
// quaisquer e gastar a cota de graça -- só rota de entrega de verdade, e
// só enquanto ela está acontecendo.

const coordenada = (cru: string | null) => {
  const [lat, lng] = (cru ?? "").split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const de = coordenada(url.searchParams.get("de"));
  const code = url.searchParams.get("code") ?? "";
  if (!de || !code) return NextResponse.json({ rota: null });

  const pedido = await db.order.findUnique({
    where: { code },
    select: {
      status: true,
      destinoLat: true,
      destinoLng: true,
      restaurant: { select: { entregadorEnabled: true } },
    },
  });

  const vale =
    pedido &&
    pedido.status === "OUT_FOR_DELIVERY" &&
    pedido.restaurant.entregadorEnabled &&
    noAr("entregadorEnabled") &&
    pedido.destinoLat != null &&
    pedido.destinoLng != null;
  if (!vale) return NextResponse.json({ rota: null });

  const rota = await tracarRota(de, { lat: pedido.destinoLat!, lng: pedido.destinoLng! });
  return NextResponse.json({ rota });
}
