import { db } from "@/lib/db";
import { dummyPasswordCheck, verifyPassword } from "@/server/auth/password";
import { registrarTotem } from "@/server/totem/dispositivos";

// Entrada do totem pelo login do dono: ele instala o aplicativo, digita o
// mesmo e-mail e senha do painel e o totem já abre no cardápio do
// restaurante dele. Sem código para ditar.
//
// A senha não fica guardada no totem: vale só para esta chamada, que
// devolve o token do aparelho. Quem tem mais de um restaurante escolhe
// qual, mandando restaurante_id numa segunda chamada.
//
// Mesma ideia do /api/impressao/login, em arquivo separado de propósito:
// mexer no totem não pode encostar na entrada do Menu Fácil para PC.

/** tentativas seguidas por e-mail, para não virar porta de força bruta */
const tentativas = new Map<string, { contagem: number; ate: number }>();
const MAX_TENTATIVAS = 8;
const JANELA_MS = 10 * 60 * 1000;

function demaisTentativas(email: string) {
  const agora = Date.now();
  const registro = tentativas.get(email);
  if (!registro || registro.ate < agora) return false;
  return registro.contagem >= MAX_TENTATIVAS;
}

function contarTentativa(email: string) {
  const agora = Date.now();
  const registro = tentativas.get(email);
  if (!registro || registro.ate < agora) tentativas.set(email, { contagem: 1, ate: agora + JANELA_MS });
  else registro.contagem += 1;
}

export async function login(request: Request) {
  let corpo: { email?: unknown; senha?: unknown; nome?: unknown; versao?: unknown; restaurante_id?: unknown };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return Response.json({ erro: "envie e-mail e senha" }, { status: 400 });
  }

  const email = typeof corpo.email === "string" ? corpo.email.trim().toLowerCase() : "";
  const senha = typeof corpo.senha === "string" ? corpo.senha : "";
  const nome = typeof corpo.nome === "string" && corpo.nome.trim() ? corpo.nome.trim() : "Totem";
  const versao = typeof corpo.versao === "string" ? corpo.versao : null;
  const escolhido = typeof corpo.restaurante_id === "string" ? corpo.restaurante_id : null;

  if (!email || !senha) return Response.json({ erro: "Informe o e-mail e a senha do painel." }, { status: 400 });
  if (demaisTentativas(email)) return Response.json({ erro: "Muitas tentativas. Tente de novo daqui a pouco." }, { status: 429 });

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      status: true,
      passwordHash: true,
      mustChangePassword: true,
      ownerships: { select: { restaurant: { select: { id: true, name: true, slug: true, totemEnabled: true, status: true } } } },
    },
  });

  // mesma demora com ou sem e-mail cadastrado
  const valida = user ? await verifyPassword(senha, user.passwordHash) : (await dummyPasswordCheck(senha), false);
  if (!user || !valida) {
    contarTentativa(email);
    return Response.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }
  if (user.status !== "ACTIVE") return Response.json({ erro: "Esta conta está desativada." }, { status: 403 });
  if (user.mustChangePassword) {
    return Response.json({ erro: "Entre primeiro no painel pelo site e crie a sua senha." }, { status: 403 });
  }

  // só restaurante no ar e com o totem liberado pelo admin da plataforma
  const restaurantes = user.ownerships
    .map((o) => o.restaurant)
    .filter((r) => r.totemEnabled && r.status === "ACTIVE");
  if (restaurantes.length === 0) {
    return Response.json({ erro: "O totem ainda não está liberado para o seu restaurante. Fale com o MenuFácil." }, { status: 403 });
  }

  const restaurante = escolhido
    ? restaurantes.find((r) => r.id === escolhido)
    : restaurantes.length === 1
      ? restaurantes[0]
      : null;
  if (!restaurante) {
    // mais de um restaurante: o aplicativo mostra a lista e chama de novo
    return Response.json({ escolha_restaurante: restaurantes.map((r) => ({ id: r.id, nome: r.name })) }, { status: 300 });
  }

  const { deviceId, token } = await registrarTotem(restaurante.id, nome, versao);

  return Response.json({
    dispositivo_id: deviceId,
    token,
    restaurante: { id: restaurante.id, nome: restaurante.name, slug: restaurante.slug },
  });
}
