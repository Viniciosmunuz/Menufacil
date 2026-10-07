import "server-only";

import { cpfValido, formatCpf, soDigitos } from "@/lib/cpf";
import { db } from "@/lib/db";

import { hashPassword } from "../auth/password";

// Contas de garçom.
//
// Um login só no sistema inteiro, como manda o resto do MenuFácil: o garçom
// entra pela mesma tela do dono e o servidor decide para onde ele vai, pelo
// papel do vínculo com o restaurante (STAFF em vez de OWNER).
//
// A senha quem escolhe é o dono, e não há troca obrigatória no primeiro
// acesso. Esta é uma diferença deliberada em relação à conta do dono: o
// garçom recebe o login de viva voz no meio do expediente, e uma tela de
// "troque sua senha" no primeiro acesso, num celular, em hora de
// movimento, é o tipo de obstáculo que faz o restaurante desistir do
// recurso. A conta não vê caixa, relatório nem cardápio -- o que ela faz é
// lançar pedido em mesa.

export type NovoGarcom = { nome: string; cpf: string; senha: string; podeExcluirItem: boolean; podeFinalizarMesa: boolean };
export type ResultadoDoGarcom = { ok: true; login: string; cpf: string } | { ok: false; error: string };

/**
 * O identificador interno a partir do CPF.
 *
 * O garçom digita o CPF na tela de login, e o servidor o transforma nisto
 * antes de procurar a conta. O endereço nunca aparece para ele: é só o que
 * o sistema usa por dentro, porque a tabela de usuários identifica todo
 * mundo por e-mail desde o começo e trocar isso mexeria no login do dono,
 * do admin e do totem -- um risco sem retorno para resolver um campo.
 */
export function loginDoGarcom(cpf: string, slug: string) {
  return `${soDigitos(cpf)}@${slug}.garcom`;
}

export async function criarGarcom(restaurantId: string, slug: string, dados: NovoGarcom): Promise<ResultadoDoGarcom> {
  const nome = dados.nome.trim();
  const cpf = soDigitos(dados.cpf);
  const senha = dados.senha;

  if (nome.length < 2) return { ok: false, error: "Diga o nome do garçom. É ele que sai na comanda." };
  if (!cpfValido(cpf)) return { ok: false, error: "Esse CPF não confere. Confira os números." };
  if (senha.length < 4) return { ok: false, error: "A senha precisa de pelo menos 4 caracteres." };

  const login = loginDoGarcom(cpf, slug);
  const existe = await db.user.findUnique({ where: { email: login }, select: { id: true } });
  if (existe) return { ok: false, error: "Esse CPF já está cadastrado neste restaurante." };

  await db.user.create({
    data: {
      name: nome,
      email: login,
      passwordHash: await hashPassword(senha),
      role: "RESTAURANT_OWNER",
      mustChangePassword: false,
      // STAFF é o que mantém o garçom fora do painel do dono
      ownerships: {
        create: {
          restaurantId,
          role: "STAFF",
          podeExcluirItem: dados.podeExcluirItem,
          podeFinalizarMesa: dados.podeFinalizarMesa,
        },
      },
    },
    select: { id: true },
  });

  return { ok: true, login, cpf: formatCpf(cpf) };
}

export async function listarGarcons(restaurantId: string) {
  const vinculos = await db.restaurantOwner.findMany({
    where: { restaurantId, role: "STAFF" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      podeExcluirItem: true,
      podeFinalizarMesa: true,
      user: { select: { id: true, name: true, email: true, status: true, lastLoginAt: true } },
    },
  });
  return vinculos.map((v) => ({
    vinculoId: v.id,
    id: v.user.id,
    nome: v.user.name,
    // o e-mail interno não interessa a ninguém; o que o dono reconhece é o CPF
    cpf: formatCpf(v.user.email.split("@")[0]),
    ativo: v.user.status === "ACTIVE",
    ultimoAcesso: v.user.lastLoginAt,
    podeExcluirItem: v.podeExcluirItem,
    podeFinalizarMesa: v.podeFinalizarMesa,
  }));
}

/**
 * Muda o que um garçom pode fazer.
 *
 * As duas permissões se ligam e desligam a qualquer momento, sem recriar a
 * conta: a confiança do dono num garçom muda com o tempo, e refazer o
 * cadastro para isso perderia o histórico de quem atendeu qual mesa.
 *
 * O CPF e a senha não se editam aqui. O CPF é a identidade do login, e
 * trocá-lo é cadastrar outra pessoa; senha nova é conversa de quem esqueceu
 * a dela, não de permissão.
 */
export async function mudarPermissoes(
  restaurantId: string,
  vinculoId: string,
  permissoes: { podeExcluirItem: boolean; podeFinalizarMesa: boolean },
): Promise<{ ok: true; nome: string | null } | { ok: false; error: string }> {
  const vinculo = await db.restaurantOwner.findFirst({
    where: { id: vinculoId, restaurantId, role: "STAFF" },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!vinculo) return { ok: false, error: "Garçom não encontrado." };

  await db.restaurantOwner.update({
    where: { id: vinculo.id },
    data: { podeExcluirItem: permissoes.podeExcluirItem, podeFinalizarMesa: permissoes.podeFinalizarMesa },
    select: { id: true },
  });
  return { ok: true, nome: vinculo.user.name };
}
