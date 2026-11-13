import { describe, expect, it } from "vitest";

import { areaDoPedido } from "@/lib/area-de-entrega";

// É esta função que decide a taxa cobrada e se a entrega é aceita. Um
// erro aqui é pedido recusado sem motivo, ou cobrado pela taxa errada.

const areas = [
  { name: "Centro", apelidos: [], feeCents: 300 },
  { name: "Cohab II", apelidos: ["cohab 2"], feeCents: 400 },
  { name: "BR-174", apelidos: ["Hotel Calleb", "Fábrica de gelo"], feeCents: 500 },
];

describe("areaDoPedido", () => {
  it("acha o bairro pelo nome, sem ligar para caixa nem acento", () => {
    expect(areaDoPedido(areas, "centro")?.feeCents).toBe(300);
    expect(areaDoPedido(areas, "  CENTRO ")?.feeCents).toBe(300);
    expect(areaDoPedido(areas, "fabrica de gelo")?.name).toBe("BR-174");
  });

  it("acha pelo apelido e cobra a taxa da área", () => {
    expect(areaDoPedido(areas, "Hotel Calleb")?.feeCents).toBe(500);
    expect(areaDoPedido(areas, "cohab 2")?.name).toBe("Cohab II");
  });

  it("ignora pontuação: BR 174 e BR-174 são o mesmo lugar", () => {
    expect(areaDoPedido(areas, "br 174")?.name).toBe("BR-174");
  });

  it("não aceita bairro parecido: nome pela metade não é o bairro", () => {
    expect(areaDoPedido(areas, "Hotel")).toBeNull();
    expect(areaDoPedido(areas, "Centro Novo")).toBeNull();
  });

  it("sem bairro, não há área", () => {
    expect(areaDoPedido(areas, "")).toBeNull();
    expect(areaDoPedido(areas, null)).toBeNull();
    expect(areaDoPedido(areas, undefined)).toBeNull();
  });

  it("funciona com área antiga, que não tem a lista de apelidos", () => {
    expect(areaDoPedido([{ name: "Galo" }], "galo")?.name).toBe("Galo");
  });
});
