import "server-only";

import { db } from "@/lib/db";
import { formatCents } from "@/lib/format";
import { NOME_DA_FORMA, type FormaNaMesa } from "@/server/salao/pagamento";

// O histórico do salão: quem fez o quê, em que mesa, a que horas.
//
// Não é uma tabela nova. Toda ação do salão já passa por panelAudit, com
// quem fez e quando -- o histórico é a leitura disso em português. O dono
// vê tudo de todo mundo; o garçom vê só o que ele mesmo fez.
//
// Os registros mais antigos guardavam só o id da comanda. A mesa deles é
// descoberta aqui, na leitura: a comanda nunca é apagada do banco, só
// fechada, então o caminho até a mesa continua existindo.

type MesaCrua = { tipo: "MESA" | "BALCAO"; numero: number; nome: string | null };

/** "Mesa 4", "Balcão 2", ou o apelido da mesa quando ela tem um */
export const rotuloDaMesa = (m: MesaCrua) => m.nome ?? `${m.tipo === "BALCAO" ? "Balcão" : "Mesa"} ${m.numero}`;

/** a mesa de uma comanda, para gravar junto da ação */
export async function mesaDaComanda(restaurantId: string, comandaId: string) {
  const c = await db.comanda.findFirst({
    where: { id: comandaId, restaurantId },
    select: { mesaId: true, mesa: { select: { tipo: true, numero: true, nome: true } } },
  });
  return c ? { mesaId: c.mesaId, mesa: rotuloDaMesa(c.mesa) } : null;
}

export async function rotuloDaMesaPorId(restaurantId: string, mesaId: string) {
  const m = await db.mesa.findFirst({ where: { id: mesaId, restaurantId }, select: { tipo: true, numero: true, nome: true } });
  return m ? rotuloDaMesa(m) : null;
}

/** "2x X-Burger, 1x Coca" -- do jeito que se lê a comanda */
export const textoDosItens = (itens: { quantidade: number; nome: string }[]) => itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", ");

/** o tipo da linha: decide o ícone, a cor e o filtro */
export type TipoDaLinha = "pedido" | "pagamento" | "estorno" | "mesa" | "caixa" | "equipe" | "ajuste";

export type LinhaDoHistorico = {
  id: string;
  quando: Date;
  quemId: string | null;
  quem: string;
  tipo: TipoDaLinha;
  titulo: string;
  detalhe: string | null;
  mesaId: string | null;
  mesa: string | null;
  /** o valor da linha; positivo entra, negativo sai */
  centavos: number | null;
};

type Detalhes = Record<string, unknown>;

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const numero = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const nomeDaForma = (v: unknown) => (typeof v === "string" && v in NOME_DA_FORMA ? NOME_DA_FORMA[v as FormaNaMesa] : null);

/** a ação gravada, dita em português */
function descrever(acao: string, d: Detalhes, para: string | null): Pick<LinhaDoHistorico, "tipo" | "titulo" | "detalhe" | "centavos"> {
  const c = numero(d.centavos);
  switch (acao) {
    case "salao.lancou":
      return { tipo: "pedido", titulo: d.pedido ? `Lançou o pedido #${d.pedido}` : "Lançou um pedido", detalhe: texto(d.itensTexto), centavos: c };
    case "salao.recebeu":
      return { tipo: "pagamento", titulo: `Recebeu${nomeDaForma(d.forma) ? " em " + nomeDaForma(d.forma) : ""}`, detalhe: null, centavos: c };
    case "salao.desfez_recebimento":
      return { tipo: "estorno", titulo: "Desfez um recebimento", detalhe: nomeDaForma(d.forma), centavos: c === null ? null : -c };
    case "salao.finalizou_mesa":
      return { tipo: "mesa", titulo: "Liberou a mesa", detalhe: "Conta fechada", centavos: c };
    case "salao.apagou_item":
      return { tipo: "estorno", titulo: "Apagou item da conta", detalhe: texto(d.itemTexto), centavos: c === null ? null : -c };
    case "salao.ajustou_conta": {
      const partes = [
        numero(d.desconto) ? `Desconto ${formatCents(numero(d.desconto)!)}` : null,
        numero(d.servico) ? `Taxa de serviço ${formatCents(numero(d.servico)!)}` : null,
      ].filter(Boolean);
      return { tipo: "ajuste", titulo: "Ajustou a conta", detalhe: partes.length ? partes.join(" · ") : "Sem desconto nem taxa", centavos: null };
    }
    case "salao.apagou_comanda":
      return { tipo: "estorno", titulo: "Apagou a comanda", detalhe: "A mesa ficou livre", centavos: c === null ? null : -c };
    case "salao.trocou_de_mesa":
      return { tipo: "mesa", titulo: "Trocou de mesa", detalhe: para ? `Foi para ${para}` : null, centavos: null };
    case "salao.moveu_itens": {
      const n = numero(d.itens);
      const quais = texto(d.itensTexto);
      const quantos = n === null ? "Itens" : n === 1 ? "1 item" : `${n} itens`;
      return { tipo: "mesa", titulo: "Transferiu itens", detalhe: [`${quantos}${para ? " para " + para : ""}`, quais].filter(Boolean).join(": "), centavos: null };
    }
    case "salao.pediu_conta":
      return { tipo: "mesa", titulo: "Pediu a conta no papel", detalhe: null, centavos: null };
    case "salao.caixa_abriu":
      return { tipo: "caixa", titulo: "Abriu o caixa", detalhe: `Valor de abertura ${formatCents(numero(d.aberturaCents) ?? 0)}`, centavos: null };
    case "salao.caixa_fechou":
      return { tipo: "caixa", titulo: "Fechou o caixa", detalhe: null, centavos: null };
    case "salao.quantidade":
      return {
        tipo: "ajuste",
        titulo: d.tipo === "BALCAO" ? "Mudou os lugares de balcão" : "Mudou o número de mesas",
        detalhe: `De ${numero(d.de) ?? "?"} para ${numero(d.para) ?? "?"}`,
        centavos: null,
      };
    case "salao.mesa_nome":
      return { tipo: "ajuste", titulo: "Mudou o nome da mesa", detalhe: texto(d.nome) ? `Agora é "${d.nome}"` : "Nome removido", centavos: null };
    case "salao.garcom_novo":
      return { tipo: "equipe", titulo: d.devolta ? "Trouxe garçom de volta" : "Cadastrou garçom", detalhe: texto(d.nome), centavos: null };
    case "salao.garcom_removido":
      return { tipo: "equipe", titulo: "Tirou garçom da equipe", detalhe: texto(d.nome), centavos: null };
    case "salao.garcom_nivel":
      return {
        tipo: "equipe",
        titulo: "Mudou o nível do garçom",
        detalhe: [texto(d.nome), d.nivel === "GARCOM_II" ? "Garçom II" : "Garçom"].filter(Boolean).join(" → "),
        centavos: null,
      };
    case "salao.impressora_da_secao":
      return { tipo: "ajuste", titulo: "Mudou a impressora de uma seção", detalhe: texto(d.secao), centavos: null };
    default:
      return { tipo: "ajuste", titulo: acao.replace(/^salao\./, "").replace(/_/g, " "), detalhe: null, centavos: null };
  }
}

/** o dia "2026-10-25" no fuso da plataforma, de meia-noite a meia-noite */
export function intervaloDoDia(inicio: Date) {
  return { de: inicio, ate: new Date(inicio.getTime() + 24 * 60 * 60 * 1000) };
}

/**
 * As linhas do histórico de um dia.
 *
 * Com `ator`, só o que aquela pessoa fez -- é a tela do garçom. O filtro
 * de mesa é feito depois de descobrir a mesa de cada linha, porque os
 * registros antigos só sabem a comanda.
 */
export async function lerHistorico(
  restaurantId: string,
  filtro: { de: Date; ate: Date; ator?: string | null; mesaId?: string | null; tipo?: TipoDaLinha | null },
): Promise<LinhaDoHistorico[]> {
  const registros = await db.auditLog.findMany({
    where: {
      restaurantId,
      action: { startsWith: "salao." },
      createdAt: { gte: filtro.de, lt: filtro.ate },
      ...(filtro.ator ? { actorUserId: filtro.ator } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: { id: true, action: true, details: true, createdAt: true, actorUserId: true, actor: { select: { name: true } } },
  });

  // a mesa dos registros que só guardaram a comanda ou o id da mesa
  const det = (r: (typeof registros)[number]) => (r.details && typeof r.details === "object" && !Array.isArray(r.details) ? (r.details as Detalhes) : {});
  const comandaIds = new Set<string>();
  const mesaIds = new Set<string>();
  for (const r of registros) {
    const d = det(r);
    if (!texto(d.mesa) && texto(d.comandaId)) comandaIds.add(d.comandaId as string);
    if (texto(d.mesaId)) mesaIds.add(d.mesaId as string);
    if (!texto(d.para) && texto(d.mesaDestinoId)) mesaIds.add(d.mesaDestinoId as string);
  }
  const [comandas, mesas] = await Promise.all([
    comandaIds.size
      ? db.comanda.findMany({
          where: { restaurantId, id: { in: [...comandaIds] } },
          select: { id: true, mesaId: true, mesa: { select: { tipo: true, numero: true, nome: true } } },
        })
      : [],
    mesaIds.size ? db.mesa.findMany({ where: { restaurantId, id: { in: [...mesaIds] } }, select: { id: true, tipo: true, numero: true, nome: true } }) : [],
  ]);
  const daComanda = new Map(comandas.map((c) => [c.id, { mesaId: c.mesaId, mesa: rotuloDaMesa(c.mesa) }]));
  const daMesa = new Map(mesas.map((m) => [m.id, rotuloDaMesa(m)]));

  const linhas = registros.map((r): LinhaDoHistorico => {
    const d = det(r);
    const pelaComanda = texto(d.comandaId) ? daComanda.get(d.comandaId as string) : undefined;
    const mesaId = texto(d.mesaId) ?? pelaComanda?.mesaId ?? null;
    const mesa = texto(d.mesa) ?? pelaComanda?.mesa ?? (mesaId ? (daMesa.get(mesaId) ?? null) : null);
    const para = texto(d.para) ?? (texto(d.mesaDestinoId) ? (daMesa.get(d.mesaDestinoId as string) ?? null) : null);
    return {
      id: r.id,
      quando: r.createdAt,
      quemId: r.actorUserId,
      quem: (r.actor?.name ?? "Alguém") + (d.viaAdmin ? " (suporte)" : ""),
      mesaId,
      mesa,
      ...descrever(r.action, d, para),
    };
  });

  return linhas.filter((l) => (!filtro.mesaId || l.mesaId === filtro.mesaId) && (!filtro.tipo || l.tipo === filtro.tipo));
}
