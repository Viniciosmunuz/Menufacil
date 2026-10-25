import "server-only";

import type { NivelGarcom } from "@/generated/prisma/enums";
import { cpfValido, formatCpf, soDigitos } from "@/lib/cpf";
import { db } from "@/lib/db";
import { permissoesDoVinculo } from "@/lib/permissoes-salao";

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

export type NovoGarcom = { nome: string; cpf: string; senha: string; nivel: NivelGarcom };
export type ResultadoDoGarcom = { ok: true; login: string; cpf: string; devolta: boolean } | { ok: false; error: string };

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
  const conta = await db.user.findUnique({
    where: { email: login },
    select: { id: true, ownerships: { where: { restaurantId }, select: { id: true } } },
  });

  // só é "já cadastrado" quem ainda está na equipe; a conta de quem saiu
  // continua existindo apenas para as comandas antigas não perderem o nome
  if (conta && conta.ownerships.length > 0) return { ok: false, error: "Esse CPF já está cadastrado neste restaurante." };

  const passwordHash = await hashPassword(senha);
  const segundo = dados.nivel === "GARCOM_II";
  const vinculo = {
    restaurantId,
    // STAFF é o que mantém o garçom fora do painel do dono
    role: "STAFF" as const,
    nivel: dados.nivel,
    // as colunas antigas acompanham o nível: elas continuam no banco, e
    // deixá-las defasadas confundiria quem for ler a tabela amanhã
    podeExcluirItem: segundo,
    podeFinalizarMesa: segundo,
  };

  if (conta) {
    // garçom que saiu e voltou. A conta é a mesma, com o nome, a senha e as
    // permissões de agora -- e as mesas que ele atendeu continuam no nome
    // dele, que é o motivo de não apagarmos a conta na saída.
    await db.user.update({
      where: { id: conta.id },
      data: { name: nome, passwordHash, status: "ACTIVE", mustChangePassword: false, ownerships: { create: vinculo } },
      select: { id: true },
    });
    return { ok: true, login, cpf: formatCpf(cpf), devolta: true };
  }

  await db.user.create({
    data: {
      name: nome,
      email: login,
      passwordHash,
      role: "RESTAURANT_OWNER",
      mustChangePassword: false,
      ownerships: { create: vinculo },
    },
    select: { id: true },
  });

  return { ok: true, login, cpf: formatCpf(cpf), devolta: false };
}

/**
 * Tira o garçom da equipe.
 *
 * O vínculo com o restaurante some e as sessões caem na hora: o aparelho
 * que estiver com a conta aberta para de lançar pedido no mesmo instante, que
 * é a razão de o dono ter vindo até aqui.
 *
 * A conta de usuário fica, desativada. Apagá-la levaria junto o nome do
 * garçom nas comandas que ele atendeu -- o banco limpa a referência quando
 * o usuário some --, e o fechamento do mês passado passaria a dizer que
 * ninguém atendeu aquelas mesas. Como o login é o CPF, recontratar a mesma
 * pessoa reaproveita esta conta e devolve o histórico junto.
 */
export async function tirarGarcom(
  restaurantId: string,
  vinculoId: string,
): Promise<{ ok: true; nome: string | null } | { ok: false; error: string }> {
  const vinculo = await db.restaurantOwner.findFirst({
    where: { id: vinculoId, restaurantId, role: "STAFF" },
    select: { id: true, userId: true, user: { select: { name: true } } },
  });
  if (!vinculo) return { ok: false, error: "Garçom não encontrado." };

  await db.$transaction([
    db.restaurantOwner.delete({ where: { id: vinculo.id } }),
    db.user.update({ where: { id: vinculo.userId }, data: { status: "DISABLED" }, select: { id: true } }),
    db.session.deleteMany({ where: { userId: vinculo.userId } }),
  ]);

  return { ok: true, nome: vinculo.user.name };
}

export async function listarGarcons(restaurantId: string) {
  const vinculos = await db.restaurantOwner.findMany({
    where: { restaurantId, role: "STAFF" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      nivel: true,
      permissoes: true,
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
    nivel: v.nivel,
    // vazio no banco quer dizer "siga o nível": a leitura resolve isso
    permissoes: permissoesDoVinculo(v.nivel, v.permissoes),
  }));
}


/**
 * Muda o nível de um garçom.
 *
 * Sobe e desce a qualquer momento, sem recriar a conta: a confiança do dono
 * num garçom muda com o tempo, e refazer o cadastro para isso perderia o
 * histórico de quem atendeu qual mesa.
 *
 * O CPF e a senha não se editam aqui. O CPF é a identidade do login, e
 * trocá-lo é cadastrar outra pessoa; senha nova é conversa de quem esqueceu
 * a dela, não de nível.
 */
export async function mudarNivel(
  restaurantId: string,
  vinculoId: string,
  nivel: NivelGarcom,
): Promise<{ ok: true; nome: string | null } | { ok: false; error: string }> {
  const vinculo = await db.restaurantOwner.findFirst({
    where: { id: vinculoId, restaurantId, role: "STAFF" },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!vinculo) return { ok: false, error: "Garçom não encontrado." };

  const segundo = nivel === "GARCOM_II";
  await db.restaurantOwner.update({
    where: { id: vinculo.id },
    data: { nivel, podeExcluirItem: segundo, podeFinalizarMesa: segundo },
    select: { id: true },
  });
  return { ok: true, nome: vinculo.user.name };
}
