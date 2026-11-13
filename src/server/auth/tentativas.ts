import "server-only";

import { headers } from "next/headers";

import { db } from "@/lib/db";

/**
 * O freio da tela de entrar.
 *
 * Sem ele, a senha de qualquer conta podia ser testada sem pausa. O hash
 * é lento de propósito, mas lento para uma tentativa não é lento para
 * dez mil ao longo de uma noite.
 *
 * **Dois tetos, porque cada um sozinho tem um furo.**
 *
 * - Por login **e** endereço: é o que para a pessoa (ou o script) que
 *   está tentando. Baixo, porque ninguém erra a própria senha oito
 *   vezes em quinze minutos.
 * - Só por login: pega quem troca de endereço a cada tentativa. Bem mais
 *   alto, e de propósito -- se este fosse baixo, qualquer um trancaria o
 *   dono do lado de fora do próprio painel digitando o e-mail dele com
 *   senha errada, na hora do movimento.
 *
 * Não conta por endereço sozinho: restaurante inteiro, garçom e
 * entregador saem pela mesma internet, e o erro de um trancaria todos.
 *
 * **Se o banco falhar aqui, o login segue.** Este arquivo é um freio, e
 * freio com defeito não pode virar porta trancada: um erro de consulta
 * deixaria o sistema inteiro sem entrar.
 */

const JANELA_MIN = 15;
const TETO_DO_PAR = 8;
const TETO_DO_LOGIN = 40;

/** linhas mais velhas que isto não servem para conta nenhuma */
const GUARDA_MS = 24 * 60 * 60 * 1000;

export const chaveDoLogin = (digitado: string) => digitado.trim().toLowerCase().slice(0, 120);

async function enderecoDeQuemChama() {
  try {
    const h = await headers();
    // Na Vercel o primeiro da lista é quem chamou; os seguintes são os
    // intermediários por onde o pedido passou.
    return h.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 60) || h.get("x-real-ip") || "?";
  } catch {
    return "?";
  }
}

/** quantos minutos falta para poder tentar de novo; 0 = pode tentar */
export async function esperaParaTentar(digitado: string): Promise<number> {
  const login = chaveDoLogin(digitado);
  if (!login) return 0;

  try {
    const ip = await enderecoDeQuemChama();
    const desde = new Date(Date.now() - JANELA_MIN * 60_000);

    const [doPar, doLogin, maisAntiga] = await Promise.all([
      db.tentativaDeLogin.count({ where: { login, ip, createdAt: { gte: desde } } }),
      db.tentativaDeLogin.count({ where: { login, createdAt: { gte: desde } } }),
      db.tentativaDeLogin.findFirst({
        where: { login, createdAt: { gte: desde } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);

    if (doPar < TETO_DO_PAR && doLogin < TETO_DO_LOGIN) return 0;

    // a janela anda: libera quando a tentativa mais antiga sair dela
    const libera = (maisAntiga?.createdAt.getTime() ?? Date.now()) + JANELA_MIN * 60_000;
    return Math.max(1, Math.ceil((libera - Date.now()) / 60_000));
  } catch (erro) {
    console.error("[login] falha ao contar tentativas; seguindo sem o freio:", erro);
    return 0;
  }
}

/** anota uma senha errada */
export async function anotarTentativa(digitado: string) {
  const login = chaveDoLogin(digitado);
  if (!login) return;
  try {
    const ip = await enderecoDeQuemChama();
    await db.tentativaDeLogin.create({ data: { login, ip } });
    // A faxina mora aqui, e não num agendamento: só roda quando alguém
    // erra a senha, que é exatamente quando a tabela cresce.
    await db.tentativaDeLogin.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - GUARDA_MS) } } });
  } catch (erro) {
    console.error("[login] falha ao anotar a tentativa:", erro);
  }
}

/** entrou: as tentativas erradas deste login, deste endereço, deixam de contar */
export async function esquecerTentativas(digitado: string) {
  const login = chaveDoLogin(digitado);
  if (!login) return;
  try {
    const ip = await enderecoDeQuemChama();
    await db.tentativaDeLogin.deleteMany({ where: { login, ip } });
  } catch (erro) {
    console.error("[login] falha ao limpar as tentativas:", erro);
  }
}
