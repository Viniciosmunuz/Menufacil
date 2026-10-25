import "server-only";

import { db } from "@/lib/db";
import { NOME_DA_FORMA, type FormaNaMesa } from "@/server/salao/pagamento";

// O Resumo do Caixa: a prestação de contas do turno aberto.
//
// A pergunta que esta tela responde é a do fim da noite, na frente da
// gaveta: quanto vendi, com quanto comecei, o que entrou e o que saiu de
// dinheiro fora da venda -- e, com isso, quanto tem de haver na gaveta
// agora. É o que o caixa confere antes de fechar.
//
// A janela é o turno aberto, não o dia do calendário: num restaurante que
// fecha à meia-noite, quem confere às 00:30 cairia num "hoje" recém-nascido
// com a noite inteira do outro lado da virada.
//
// Tudo sai do que já está gravado. Venda vem dos recebimentos das mesas
// (PagamentoComanda), e entrada e saída vêm de MovimentoCaixa -- sangria e
// suprimento não são venda, e somá-los ao que as mesas pagaram faria o
// caixa nunca bater.

export type VendaDoCaixa = {
  comandaId: string;
  cliente: string;
  mesa: string;
  quando: Date;
  canal: "Salão";
  formas: string;
  centavos: number;
  vendidoPor: string;
};

export type MovimentoDoCaixa = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  centavos: number;
  motivo: string;
  quem: string;
  quando: Date;
};

export type ResumoDoCaixa = {
  caixaId: string;
  abertoAt: Date;
  abertoPor: string | null;
  /** o troco com que a noite começou */
  aberturaCents: number;
  /** o que as mesas pagaram neste turno, sem o anotado */
  vendasCents: number;
  entradasCents: number;
  saidasCents: number;
  /** anotado: consumido e não pago, a casa cobra depois -- fora da venda */
  anotadoCents: number;
  /** só o que passa pela gaveta: abertura + dinheiro + entradas − saídas */
  naGavetaCents: number;
  porForma: { forma: FormaNaMesa; nome: string; vendas: number; centavos: number }[];
  vendas: VendaDoCaixa[];
  movimentos: MovimentoDoCaixa[];
  /** mesas ainda abertas; enquanto houver, o caixa não fecha */
  abertas: { id: string; rotulo: string; centavos: number }[];
  abertoCents: number;
};

const rotulo = (m: { tipo: "MESA" | "BALCAO"; numero: number; nome: string | null }) =>
  m.nome ?? `${m.tipo === "BALCAO" ? "Balcão" : "Mesa"} ${m.numero}`;

export async function resumoDoCaixa(restaurantId: string, caixaId: string): Promise<ResumoDoCaixa | null> {
  const caixa = await db.caixaSalao.findFirst({
    where: { id: caixaId, restaurantId },
    select: { id: true, abertoAt: true, aberturaCents: true, abertoPor: { select: { name: true } } },
  });
  if (!caixa) return null;

  const [pagas, movimentos, abertas] = await Promise.all([
    db.comanda.findMany({
      where: { restaurantId, abertaAt: { gte: caixa.abertoAt }, status: "PAGO" },
      orderBy: { fechadaAt: "desc" },
      select: {
        id: true,
        fechadaAt: true,
        abertaAt: true,
        mesa: { select: { tipo: true, numero: true, nome: true } },
        garcom: { select: { name: true } },
        pagamentos: { select: { forma: true, centavos: true, recebidoPor: { select: { name: true } } } },
      },
    }),
    db.movimentoCaixa.findMany({
      where: { caixaId: caixa.id, restaurantId },
      orderBy: { createdAt: "desc" },
      select: { id: true, tipo: true, centavos: true, motivo: true, createdAt: true, criadoPor: { select: { name: true } } },
    }),
    db.comanda.findMany({
      where: { restaurantId, fechadaAt: null, status: { not: "LIVRE" } },
      orderBy: { abertaAt: "asc" },
      select: {
        id: true,
        mesa: { select: { tipo: true, numero: true, nome: true } },
        orders: { where: { status: { not: "CANCELED" } }, select: { totalCents: true } },
      },
    }),
  ]);

  const porForma = new Map<FormaNaMesa, { forma: FormaNaMesa; nome: string; vendas: number; centavos: number }>();
  const vendas: VendaDoCaixa[] = [];

  for (const c of pagas) {
    const nomes = new Set<string>();
    let total = 0;
    for (const p of c.pagamentos) {
      const forma = p.forma as FormaNaMesa;
      const linha = porForma.get(forma) ?? { forma, nome: NOME_DA_FORMA[forma], vendas: 0, centavos: 0 };
      linha.vendas += 1;
      linha.centavos += p.centavos;
      porForma.set(forma, linha);
      nomes.add(NOME_DA_FORMA[forma]);
      // o anotado não entra no valor da venda: ninguém pagou ainda
      if (forma !== "ANOTADO") total += p.centavos;
    }
    vendas.push({
      comandaId: c.id,
      // no salão quem compra é a mesa; o nome dela é o apelido, quando tem
      cliente: rotulo(c.mesa),
      mesa: rotulo(c.mesa),
      quando: c.fechadaAt ?? c.abertaAt,
      canal: "Salão",
      formas: [...nomes].join(", ") || "—",
      centavos: total,
      vendidoPor: c.garcom?.name ?? c.pagamentos.find((p) => p.recebidoPor)?.recebidoPor?.name ?? "—",
    });
  }

  const linhas = [...porForma.values()].sort((a, b) => b.centavos - a.centavos);
  const vendasCents = linhas.filter((l) => l.forma !== "ANOTADO").reduce((s, l) => s + l.centavos, 0);
  const anotadoCents = porForma.get("ANOTADO")?.centavos ?? 0;
  const dinheiroCents = porForma.get("DINHEIRO")?.centavos ?? 0;
  const entradasCents = movimentos.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.centavos, 0);
  const saidasCents = movimentos.filter((m) => m.tipo === "SAIDA").reduce((s, m) => s + m.centavos, 0);

  return {
    caixaId: caixa.id,
    abertoAt: caixa.abertoAt,
    abertoPor: caixa.abertoPor?.name ?? null,
    aberturaCents: caixa.aberturaCents,
    vendasCents,
    entradasCents,
    saidasCents,
    anotadoCents,
    // Pix e cartão não passam pela gaveta: só o dinheiro, o troco inicial e
    // o que entrou ou saiu à mão
    naGavetaCents: caixa.aberturaCents + dinheiroCents + entradasCents - saidasCents,
    porForma: linhas,
    vendas,
    movimentos: movimentos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      centavos: m.centavos,
      motivo: m.motivo,
      quem: m.criadoPor?.name ?? "—",
      quando: m.createdAt,
    })),
    abertas: abertas.map((c) => ({
      id: c.id,
      rotulo: rotulo(c.mesa),
      centavos: c.orders.reduce((s, o) => s + o.totalCents, 0),
    })),
    abertoCents: abertas.reduce((s, c) => s + c.orders.reduce((t, o) => t + o.totalCents, 0), 0),
  };
}
