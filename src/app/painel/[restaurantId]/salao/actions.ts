"use server";

import { refresh } from "next/cache";

import type { LugarTipo } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requireSalao } from "@/server/auth/dal";
import { panelAudit } from "@/server/panel";
import { criarGarcom } from "@/server/salao/garcons";

// Ações do salão. Toda uma delas passa por requireSalao: esconder o botão
// não impede ninguém de chamar a ação direto, e aqui se mexe com dinheiro.

export type SalaoFormState = { ok?: boolean; error?: string; message?: string };

/** ninguém tem mil mesas; o teto existe para um dedo escorregado não criar um salão inteiro */
const MAXIMO = 120;

/**
 * Quantas mesas (ou lugares de balcão) o salão tem.
 *
 * Numerar à mão de 1 a 30 é trabalho que o sistema pode fazer: o dono diz
 * "trinta" e elas nascem numeradas. Aumentar acrescenta no fim; diminuir
 * tira as últimas -- e nunca tira uma que esteja com gente, porque uma mesa
 * ocupada apagada no meio do movimento leva a conta junto.
 */
export async function definirQuantidade(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  const tipo = (formData.get("tipo") === "BALCAO" ? "BALCAO" : "MESA") as LugarTipo;
  const alvo = Number(formData.get("quantidade"));
  const nome = tipo === "BALCAO" ? "lugares de balcão" : "mesas";

  if (!Number.isInteger(alvo) || alvo < 0 || alvo > MAXIMO) {
    return { error: `Diga um número de 0 a ${MAXIMO}.` };
  }

  const atuais = await db.mesa.findMany({
    where: { restaurantId, tipo },
    orderBy: { numero: "asc" },
    select: { id: true, numero: true, comandas: { where: { fechadaAt: null }, select: { id: true }, take: 1 } },
  });

  if (alvo > atuais.length) {
    const ultimo = atuais.at(-1)?.numero ?? 0;
    await db.mesa.createMany({
      data: Array.from({ length: alvo - atuais.length }, (_, i) => ({
        restaurantId,
        tipo,
        numero: ultimo + i + 1,
        lugares: tipo === "BALCAO" ? 1 : 4,
        sortOrder: ultimo + i + 1,
      })),
    });
    await panelAudit(acesso, "salao.quantidade", { tipo, de: atuais.length, para: alvo });
    refresh();
    return { ok: true, message: `Agora são ${alvo} ${nome}.` };
  }

  if (alvo < atuais.length) {
    const sobrando = atuais.slice(alvo);
    const comGente = sobrando.filter((m) => m.comandas.length > 0);
    if (comGente.length > 0) {
      const quais = comGente.map((m) => m.numero).join(", ");
      return { error: `Não dá para tirar agora: ${comGente.length === 1 ? "a de número" : "as de número"} ${quais} ${comGente.length === 1 ? "está" : "estão"} com comanda aberta.` };
    }
    await db.mesa.deleteMany({ where: { id: { in: sobrando.map((m) => m.id) } } });
    await panelAudit(acesso, "salao.quantidade", { tipo, de: atuais.length, para: alvo });
    refresh();
    return { ok: true, message: `Agora são ${alvo} ${nome}.` };
  }

  return { ok: true, message: "Nada mudou." };
}

/**
 * Cria a conta de um garçom.
 *
 * O dono escolhe o usuário e a senha e entrega os dois de viva voz. Não há
 * segunda tela de login: o garçom entra pela mesma do restaurante, e o
 * servidor manda para a tela dele por causa do papel STAFF.
 */
export async function adicionarGarcom(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  // cadastrar gente é coisa de dono; garçom nenhum cria garçom
  if (acesso.papel === "STAFF") return { error: "Só o dono do restaurante pode cadastrar garçons." };

  const r = await criarGarcom(restaurantId, acesso.restaurant.slug, {
    nome: String(formData.get("nome") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    senha: String(formData.get("senha") ?? ""),
    // nascem desligadas: o dono marca uma a uma para quem ele confia
    podeExcluirItem: formData.get("podeExcluirItem") === "on",
    podeFinalizarMesa: formData.get("podeFinalizarMesa") === "on",
  });
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.garcom_novo", { nome: String(formData.get("nome") ?? ""), cpf: r.cpf });
  refresh();
  return { ok: true, message: `Garçom cadastrado. Ele entra com o CPF ${r.cpf} e a senha que você definiu.` };
}

/**
 * Dá um nome à mesa.
 *
 * "Mesa 7" serve até o salão ter a mesa da varanda, a do fundo e a dos
 * fregueses de sempre -- e aí o garçom fala pelo nome, não pelo número. O
 * número continua sendo quem identifica: o nome é um apelido por cima.
 *
 * Some quando o dono zera a quantidade de mesas e cria de novo, porque ali
 * as mesas são outras.
 */
export async function renomearMesa(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  const mesaId = String(formData.get("mesaId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim().slice(0, 40);

  const mesa = await db.mesa.findFirst({ where: { id: mesaId, restaurantId }, select: { id: true, numero: true } });
  if (!mesa) return { error: "Mesa não encontrada." };

  await db.mesa.update({ where: { id: mesa.id }, data: { nome: nome || null }, select: { id: true } });
  await panelAudit(acesso, "salao.mesa_nome", { numero: mesa.numero, nome: nome || null });
  refresh();
  return { ok: true, message: nome ? `Agora é "${nome}".` : "Nome removido." };
}
