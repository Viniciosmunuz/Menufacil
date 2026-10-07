"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import type { LugarTipo } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { parseMoneyToCents } from "@/lib/validation";
import { requireSalao } from "@/server/auth/dal";
import { panelAudit } from "@/server/panel";
import { criarGarcom, mudarPermissoes } from "@/server/salao/garcons";
import { lancarNaMesa } from "@/server/salao/lancar";
import {
  ajustarConta,
  apagarItemDaComanda,
  desfazerRecebimento,
  liberarMesa,
  receberNaMesa,
  FORMAS,
  NOME_DA_FORMA,
  type FormaNaMesa,
} from "@/server/salao/pagamento";
import { abrirTurno, fecharTurno, turnoAberto } from "@/server/salao/turno";

// Ações do salão. Toda uma delas passa por requireSalao: esconder o botão
// não impede ninguém de chamar a ação direto, e aqui se mexe com dinheiro.

export type SalaoFormState = { ok?: boolean; error?: string; message?: string; fechamentoId?: string };

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

/** Abre o caixa do salão. Só o dono: é ele que conta o dinheiro da gaveta. */
export async function abrirCaixa(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  if (acesso.papel === "STAFF") return { error: "Só o dono do restaurante abre o caixa." };

  const cents = parseMoneyToCents(String(formData.get("abertura") ?? "0")) ?? 0;
  const r = await abrirTurno(restaurantId, acesso.user.id, cents);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.caixa_abriu", { aberturaCents: cents });
  refresh();
  return { ok: true, message: "Caixa aberto. O salão já pode receber pedidos." };
}

/** Fecha o caixa da noite, com o que sobrou na gaveta. */
export async function fecharCaixa(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  if (!acesso.pode.finalizarMesa) return { error: "Você não tem permissão para fechar o caixa." };

  const r = await fecharTurno(restaurantId, acesso.user.id);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.caixa_fechou", { caixaId: r.caixaId ?? null });
  refresh();

  // Fechou: a tela vira a via da noite, que sai sozinha na impressora.
  //
  // Era uma aba nova aberta pelo formulário, e não funcionava: fechar o
  // caixa faz a página do salão voltar a ser o pedido de abrir, e o
  // formulário some antes de chegar a abrir a aba. O caminho que não
  // depende de nada sobreviver é este -- o papel é a última coisa da
  // noite, e de lá se volta ao salão por um botão.
  redirect(`/painel/${restaurantId}/salao/fechamento/${r.caixaId}`);
}

/**
 * Salva o que o garçom escolheu: vira pedido e vai para a cozinha.
 *
 * Os itens chegam como JSON num campo escondido porque são uma lista de
 * tamanho variável, e o preço de cada um é lido do banco aqui dentro -- o
 * que a tela manda é o que a pessoa escolheu, nunca quanto custa.
 */
export async function lancarItens(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);

  const turno = await turnoAberto(restaurantId);
  if (!turno) return { error: "O salão está fechado. O caixa precisa ser aberto antes." };

  const mesaId = String(formData.get("mesaId") ?? "");
  let itens: { produtoId: string; quantidade: number; observacao?: string | null; opcoes?: string[] }[] = [];
  try {
    const cru = JSON.parse(String(formData.get("itens") ?? "[]")) as unknown;
    if (Array.isArray(cru)) {
      itens = cru
        .filter((i): i is Record<string, unknown> => !!i && typeof i === "object" && "produtoId" in i)
        .map((i) => ({
          produtoId: String(i.produtoId),
          quantidade: Number(i.quantidade) || 1,
          observacao: typeof i.observacao === "string" ? i.observacao : null,
          opcoes: Array.isArray(i.opcoes) ? i.opcoes.map(String) : [],
        }));
    }
  } catch {
    return { error: "Não consegui ler os itens. Tente de novo." };
  }

  const r = await lancarNaMesa(restaurantId, mesaId, acesso.user.id, itens);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.lancou", { mesaId, pedido: r.numero, itens: itens.length });
  refresh();
  return { ok: true, message: `Pedido #${r.numero} enviado para a cozinha.` };
}

/**
 * Lança um recebimento na mesa.
 *
 * Garçom recebe: é disso que o trabalho dele é feito, e é ele que está com
 * a maquininha na mão. O que ele não faz sem permissão é liberar a mesa e
 * apagar item -- as duas ações que mexem no que já entrou no caixa.
 */
export async function receberPagamento(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);

  const comandaId = String(formData.get("comandaId") ?? "");
  const forma = String(formData.get("forma") ?? "");
  if (!FORMAS.some((f) => f.chave === forma)) return { error: "Escolha a forma de pagamento." };

  const cents = parseMoneyToCents(String(formData.get("valor") ?? ""));
  if (cents === null) return { error: "Diga quanto está recebendo." };

  const r = await receberNaMesa(restaurantId, comandaId, acesso.user.id, forma as FormaNaMesa, cents);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.recebeu", { comandaId, forma, centavos: cents });
  refresh();
  return { ok: true, message: `${NOME_DA_FORMA[forma as FormaNaMesa]}: ${formatCents(cents)} recebido.` };
}

/** Desfaz um recebimento digitado errado. */
export async function desfazerPagamento(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  // tirar dinheiro lançado é o avesso de finalizar a mesa: mesma confiança
  if (!acesso.pode.finalizarMesa) return { error: "Só quem pode finalizar a mesa desfaz um recebimento." };

  const r = await desfazerRecebimento(restaurantId, String(formData.get("pagamentoId") ?? ""));
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.desfez_recebimento", { pagamentoId: String(formData.get("pagamentoId") ?? "") });
  refresh();
  return { ok: true, message: "Recebimento desfeito." };
}

/** Libera a mesa para a próxima pessoa. Só com a conta coberta. */
export async function finalizarMesa(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  if (!acesso.pode.finalizarMesa) return { error: "Você não tem permissão para finalizar a mesa." };

  const comandaId = String(formData.get("comandaId") ?? "");
  const r = await liberarMesa(restaurantId, comandaId);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.finalizou_mesa", { comandaId });
  refresh();
  return { ok: true, message: "Mesa liberada." };
}

/** Apaga um item da comanda. Permissão por garçom, desligada de nascença. */
export async function apagarItem(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  if (!acesso.pode.excluirItem) return { error: "Você não tem permissão para apagar item da comanda." };

  const itemId = String(formData.get("itemId") ?? "");
  const r = await apagarItemDaComanda(restaurantId, itemId, acesso.user.id);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.apagou_item", { itemId });
  refresh();
  return { ok: true, message: "Item apagado da conta." };
}

/** Desconto e acréscimo da mesa. Mesma confiança de finalizar. */
export async function ajustarAConta(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  if (!acesso.pode.finalizarMesa) return { error: "Você não tem permissão para dar desconto." };

  const comandaId = String(formData.get("comandaId") ?? "");
  const desconto = parseMoneyToCents(String(formData.get("desconto") ?? "0")) ?? 0;
  const servico = parseMoneyToCents(String(formData.get("servico") ?? "0")) ?? 0;

  const r = await ajustarConta(restaurantId, comandaId, desconto, servico);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.ajustou_conta", { comandaId, desconto, servico });
  refresh();
  return { ok: true, message: "Conta ajustada." };
}

/** Liga e desliga as permissões de um garçom já cadastrado. */
export async function editarGarcom(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  // mexer em permissão é coisa de dono; garçom nenhum muda a própria
  if (acesso.papel === "STAFF") return { error: "Só o dono do restaurante muda as permissões." };

  const vinculoId = String(formData.get("vinculoId") ?? "");
  const permissoes = {
    podeExcluirItem: formData.get("podeExcluirItem") === "on",
    podeFinalizarMesa: formData.get("podeFinalizarMesa") === "on",
  };

  const r = await mudarPermissoes(restaurantId, vinculoId, permissoes);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.garcom_permissoes", { vinculoId, ...permissoes });
  refresh();
  return { ok: true, message: `Permissões de ${r.nome ?? "o garçom"} salvas.` };
}
