import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { appUrl } from "@/lib/site";
import { deviceFromRequest } from "@/server/print/devices";
import { hashDoToken } from "@/server/totem/dispositivos";

// O aplicativo Menu Fácil Totem pede para abrir o totem.
//
// Ele é o Menu Fácil Print que cresceu, do mesmo jeito que o Print Fácil do
// computador virou o Menu Fácil para PC: além de imprimir, mostra o
// cardápio do totem dentro dele. A página é a mesma do link, sem mudar
// nada -- o aplicativo só entrega a ela, já pronto, o token que o tablet
// teria ganho digitando o código de ativação.
//
// Um pareamento só: quem prova que o tablet é do restaurante é a
// impressora, que o dono já ligou no painel com o código dela. Por isso
// esta porta entra com o token da impressora, e não com o do totem.
//
// Cada chamada troca o token do totem (o aplicativo chama ao abrir), e a
// linha é uma por impressora: desligar a impressora no painel apaga o
// totem junto.

export async function aplicativo(request: Request) {
  const impressora = await deviceFromRequest(request);
  if (!impressora) return Response.json({ erro: "aparelho não reconhecido" }, { status: 401 });
  if (!impressora.restaurantId || impressora.pairingCode) {
    return Response.json({ erro: "Pareie a impressora no painel antes de abrir o totem.", pareado: false }, { status: 409 });
  }

  let versao: string | null = null;
  try {
    const corpo = (await request.json()) as { versao?: unknown };
    versao = typeof corpo.versao === "string" ? corpo.versao.slice(0, 20) : null;
  } catch {
    // corpo vazio também serve
  }

  const restaurante = await db.restaurant.findUnique({
    where: { id: impressora.restaurantId },
    select: { id: true, name: true, slug: true, totemEnabled: true, status: true },
  });
  if (!restaurante || restaurante.status === "BLOCKED") {
    return Response.json({ erro: "Este restaurante não está ativo." }, { status: 403 });
  }
  // o admin libera o totem restaurante por restaurante; sem ele o aplicativo
  // continua só imprimindo, como sempre fez
  if (!restaurante.totemEnabled) {
    return Response.json({ erro: "O totem não está liberado para este restaurante.", totem: false }, { status: 403 });
  }

  // o token nasce aqui e só o aparelho fica com ele; no banco vai o hash
  const token = randomBytes(32).toString("base64url");
  const agora = new Date();
  await db.totemDevice.upsert({
    where: { printDeviceId: impressora.id },
    create: {
      restaurantId: restaurante.id,
      printDeviceId: impressora.id,
      name: `Menu Fácil Totem · ${impressora.name}`.slice(0, 80),
      tokenHash: hashDoToken(token),
      appVersion: versao,
      pairedAt: agora,
      lastSeenAt: agora,
    },
    update: {
      restaurantId: restaurante.id,
      tokenHash: hashDoToken(token),
      pairingCode: null,
      appVersion: versao,
      lastSeenAt: agora,
    },
    select: { id: true },
  });

  return Response.json({
    token,
    restaurante: { id: restaurante.id, nome: restaurante.name, slug: restaurante.slug },
    endereco: `${appUrl()}/totem/${restaurante.slug}`,
  });
}
