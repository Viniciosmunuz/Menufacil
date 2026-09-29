import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { parearPorCodigo } from "@/server/totem/dispositivos";

// Ligar o totem ao restaurante pelo código, para quem instala sem ter a
// senha do painel à mão (um técnico montando o balcão, por exemplo).
//
// O dono gera o código na seção Totem do painel dele e dita; o aplicativo
// manda o código aqui e recebe o token do aparelho. O código só serve uma
// vez.

export async function POST(request: Request) {
  let corpo: { codigo?: unknown; nome?: unknown; versao?: unknown };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return Response.json({ erro: "envie o código" }, { status: 400 });
  }

  const codigo = typeof corpo.codigo === "string" ? corpo.codigo : "";
  const nome = typeof corpo.nome === "string" && corpo.nome.trim() ? corpo.nome.trim() : "Totem";
  const versao = typeof corpo.versao === "string" ? corpo.versao : null;
  if (!codigo) return Response.json({ erro: "Digite o código que aparece no painel." }, { status: 400 });

  // o token nasce aqui e só o aparelho fica com ele; no banco vai o hash
  const token = randomBytes(32).toString("base64url");
  const resultado = await parearPorCodigo(codigo, token);
  if ("erro" in resultado) return Response.json({ erro: resultado.erro }, { status: 400 });

  const device = await db.totemDevice.update({
    where: { id: resultado.deviceId },
    data: { name: nome.slice(0, 80), appVersion: versao?.slice(0, 20) ?? null, lastSeenAt: new Date() },
    select: { id: true, restaurant: { select: { id: true, name: true, slug: true } } },
  });

  return Response.json({
    dispositivo_id: device.id,
    token,
    restaurante: device.restaurant
      ? { id: device.restaurant.id, nome: device.restaurant.name, slug: device.restaurant.slug }
      : null,
  });
}
