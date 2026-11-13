import { describe, expect, it } from "vitest";

import { PLANOS, receitaPrevista, situacaoDaCobranca } from "@/lib/cobranca";

// A mensalidade dos restaurantes. As datas são montadas ao meio-dia de
// Manaus (16h UTC) para o dia não depender do fuso de quem roda o teste.
const dia = (ano: number, mes: number, d: number) => new Date(Date.UTC(ano, mes - 1, d, 16));

describe("situacaoDaCobranca", () => {
  const restaurante = { plan: "DELIVERY" as const, billingDay: 10 };

  it("sem plano ou sem dia de vencimento, não cobra", () => {
    expect(situacaoDaCobranca({ plan: null, billingDay: 10 }, null).estado).toBe("sem-plano");
    expect(situacaoDaCobranca({ plan: "IA", billingDay: null }, null).estado).toBe("sem-plano");
  });

  it("pago mostra o que foi pago, e não o preço de hoje", () => {
    const s = situacaoDaCobranca(restaurante, { amountCents: 9000, paidAt: dia(2026, 11, 3) }, dia(2026, 11, 20));
    expect(s).toMatchObject({ estado: "pago", centavos: 9000, competencia: "2026-11" });
  });

  it("o dia do vencimento ainda é prazo", () => {
    const s = situacaoDaCobranca(restaurante, null, dia(2026, 11, 10));
    expect(s).toMatchObject({ estado: "a-vencer", faltam: 0, centavos: PLANOS.DELIVERY.centavos });
  });

  it("no dia seguinte já está vencido", () => {
    const s = situacaoDaCobranca(restaurante, null, dia(2026, 11, 11));
    expect(s).toMatchObject({ estado: "vencido", diasEmAtraso: 1 });
  });

  it("quem vence dia 31 vence no último dia de fevereiro", () => {
    const s = situacaoDaCobranca({ plan: "IA", billingDay: 31 }, null, dia(2027, 2, 28));
    expect(s).toMatchObject({ estado: "a-vencer", vence: 28, faltam: 0 });
  });
});

describe("receitaPrevista", () => {
  it("soma só quem tem plano e dia de vencimento", () => {
    const total = receitaPrevista([
      { plan: "DELIVERY", billingDay: 5 },
      { plan: "IA", billingDay: 10 },
      { plan: "IA", billingDay: null },
      { plan: null, billingDay: 10 },
    ]);
    expect(total).toBe(PLANOS.DELIVERY.centavos + PLANOS.IA.centavos);
  });
});
