import { describe, expect, it } from "vitest";

import { observacoesComMapa, referenciaComTelefone } from "@/lib/referencia-do-pedido";

// O campo que o entregador lê quando o cliente não tinha referência.
//
// Duas coisas podem dar errado aqui, e as duas custam uma entrega: a
// frase da IA não ser reconhecida (e o entregador ficar sem o telefone,
// na rua, sem saber qual é a casa), ou uma referência de verdade ser
// reescrita por engano (e a casa verde ao lado da farmácia virar um
// número de telefone).

const TELEFONE = "5592991234567";

describe("referenciaComTelefone", () => {
  it("acrescenta o telefone à frase da IA", () => {
    expect(referenciaComTelefone("cliente não informou a localização", TELEFONE)).toBe(
      "cliente não informou a localização - chamar no (92) 99123-4567",
    );
  });

  it("reconhece as variações que ela escreve", () => {
    // a frase dela varia, e todas querem dizer a mesma coisa
    for (const dela of [
      "não informou referência",
      "o cliente não informou",
      "Cliente nao informou a localizacao",
      "CLIENTE NÃO INFORMOU A LOCALIZAÇÃO",
    ]) {
      expect(referenciaComTelefone(dela, TELEFONE)).toContain("(92) 99123-4567");
    }
  });

  it("não passa de 120 letras, que é o teto do campo", () => {
    const pronta = referenciaComTelefone("cliente não informou a localização", TELEFONE);
    expect(pronta!.length).toBeLessThanOrEqual(120);
  });

  it("referência de verdade fica intacta", () => {
    for (const real of [
      "casa verde do lado da farmácia",
      "em frente à escola",
      "fim da rua, perto da quadra",
      "portão azul",
    ]) {
      expect(referenciaComTelefone(real, TELEFONE)).toBe(real);
    }
  });

  it("sem telefone legível, fica só a frase dela", () => {
    const dela = "cliente não informou a localização";
    expect(referenciaComTelefone(dela, null)).toBe(dela);
    expect(referenciaComTelefone(dela, "")).toBe(dela);
  });

  it("campo vazio continua vazio, para o checkout recusar como sempre", () => {
    expect(referenciaComTelefone(undefined, TELEFONE)).toBeUndefined();
    expect(referenciaComTelefone("", TELEFONE)).toBe("");
  });

  it("telefone fixo, de dez dígitos, também sai formatado", () => {
    expect(referenciaComTelefone("cliente não informou", "559232151234")).toContain("(92) 3215-1234");
  });
});

describe("observacoesComMapa", () => {
  it("avisa a comanda de onde veio o endereço", () => {
    const obs = observacoesComMapa(undefined, true, TELEFONE);
    expect(obs).toContain("pelo mapa");
    expect(obs).toContain("aproximada");
    expect(obs).toContain("(92) 99123-4567");
  });

  it("endereço digitado não ganha aviso nenhum", () => {
    expect(observacoesComMapa(undefined, false, TELEFONE)).toBeUndefined();
    expect(observacoesComMapa("sem cebola", false, TELEFONE)).toBe("sem cebola");
  });

  it("a observação do cliente vem primeiro e continua inteira", () => {
    const obs = observacoesComMapa("sem cebola e bem passado", true, TELEFONE);
    expect(obs!.startsWith("sem cebola e bem passado")).toBe(true);
    expect(obs).toContain("pelo mapa");
  });

  it("não passa do teto do campo", () => {
    expect(observacoesComMapa(undefined, true, TELEFONE)!.length).toBeLessThanOrEqual(300);
  });

  it("observação longa demais fica sozinha: a cozinha vem antes do aviso", () => {
    // "sem cebola" é instrução de cozinha e nunca é cortada
    const longa = "a".repeat(280);
    expect(observacoesComMapa(longa, true, TELEFONE)).toBe(longa);
  });

  it("sem telefone, avisa do mapa mesmo assim", () => {
    const obs = observacoesComMapa(undefined, true, null);
    expect(obs).toContain("pelo mapa");
    expect(obs).not.toContain("WhatsApp");
  });
});
