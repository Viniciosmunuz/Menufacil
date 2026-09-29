import { db } from "@/lib/db";
import { dummyPasswordCheck, verifyPassword } from "@/server/auth/password";
import { totemDaRequisicao } from "@/server/totem/dispositivos";

// Saída do modo quiosque.
//
// O totem fica em tela cheia e sem jeito de sair para o Windows. Quem
// precisa fechar (o dono, no fim do expediente) toca no canto escondido da
// tela e digita a senha do painel: a mesma que ele usa no site, sem senha
// nova para decorar e sem senha fixa no aplicativo.
//
// Quem vale: qualquer dono ativo deste restaurante. A conferência é aqui,
// no servidor, porque senha guardada dentro de um aplicativo instalado no
// balcão não é senha.

const tentativas = new Map<string, { contagem: number; ate: number }>();
const MAX_TENTATIVAS = 5;
const JANELA_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  const totem = await totemDaRequisicao(request);
  if (!totem) return Response.json({ erro: "totem não reconhecido" }, { status: 401 });

  const agora = Date.now();
  const registro = tentativas.get(totem.id);
  if (registro && registro.ate > agora && registro.contagem >= MAX_TENTATIVAS) {
    return Response.json({ erro: "Muitas tentativas. Espere alguns minutos." }, { status: 429 });
  }

  let corpo: { senha?: unknown };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return Response.json({ erro: "envie a senha" }, { status: 400 });
  }
  const senha = typeof corpo.senha === "string" ? corpo.senha : "";
  if (!senha) return Response.json({ erro: "Digite a senha do painel." }, { status: 400 });

  const donos = await db.restaurantOwner.findMany({
    where: { restaurantId: totem.restaurantId, user: { status: "ACTIVE" } },
    select: { user: { select: { passwordHash: true } } },
  });

  let liberado = false;
  for (const dono of donos) {
    if (await verifyPassword(senha, dono.user.passwordHash)) {
      liberado = true;
      break;
    }
  }
  // mesma demora quando o restaurante não tem dono ativo nenhum
  if (donos.length === 0) await dummyPasswordCheck(senha);

  if (!liberado) {
    if (!registro || registro.ate < agora) tentativas.set(totem.id, { contagem: 1, ate: agora + JANELA_MS });
    else registro.contagem += 1;
    return Response.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  tentativas.delete(totem.id);
  return Response.json({ ok: true });
}
