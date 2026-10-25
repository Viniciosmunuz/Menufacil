"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import type { LugarTipo } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { parseMoneyToCents } from "@/lib/validation";
import { requireSalao } from "@/server/auth/dal";
import { panelAudit } from "@/server/panel";
import { criarGarcom, mudarNivel, tirarGarcom } from "@/server/salao/garcons";
import { apagarComanda, moverItens, trocarDeMesa } from "@/server/salao/mexer";
import { mesaDaComanda, rotuloDaMesaPorId, textoDosItens } from "@/server/salao/historico";
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

// O que vai para o histórico: a mesa, os itens e os valores ficam gravados
// junto da ação, do jeito que eram naquela hora. Ler depois pelo id não
// serve -- a comanda muda de mesa, o item apagado some.

/** os itens de uma lista de ids, em "2x X-Burger, 1x Coca" */
async function itensParaOHistorico(restaurantId: string, itemIds: string[]) {
  const itens = await db.orderItem.findMany({
    where: { id: { in: itemIds }, order: { restaurantId } },
    select: { quantity: true, productName: true },
  });
  return textoDosItens(itens.map((i) => ({ quantidade: i.quantity, nome: i.productName })));
}

/** o que a comanda soma agora, sem os pedidos cancelados */
async function totalDaComanda(comandaId: string) {
  const r = await db.order.aggregate({ where: { comandaId, status: { not: "CANCELED" } }, _sum: { totalCents: true } });
  return r._sum.totalCents ?? 0;
}

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
    // nasce no nível de baixo: subir é um toque, e o contrário de subir
    // é descobrir no fim da noite que a conta foi zerada por engano
    nivel: formData.get("nivel") === "GARCOM_II" ? "GARCOM_II" : "GARCOM",
  });
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.garcom_novo", { nome: String(formData.get("nome") ?? ""), cpf: r.cpf, devolta: r.devolta });
  refresh();
  return {
    ok: true,
    message: r.devolta
      ? `Garçom de volta à equipe. Ele entra com o CPF ${r.cpf} e a senha que você acabou de definir.`
      : `Garçom cadastrado. Ele entra com o CPF ${r.cpf} e a senha que você definiu.`,
  };
}

/**
 * Tira o garçom da equipe.
 *
 * Fim de contrato acontece, e até então o dono não tinha como desfazer um
 * cadastro: o celular do garçom continuava lançando pedido, e o CPF dele
 * ficava preso, sem deixar nem cadastrá-lo de novo com outra senha.
 */
export async function tirarGarcomDaEquipe(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  // mexer na equipe é coisa de dono; garçom nenhum tira outro
  if (acesso.papel === "STAFF") return { error: "Só o dono do restaurante mexe na equipe." };

  const vinculoId = String(formData.get("vinculoId") ?? "");
  const r = await tirarGarcom(restaurantId, vinculoId);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.garcom_removido", { vinculoId, nome: r.nome });
  refresh();
  return { ok: true, message: `${r.nome ?? "O garçom"} saiu da equipe. O aparelho perde o acesso na hora.` };
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

  const [pedido, mesa] = await Promise.all([
    db.order.findUnique({ where: { id: r.orderId }, select: { totalCents: true, items: { select: { quantity: true, productName: true } } } }),
    rotuloDaMesaPorId(restaurantId, mesaId),
  ]);
  await panelAudit(acesso, "salao.lancou", {
    mesaId,
    mesa,
    pedido: r.numero,
    itens: itens.length,
    itensTexto: pedido ? textoDosItens(pedido.items.map((i) => ({ quantidade: i.quantity, nome: i.productName }))) : null,
    centavos: pedido?.totalCents ?? null,
  });
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

  await panelAudit(acesso, "salao.recebeu", { comandaId, ...(await mesaDaComanda(restaurantId, comandaId)), forma, centavos: cents });
  refresh();
  return { ok: true, message: `${NOME_DA_FORMA[forma as FormaNaMesa]}: ${formatCents(cents)} recebido.` };
}

/** Desfaz um recebimento digitado errado. */
export async function desfazerPagamento(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  // tirar dinheiro lançado é o avesso de finalizar a mesa: mesma confiança
  if (!acesso.pode.finalizarMesa) return { error: "Só quem pode finalizar a mesa desfaz um recebimento." };

  const pagamentoId = String(formData.get("pagamentoId") ?? "");
  const antes = await db.pagamentoComanda.findFirst({
    where: { id: pagamentoId, comanda: { restaurantId } },
    select: { forma: true, centavos: true, comandaId: true },
  });
  const r = await desfazerRecebimento(restaurantId, pagamentoId);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.desfez_recebimento", {
    pagamentoId,
    ...(antes
      ? { comandaId: antes.comandaId, ...(await mesaDaComanda(restaurantId, antes.comandaId)), forma: antes.forma, centavos: antes.centavos }
      : {}),
  });
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

  const pago = await db.pagamentoComanda.aggregate({ where: { comandaId }, _sum: { centavos: true } });
  await panelAudit(acesso, "salao.finalizou_mesa", { comandaId, ...(await mesaDaComanda(restaurantId, comandaId)), centavos: pago._sum.centavos ?? 0 });
  refresh();
  return { ok: true, message: "Mesa liberada." };
}

/** Apaga um item da comanda. Permissão por garçom, desligada de nascença. */
export async function apagarItem(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  if (!acesso.pode.excluirItem) return { error: "Você não tem permissão para apagar item da comanda." };

  const itemId = String(formData.get("itemId") ?? "");
  const antes = await db.orderItem.findFirst({
    where: { id: itemId, order: { restaurantId } },
    select: { quantity: true, productName: true, totalCents: true, order: { select: { comandaId: true } } },
  });
  const r = await apagarItemDaComanda(restaurantId, itemId, acesso.user.id);
  if (!r.ok) return { error: r.error };

  const comandaDoItem = antes?.order.comandaId ?? null;
  await panelAudit(acesso, "salao.apagou_item", {
    itemId,
    ...(comandaDoItem ? { comandaId: comandaDoItem, ...(await mesaDaComanda(restaurantId, comandaDoItem)) } : {}),
    ...(antes ? { itemTexto: `${antes.quantity}x ${antes.productName}`, centavos: antes.totalCents } : {}),
  });
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

  await panelAudit(acesso, "salao.ajustou_conta", { comandaId, ...(await mesaDaComanda(restaurantId, comandaId)), desconto, servico });
  refresh();
  return { ok: true, message: "Conta ajustada." };
}

/** Sobe e desce o nível de um garçom já cadastrado. */
export async function editarGarcom(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  // mexer em nível é coisa de dono; garçom nenhum muda o próprio
  if (acesso.papel === "STAFF") return { error: "Só o dono do restaurante muda o nível do garçom." };

  const vinculoId = String(formData.get("vinculoId") ?? "");
  const nivel = formData.get("nivel") === "GARCOM_II" ? "GARCOM_II" : "GARCOM";

  const r = await mudarNivel(restaurantId, vinculoId, nivel);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.garcom_nivel", { vinculoId, nivel, nome: r.nome ?? null });
  refresh();
  return { ok: true, message: `${r.nome ?? "O garçom"} agora é ${nivel === "GARCOM_II" ? "Garçom II" : "Garçom"}.` };
}

/**
 * Apaga a comanda inteira e devolve a mesa.
 *
 * Mesma confiança de finalizar a mesa, e por um motivo mais forte: aqui a
 * conta vai embora com os pagamentos que já tinham entrado nela.
 */
export async function apagarAComanda(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  if (!acesso.pode.mexerNaMesa) return { error: "Você não tem permissão para apagar a mesa." };

  const comandaId = String(formData.get("comandaId") ?? "");
  const [onde, total] = await Promise.all([mesaDaComanda(restaurantId, comandaId), totalDaComanda(comandaId)]);
  const r = await apagarComanda(restaurantId, comandaId, acesso.user.id);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.apagou_comanda", { comandaId, ...onde, centavos: total });
  refresh();
  return { ok: true, message: "Mesa apagada e liberada." };
}

/** Leva a comanda inteira para outra mesa. */
export async function trocarAMesa(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  if (!acesso.pode.mexerNaMesa) return { error: "Você não tem permissão para trocar a mesa." };

  const comandaId = String(formData.get("comandaId") ?? "");
  const mesaDestinoId = String(formData.get("mesaDestinoId") ?? "");
  const de = await mesaDaComanda(restaurantId, comandaId);
  const r = await trocarDeMesa(restaurantId, comandaId, mesaDestinoId);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.trocou_de_mesa", { comandaId, ...de, mesaDestinoId, para: await rotuloDaMesaPorId(restaurantId, mesaDestinoId) });
  refresh();
  return { ok: true, message: "Comanda na mesa nova." };
}

/** Manda itens desta mesa para outra. */
export async function moverOsItens(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  if (!acesso.pode.mexerNaMesa) return { error: "Você não tem permissão para mudar itens de mesa." };

  const comandaId = String(formData.get("comandaId") ?? "");
  const mesaDestinoId = String(formData.get("mesaDestinoId") ?? "");
  const itemIds = formData.getAll("itemId").map(String).filter(Boolean);

  const [de, itensTexto] = await Promise.all([mesaDaComanda(restaurantId, comandaId), itensParaOHistorico(restaurantId, itemIds)]);
  const r = await moverItens(restaurantId, comandaId, itemIds, mesaDestinoId, acesso.user.id);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "salao.moveu_itens", {
    comandaId,
    ...de,
    mesaDestinoId,
    para: await rotuloDaMesaPorId(restaurantId, mesaDestinoId),
    itens: itemIds.length,
    itensTexto,
  });
  refresh();
  return { ok: true, message: itemIds.length === 1 ? "Item na mesa nova." : "Itens na mesa nova." };
}

/**
 * Em qual impressora sai o que foi pedido de uma seção do cardápio.
 *
 * Vazio devolve a seção ao padrão: ela sai na impressora do balcão, junto
 * com tudo que ninguém reivindicou. Enquanto nenhuma seção tiver destino,
 * a impressão do restaurante inteiro continua como sempre foi.
 */
export async function definirImpressoraDaSecao(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);
  // de onde sai o papel é decisão de dono; garçom nenhum muda impressora
  if (acesso.papel === "STAFF") return { error: "Só o dono do restaurante muda as impressoras." };

  const categoriaId = String(formData.get("categoriaId") ?? "");
  const impressoraId = String(formData.get("impressoraId") ?? "") || null;

  if (impressoraId) {
    const dela = await db.printDevice.findFirst({ where: { id: impressoraId, restaurantId }, select: { id: true } });
    if (!dela) return { error: "Impressora não encontrada." };
  }

  const { count } = await db.menuCategory.updateMany({ where: { id: categoriaId, restaurantId }, data: { printDeviceId: impressoraId } });
  if (count === 0) return { error: "Seção não encontrada." };

  const secao = await db.menuCategory.findFirst({ where: { id: categoriaId, restaurantId }, select: { name: true } });
  await panelAudit(acesso, "salao.impressora_da_secao", { categoriaId, impressoraId, secao: secao?.name ?? null });
  refresh();
  return { ok: true, message: "Pronto." };
}

/**
 * Manda a conta da mesa para a impressora principal.
 *
 * O garçom aperta no celular e o papel sai no balcão, que é de onde ele vai
 * buscá-lo -- no celular não há impressora, e abrir a via na tela só servia
 * para quem estava no computador.
 *
 * Pedir de novo é marcar outra vez: a conta muda enquanto a mesa come, e a
 * segunda via tem de sair com o que foi lançado depois.
 */
export async function pedirAContaNoPapel(_prev: SalaoFormState, formData: FormData): Promise<SalaoFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireSalao(restaurantId);

  const comandaId = String(formData.get("comandaId") ?? "");
  const { count } = await db.comanda.updateMany({
    where: { id: comandaId, restaurantId, fechadaAt: null },
    data: { contaPedidaAt: new Date(), contaPrintedAt: null },
  });
  if (count === 0) return { error: "Mesa não encontrada." };

  await panelAudit(acesso, "salao.pediu_conta", { comandaId, ...(await mesaDaComanda(restaurantId, comandaId)) });
  refresh();
  return { ok: true, message: "Conta indo para a impressora do balcão." };
}

/**
 * O garçom está (ou deixou de estar) com a mesa aberta no celular -- é o
 * que deixa o cartão roxo, "Em atendimento", no mapa do caixa.
 *
 * Só o garçom marca: o dono ou o caixa abrindo a mesa no computador não é
 * atendimento, é conferência. O celular renova a marca de tempos em tempos
 * (ver components/panel/atendendo-mesa.tsx); sem renovar, ela vence sozinha
 * no mapa, então um celular que apagou no bolso não deixa a mesa roxa.
 */
export async function marcarAtendimento(restaurantId: string, mesaId: string, aberta: boolean) {
  const acesso = await requireSalao(restaurantId);
  if (acesso.papel !== "STAFF") return;
  await db.mesa.updateMany({
    where: { id: mesaId, restaurantId: acesso.restaurant.id },
    data: aberta ? { atendimentoAt: new Date(), atendimentoPor: acesso.user.name } : { atendimentoAt: null, atendimentoPor: null },
  });
}
