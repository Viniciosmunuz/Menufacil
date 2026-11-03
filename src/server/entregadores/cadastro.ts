import "server-only";

import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";

import { hashPassword } from "../auth/password";

// Contas de entregador.
//
// O molde é o do garçom (`src/server/salao/garcons.ts`): um login só no
// sistema inteiro, o dono escolhe a senha e não há troca obrigatória no
// primeiro acesso -- quem recebe o login de viva voz, no meio do
// expediente, não passa por tela de "troque sua senha" num celular.
//
// A diferença está no vínculo: o garçom ganha um RestaurantOwner com papel
// STAFF, e o entregador **não ganha vínculo nenhum**. Sem vínculo, o painel
// do dono e a tela do garçom recusam a conta sozinhos, e a única porta que
// abre é a dele. O isolamento sai da forma, e não de uma regra nova.

export type DadosDoEntregador = {
  nome: string;
  telefone: string;
  senha?: string;
  moto?: string;
  cor?: string;
  placa?: string;
  fotoUrl?: string | null;
};

export type ResultadoDoEntregador = { ok: true; login: string; devolta: boolean } | { ok: false; error: string };

/**
 * O identificador interno a partir do telefone.
 *
 * O entregador digita o telefone na tela de entrar, e o servidor o
 * transforma nisto antes de procurar a conta. O endereço nunca aparece para
 * ele: a tabela de usuários identifica todo mundo por e-mail desde o
 * começo, e mexer nisso mexeria no login do dono, do admin e do garçom.
 */
export function loginDoEntregador(telefone: string, slug: string) {
  return `${normalizePhone(telefone)}@${slug}.entregador`;
}

/** o telefone precisa ser um celular brasileiro de verdade: DDD + 9 dígitos */
function telefoneValido(digitos: string) {
  if (!digitos.startsWith("55")) return false;
  const local = digitos.slice(2);
  return local.length === 11 && local[2] === "9" && Number(local.slice(0, 2)) >= 11;
}

function conferir(dados: DadosDoEntregador, { comSenha }: { comSenha: boolean }) {
  const nome = dados.nome.trim();
  const telefone = normalizePhone(dados.telefone);
  if (nome.length < 2) return { error: "Diga o nome do entregador. É ele que o cliente vê chegando." } as const;
  if (!telefoneValido(telefone)) return { error: "Esse telefone não confere. Precisa ser o celular com DDD." } as const;
  if (comSenha && (dados.senha ?? "").length < 4) return { error: "A senha precisa de pelo menos 4 caracteres." } as const;
  // a placa não é validada contra o padrão Mercosul de propósito: moto
  // velha, placa suja e letra trocada acontecem, e barrar o cadastro por
  // causa disso só faria o dono desistir de preencher
  return {
    error: null,
    dados: {
      nome,
      telefone,
      moto: dados.moto?.trim() || null,
      corDaMoto: dados.cor?.trim() || null,
      placa: dados.placa?.trim().toUpperCase() || null,
      fotoUrl: dados.fotoUrl || null,
    },
  } as const;
}

export async function criarEntregador(restaurantId: string, slug: string, entrada: DadosDoEntregador): Promise<ResultadoDoEntregador> {
  const conferido = conferir(entrada, { comSenha: true });
  if (conferido.error) return { ok: false, error: conferido.error };
  const { nome, telefone, moto, corDaMoto, placa, fotoUrl } = conferido.dados;

  const jaTem = await db.entregador.findUnique({ where: { restaurantId_telefone: { restaurantId, telefone } }, select: { id: true } });
  if (jaTem) return { ok: false, error: "Esse telefone já está cadastrado neste restaurante." };

  const login = loginDoEntregador(telefone, slug);
  const passwordHash = await hashPassword(entrada.senha!);
  const conta = await db.user.findUnique({ where: { email: login }, select: { id: true } });

  // entregador que saiu e voltou: a conta é a mesma, com a senha de agora.
  // As entregas antigas continuam no nome dele, que é a razão de o cadastro
  // ser desativado e nunca apagado.
  if (conta) {
    await db.user.update({
      where: { id: conta.id },
      data: {
        name: nome,
        passwordHash,
        status: "ACTIVE",
        mustChangePassword: false,
        entregador: { create: { restaurantId, nome, telefone, moto, corDaMoto, placa, fotoUrl } },
      },
      select: { id: true },
    });
    return { ok: true, login, devolta: true };
  }

  await db.user.create({
    data: {
      name: nome,
      email: login,
      passwordHash,
      role: "RESTAURANT_OWNER",
      mustChangePassword: false,
      entregador: { create: { restaurantId, nome, telefone, moto, corDaMoto, placa, fotoUrl } },
    },
    select: { id: true },
  });
  return { ok: true, login, devolta: false };
}

/**
 * Muda o cadastro. O telefone é o login, então mexer nele mexe no e-mail da
 * conta -- e por isso a conta e o cadastro andam juntos, numa transação só.
 */
export async function atualizarEntregador(
  restaurantId: string,
  slug: string,
  entregadorId: string,
  entrada: DadosDoEntregador,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const conferido = conferir(entrada, { comSenha: false });
  if (conferido.error) return { ok: false, error: conferido.error };
  const { nome, telefone, moto, corDaMoto, placa, fotoUrl } = conferido.dados;

  const atual = await db.entregador.findFirst({ where: { id: entregadorId, restaurantId }, select: { id: true, userId: true, telefone: true } });
  if (!atual) return { ok: false, error: "Esse entregador não está mais no cadastro." };

  if (telefone !== atual.telefone) {
    const ocupado = await db.entregador.findUnique({ where: { restaurantId_telefone: { restaurantId, telefone } }, select: { id: true } });
    if (ocupado) return { ok: false, error: "Esse telefone já está cadastrado neste restaurante." };
  }

  await db.$transaction([
    db.entregador.update({ where: { id: atual.id }, data: { nome, telefone, moto, corDaMoto, placa, fotoUrl } }),
    db.user.update({ where: { id: atual.userId }, data: { name: nome, email: loginDoEntregador(telefone, slug) } }),
  ]);
  return { ok: true };
}

export async function trocarSenhaDoEntregador(
  restaurantId: string,
  entregadorId: string,
  senha: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (senha.length < 4) return { ok: false, error: "A senha precisa de pelo menos 4 caracteres." };
  const alvo = await db.entregador.findFirst({ where: { id: entregadorId, restaurantId }, select: { userId: true } });
  if (!alvo) return { ok: false, error: "Esse entregador não está mais no cadastro." };

  // as sessões caem junto: trocar a senha é o que o dono faz quando o
  // celular do entregador sumiu, e deixar o aparelho perdido aberto seria
  // justamente o que ele veio impedir
  await db.$transaction([
    db.user.update({ where: { id: alvo.userId }, data: { passwordHash: await hashPassword(senha), mustChangePassword: false } }),
    db.session.deleteMany({ where: { userId: alvo.userId } }),
  ]);
  return { ok: true };
}

/**
 * Liga e desliga o acesso.
 *
 * Desligado, a conta existe e não abre nada: o aparelho que estiver com a
 * tela aberta para de funcionar no mesmo instante, que é a razão de o dono
 * ter vindo até aqui. O cadastro fica -- apagá-lo tiraria o nome dele das
 * entregas que já fez.
 */
export async function ligarEntregador(restaurantId: string, entregadorId: string, ativo: boolean) {
  const alvo = await db.entregador.findFirst({ where: { id: entregadorId, restaurantId }, select: { id: true, userId: true } });
  if (!alvo) return { ok: false as const, error: "Esse entregador não está mais no cadastro." };

  await db.$transaction([
    db.entregador.update({
      where: { id: alvo.id },
      // desligar derruba também a disponibilidade: quem volta amanhã entra
      // como indisponível e diz na hora que está na rua
      data: ativo ? { ativo: true } : { ativo: false, disponibilidade: "INDISPONIVEL" },
    }),
    ...(ativo ? [] : [db.session.deleteMany({ where: { userId: alvo.userId } })]),
  ]);
  return { ok: true as const };
}
