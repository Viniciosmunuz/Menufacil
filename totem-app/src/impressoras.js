// Qual caminho até o papel, conforme o sistema do totem.
//
// Windows fala com a fila de impressão pelo winspool (via PowerShell);
// Linux fala com o CUPS pelo `lp`. O resto do programa não precisa saber a
// diferença: pede "imprima este texto" ou "imprima estes bytes" e pronto.
//
// O totem roda nos dois. No Windows é o caminho testado; no Linux o CUPS
// costuma reconhecer a térmica USB sozinho, e quando não reconhece ela é
// instalada uma vez em http://localhost:631.

import * as linux from "./linux.js";
import { imprimirBytes as bytesWindows } from "./raw.js";
import { imprimirTexto as textoWindows, impressoraPadrao as padraoWindows, listarImpressoras as listarWindows } from "./windows.js";

const noWindows = process.platform === "win32";

export const listarImpressoras = noWindows ? listarWindows : linux.listarImpressoras;
export const impressoraPadrao = noWindows ? padraoWindows : linux.impressoraPadrao;
export const imprimirTexto = noWindows ? textoWindows : linux.imprimirTexto;
export const imprimirBytes = noWindows ? bytesWindows : linux.imprimirBytes;
