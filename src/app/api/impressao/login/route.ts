import { db } from "@/lib/db";
import { dummyPasswordCheck, verifyPassword } from "@/server/auth/password";
import { registerDevice } from "@/server/print/devices";

// Entrada do Print Fácil pelo login do dono: ele instala o programa,
// digita o mesmo e-mail e senha do painel, e o computador já fica ligado
// ao restaurante dele. Sem código para ditar.
//
// A senha não fica no computador: ela vale só para esta chamada, que
// devolve o token do dispositivo. Quem tem mais de um restaurante escolhe
// qual, mandando o restaurante_id na segunda chamada.

/** tentativas seguidas por e-mail, para não virar porta de força bruta */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function tooManyAttempts(email: string) {
  const now = Date.now();
  const entry = attempts.get(email);
  if (!entry || entry.until < now) return false;
  return entry.count >= MAX_ATTEMPTS;
}

function countAttempt(email: string) {
  const now = Date.now();
  const entry = attempts.get(email);
  if (!entry || entry.until < now) attempts.set(email, { count: 1, until: now + WINDOW_MS });
  else entry.count += 1;
}

export async function POST(request: Request) {
  let body: { email?: unknown; senha?: unknown; nome?: unknown; restaurante_id?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ erro: "envie e-mail e senha" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const senha = typeof body.senha === "string" ? body.senha : "";
  const nome = typeof body.nome === "string" && body.nome.trim() ? body.nome.trim() : "Computador";
  const escolhido = typeof body.restaurante_id === "string" ? body.restaurante_id : null;
  if (!email || !senha) return Response.json({ erro: "Informe o e-mail e a senha do painel." }, { status: 400 });
  if (tooManyAttempts(email)) return Response.json({ erro: "Muitas tentativas. Tente de novo daqui a pouco." }, { status: 429 });

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      status: true,
      passwordHash: true,
      mustChangePassword: true,
      ownerships: { select: { restaurant: { select: { id: true, name: true } } } },
    },
  });

  // mesma demora com ou sem e-mail cadastrado
  const valid = user ? await verifyPassword(senha, user.passwordHash) : (await dummyPasswordCheck(senha), false);
  if (!user || !valid) {
    countAttempt(email);
    return Response.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }
  if (user.status !== "ACTIVE") return Response.json({ erro: "Esta conta está desativada." }, { status: 403 });
  if (user.mustChangePassword) {
    return Response.json({ erro: "Entre primeiro no painel pelo site e crie a sua senha." }, { status: 403 });
  }

  const restaurants = user.ownerships.map((o) => o.restaurant);
  if (restaurants.length === 0) return Response.json({ erro: "Esta conta não tem restaurante." }, { status: 403 });

  const restaurant = escolhido ? restaurants.find((r) => r.id === escolhido) : restaurants.length === 1 ? restaurants[0] : null;
  if (!restaurant) {
    // mais de um restaurante: o programa mostra a lista e chama de novo
    return Response.json({ escolha_restaurante: restaurants.map((r) => ({ id: r.id, nome: r.name })) }, { status: 300 });
  }

  const { deviceId, token } = await registerDevice(nome);
  await db.printDevice.update({
    where: { id: deviceId },
    data: { restaurantId: restaurant.id, pairedAt: new Date(), pairingCode: null },
    select: { id: true },
  });

  return Response.json({
    dispositivo_id: deviceId,
    token,
    restaurante: { id: restaurant.id, nome: restaurant.name },
  });
}
