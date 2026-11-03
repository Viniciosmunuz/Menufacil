import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { noAr } from "@/lib/features";

// Onde está a moto deste pedido.
//
// A página do cliente pergunta a cada poucos segundos, em vez de recarregar
// a tela inteira: recarregar remontaria o mapa e ele piscaria a cada volta.
//
// O que protege a posição é o pedido, e não uma senha: só responde enquanto
// **este** pedido está em rota, e só a posição de quem está levando **ele**.
// Entregue, cancelado ou ainda na cozinha, a resposta é vazia -- e com isso
// a moto some do mapa de quem ficou com a página aberta.

/** depois disso a posição é velha demais para mostrar como "onde ele está" */
const VALIDADE = 3 * 60 * 1000;

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const pedido = await db.order.findUnique({
    where: { code },
    select: {
      status: true,
      destinoLat: true,
      destinoLng: true,
      restaurant: { select: { entregadorEnabled: true } },
      entregador: { select: { nome: true, fotoUrl: true, moto: true, corDaMoto: true, placa: true, latitude: true, longitude: true, posicaoEm: true } },
    },
  });

  const e = pedido?.entregador;
  // mesma regra da tela: sem o módulo ligado, não há o que acompanhar
  const ligado = !!pedido?.restaurant.entregadorEnabled && noAr("entregadorEnabled");
  if (!pedido || !ligado || pedido.status !== "OUT_FOR_DELIVERY" || !e) return NextResponse.json({ emRota: false });

  const recente = e.posicaoEm && Date.now() - e.posicaoEm.getTime() < VALIDADE;
  return NextResponse.json({
    emRota: true,
    // a casa do cliente, quando o endereço pôde virar coordenadas
    destino: pedido.destinoLat != null && pedido.destinoLng != null ? { lat: pedido.destinoLat, lng: pedido.destinoLng } : null,
    nome: e.nome,
    fotoUrl: e.fotoUrl,
    moto: [e.moto, e.corDaMoto].filter(Boolean).join(" ") || null,
    placa: e.placa,
    // sem posição recente a tela mostra o entregador sem mapa: é melhor
    // não ter bolinha do que ter uma bolinha parada mentindo onde ele está
    lat: recente ? e.latitude : null,
    lng: recente ? e.longitude : null,
    em: recente ? e.posicaoEm?.toISOString() : null,
  });
}
