import { describe, expect, it } from "vitest";

import { normalizePhone, pareceCelular } from "../format";

describe("pareceCelular", () => {
  it("aceita celular com DDD e o 9, em qualquer formato digitado", () => {
    expect(pareceCelular(normalizePhone("(92) 99999-0000"))).toBe(true);
    expect(pareceCelular(normalizePhone("92999990000"))).toBe(true);
    expect(pareceCelular(normalizePhone("+55 92 99999 0000"))).toBe(true);
  });

  it("recusa fixo, número sem o 9 e número faltando dígito", () => {
    expect(pareceCelular(normalizePhone("(92) 3232-0000"))).toBe(false);
    expect(pareceCelular(normalizePhone("(92) 9999-0000"))).toBe(false);
    expect(pareceCelular(normalizePhone("999990000"))).toBe(false);
    expect(pareceCelular(normalizePhone("(02) 99999-0000"))).toBe(false);
  });
});
