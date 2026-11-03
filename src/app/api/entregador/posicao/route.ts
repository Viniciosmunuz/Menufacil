import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getEntregadorAtual } from "@/server/auth/dal";

// Onde o entregador está, agora.
//
// Este endereço existe para ser chamado de dois lugares: hoje, da própria
// tela dele no navegador; amanhã, do aplicativo Android, que pega a
// localização por fora e continua mandando com a tela apagada. O formato é
// o mesmo nos dois casos, de propósito -- quando o aplicativo chegar, nada
// aqui nem na tela do cliente muda.
//
// Quem é ele vem da sessão, nunca do corpo da requisição: o aparelho diz
// onde está, não quem é.

type Corpo = { lat?: unknown; lng?: unknown };

/** uma coordenada que faz sentido na Terra */
const coordenada = (v: unknown, limite: number) => (typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limite ? v : null);

export async function POST(request: Request) {
  const atual = await getEntregadorAtual();
  if (!atual) return NextResponse.json({ error: "sem sessão de entregador" }, { status: 401 });

  const corpo = (await request.json().catch(() => null)) as Corpo | null;
  const lat = coordenada(corpo?.lat, 90);
  const lng = coordenada(corpo?.lng, 180);
  if (lat === null || lng === null) return NextResponse.json({ error: "posição inválida" }, { status: 400 });

  // Só se guarda posição de quem está levando alguma coisa.
  //
  // Fora da entrega, onde o entregador está não é da conta de ninguém --
  // nem do restaurante. É por isso que a resposta devolve `emRota`: o
  // aparelho que estiver mandando sem precisar fica sabendo que pode
  // parar, e com ele para também o gasto de bateria.
  const emRota = await db.order.count({
    where: { restaurantId: atual.restaurant.id, entregadorId: atual.entregador.id, status: "OUT_FOR_DELIVERY" },
  });
  if (emRota === 0) {
    // apaga o que havia: entrega terminada, posição some
    await db.entregador.update({
      where: { id: atual.entregador.id },
      data: { latitude: null, longitude: null, posicaoEm: null },
    });
    return NextResponse.json({ ok: true, emRota: false });
  }

  await db.entregador.update({
    where: { id: atual.entregador.id },
    data: { latitude: lat, longitude: lng, posicaoEm: new Date() },
  });
  return NextResponse.json({ ok: true, emRota: true });
}
