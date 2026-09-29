import { testeEscPos, viaEscPos } from "./escpos.js";
import { imprimirBytes } from "./raw.js";
import { imprimirTexto } from "./windows.js";

// Os dois caminhos até o papel, no totem:
//
// - térmica (ESC/POS): os bytes vão crus para a impressora, o que dá
//   negrito, letra dobrada e corte automático. É o caminho normal aqui,
//   porque o totem sempre vem com térmica USB do lado.
// - comum: o texto vai pelo driver do Windows. É a rede de segurança —
//   melhor uma via simples do que cliente parado no balcão sem comanda.
//
// A mesma comanda continua saindo na impressora da cozinha, pela aba
// Pedidos do painel: o pedido do totem é um pedido como os outros.

export async function imprimirVia(via, { impressora, escpos = true } = {}) {
  if (escpos && via?.dados) {
    try {
      return await imprimirBytes(viaEscPos(via.dados, via.papel_mm), impressora);
    } catch {
      // a térmica recusou: cai para o modo comum, sem perder a comanda
    }
  }
  return imprimirTexto(via?.texto ?? "", impressora);
}

export async function imprimirTeste({ impressora, restaurante, papel = 80 }) {
  try {
    return await imprimirBytes(testeEscPos(restaurante, papel), impressora);
  } catch {
    const linhas = [
      "      MENU FACIL TOTEM",
      "        via de teste",
      "--------------------------------",
      `Restaurante: ${restaurante ?? "ainda nao conectado"}`,
      `Data: ${new Date().toLocaleString("pt-BR")}`,
      "--------------------------------",
      "Se voce esta lendo isto no papel,",
      "a impressao esta funcionando.",
    ];
    return imprimirTexto(linhas.join("\n"), impressora);
  }
}
