import { describe, expect, it } from "vitest";

import { TIME_ZONE, fimDaCompetencia, inicioDaCompetencia, todayKey } from "@/lib/format";

// A janela do resumo mensal. Se ela escorregar um dia, o pedido das 23h
// do dia 31 cai no mês errado e o fechamento não bate com o caixa.

describe("janela da competência", () => {
  it("começa no dia 1 e termina no dia 1 do mês seguinte, no fuso da plataforma", () => {
    const inicio = inicioDaCompetencia("2026-10");
    const fim = fimDaCompetencia("2026-10");
    expect(todayKey(inicio)).toBe("2026-10-01");
    expect(todayKey(fim)).toBe("2026-11-01");
    // o último instante de outubro ainda é outubro
    expect(todayKey(new Date(fim.getTime() - 1))).toBe("2026-10-31");
    // e o instante antes do começo ainda é setembro
    expect(todayKey(new Date(inicio.getTime() - 1))).toBe("2026-09-30");
  });

  it("dezembro termina em janeiro do ano seguinte", () => {
    expect(todayKey(fimDaCompetencia("2026-12"))).toBe("2027-01-01");
  });

  it("o começo é meia-noite no fuso, e não em UTC", () => {
    const hora = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
      inicioDaCompetencia("2026-10"),
    );
    expect(hora).toBe("00:00");
  });
});
