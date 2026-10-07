import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies, headers } from "next/headers";

import { db } from "@/lib/db";

// Sessão guardada no banco. O cookie leva um token aleatório de 256 bits;
// no banco fica só o hash dele, então um vazamento da tabela não entrega
// sessões válidas. Sair apaga a linha e a sessão morre na hora.

export const SESSION_COOKIE = "mf_sessao";
const SESSION_DAYS = 30;

/**
 * A sessão se renova sozinha enquanto a pessoa usa.
 *
 * Trinta dias contados do login derrubariam o garçom no meio de um
 * expediente, um mês depois de ele ter entrado -- e o celular dele fica no
 * bolso do avental, com o atalho do MenuFácil na tela inicial, justamente
 * para ele não digitar senha em hora de movimento. Cada visita empurra o
 * prazo para trinta dias à frente: quem usa toda semana nunca mais vê a
 * tela de login, e quem sumiu por um mês inteiro ainda cai dela, que é o
 * que se espera de um aparelho esquecido em algum lugar.
 *
 * A gravação só acontece depois que um terço do prazo passou, para não
 * escrever no banco a cada tela aberta.
 */
const RENOVAR_APOS_DIAS = 10;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;

  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, userAgent },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function readSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  const agora = new Date();
  if (session.expiresAt < agora) return null;

  const novoFim = new Date(agora.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const jaUsou = session.expiresAt.getTime() - agora.getTime() < (SESSION_DAYS - RENOVAR_APOS_DIAS) * 24 * 60 * 60 * 1000;
  if (jaUsou) {
    await db.session.update({ where: { id: session.id }, data: { expiresAt: novoFim }, select: { id: true } });

    // O cookie acompanha o banco; sem isto o navegador esqueceria o token
    // antes de a linha expirar, e a pessoa cairia na tela de login com uma
    // sessão ainda válida do outro lado.
    //
    // Mas o Next só deixa escrever cookie em Server Action ou Route
    // Handler, e esta função também roda no meio do desenho de uma página
    // -- ali o `set` lança, e a página inteira morre com "erro do
    // servidor". Era uma bomba de relógio: só começa a disparar dez dias
    // depois do login, então passou pelos testes e pela primeira semana
    // inteira de uso.
    //
    // Aqui a gravação do cookie é um extra, não a renovação em si: quem
    // renova é a linha no banco, que já foi salva acima. O painel dispara
    // ação de servidor o tempo todo (aceitar pedido, mudar status, abrir e
    // fechar a loja), e na primeira delas o cookie se acerta -- com vinte
    // dias de folga até ele vencer.
    try {
      (await cookies()).set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: novoFim,
      });
    } catch {
      // desenho de página: o cookie espera a próxima ação
    }

    return { ...session, expiresAt: novoFim };
  }

  return session;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

// Derruba todas as sessões do usuário: senha redefinida, conta bloqueada.
export function deleteAllSessions(userId: string) {
  return db.session.deleteMany({ where: { userId } });
}
