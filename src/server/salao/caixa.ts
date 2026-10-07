import "server-only";

import { db } from "@/lib/db";
import { inicioDaOperacao } from "@/lib/opening-hours";
import { NOME_DA_FORMA, type FormaNaMesa } from "@/server/salao/pagamento";

// O caixa do salão.
//
// A pergunta aqui é uma só e vem sempre no fim da noite: quanto entrou pelas
// mesas, em quê, e dá para fechar. Por isso a tela não é um relatório com
// filtro de período -- é o turno de agora, do jeito que o dono conta o
// dinheiro.
//
// A janela é o turno e não o dia do calendário, pela mesma razão do
// fechamento do delivery: o Papaléguas fecha à meia-noite, e quem confere o
// caixa às 00:30 cairia num "hoje" recém-nascido, com a noite inteira do
// outro lado da virada.

export type LinhaDoCaixa = { forma: FormaNaMesa; nome: string; pedidos: number; centavos: number };

export type CaixaDoSalao = {
  linhas: LinhaDoCaixa[];
  totalCents: number;
  /** anotado: saiu sem pagar, a casa cobra depois -- fora do total */
  anotadoCents: number;
  /** comandas já pagas no turno */
  fechadas: number;
  /** mesas ainda abertas: enquanto houver, o caixa não fecha */
  abertas: { id: string; numero: number; tipo: "MESA" | "BALCAO"; centavos: number }[];
  abertoCents: number;
};

export async function caixaDoSalao(
  restaurantId: string,
  horarios: { weekday: number; opensAt: string; closesAt: string; closed: boolean }[] = [],
): Promise<CaixaDoSalao> {
  const desde = inicioDaOperacao(horarios);

  const [pagas, abertas] = await Promise.all([
    db.comanda.findMany({
      where: { restaurantId, abertaAt: { gte: desde }, status: "PAGO" },
      // a forma vem do recebimento, não do pedido: o pedido do salão nasce
      // antes de alguém saber como a mesa vai pagar, e conta dividida tem três
      select: { pagamentos: { select: { forma: true, centavos: true } } },
    }),
    db.comanda.findMany({
      where: { restaurantId, fechadaAt: null, status: "OCUPADA" },
      select: {
        id: true,
        mesa: { select: { numero: true, tipo: true } },
        orders: { where: { status: { not: "CANCELED" } }, select: { totalCents: true } },
      },
      orderBy: { abertaAt: "asc" },
    }),
  ]);

  const porForma = new Map<FormaNaMesa, LinhaDoCaixa>();
  for (const c of pagas) {
    for (const p of c.pagamentos) {
      const forma = p.forma as FormaNaMesa;
      const linha = porForma.get(forma) ?? { forma, nome: NOME_DA_FORMA[forma], pedidos: 0, centavos: 0 };
      linha.pedidos += 1;
      linha.centavos += p.centavos;
      porForma.set(forma, linha);
    }
  }

  // o anotado sai da lista do que entrou: não está na gaveta nem na
  // máquina, é conta que a casa ainda vai cobrar
  const linhas = [...porForma.values()].filter((l) => l.forma !== "ANOTADO").sort((a, b) => b.centavos - a.centavos);

  return {
    linhas,
    totalCents: linhas.reduce((s, l) => s + l.centavos, 0),
    anotadoCents: porForma.get("ANOTADO")?.centavos ?? 0,
    fechadas: pagas.length,
    abertas: abertas.map((c) => ({
      id: c.id,
      numero: c.mesa.numero,
      tipo: c.mesa.tipo,
      centavos: c.orders.reduce((s, o) => s + o.totalCents, 0),
    })),
    abertoCents: abertas.reduce((s, c) => s + c.orders.reduce((t, o) => t + o.totalCents, 0), 0),
  };
}
