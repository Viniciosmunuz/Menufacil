import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

// Impressão no Linux, pelo CUPS -- que é o sistema de impressão de
// praticamente toda distribuição.
//
// Sai mais simples que no Windows: o `lp` já tem um modo que manda os bytes
// como estão (`-o raw`), que é o que o ESC/POS precisa. Não é preciso falar
// com nenhuma biblioteca do sistema.
//
// A impressora térmica USB costuma aparecer sozinha no CUPS. Quando não
// aparece, o caminho é instalá-la uma vez em http://localhost:631.

const run = promisify(execFile);

/** impressoras conhecidas pelo CUPS, com a padrão marcada */
export async function listarImpressoras() {
  const nomes = await run("lpstat", ["-a"])
    .then(({ stdout }) => stdout.split("\n").map((l) => l.split(/\s+/)[0]).filter(Boolean))
    .catch(() => []);

  const padrao = await run("lpstat", ["-d"])
    .then(({ stdout }) => stdout.split(":")[1]?.trim() ?? null)
    .catch(() => null);

  return nomes.map((nome) => ({ nome, padrao: nome === padrao }));
}

export async function impressoraPadrao() {
  const lista = await listarImpressoras();
  return lista.find((p) => p.padrao)?.nome ?? lista[0]?.nome ?? null;
}

async function enviar(arquivo, impressora, cru) {
  const argumentos = [];
  if (impressora) argumentos.push("-d", impressora);
  // "raw" entrega os bytes do jeito que foram escritos, sem o filtro do CUPS
  if (cru) argumentos.push("-o", "raw");
  argumentos.push(arquivo);

  await run("lp", argumentos, { maxBuffer: 1024 * 1024 });
  return impressora ?? (await impressoraPadrao());
}

/** a via em texto, pelo caminho comum do CUPS */
export async function imprimirTexto(texto, impressora) {
  const pasta = mkdtempSync(join(tmpdir(), "menufacil-totem-"));
  const arquivo = join(pasta, "via.txt");
  // a térmica corta melhor com algumas linhas em branco no fim
  writeFileSync(arquivo, `${texto}\n\n\n`, "utf8");
  try {
    return await enviar(arquivo, impressora, false);
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}

/** os bytes ESC/POS, sem ninguém reescrever nada pelo caminho */
export async function imprimirBytes(bytes, impressora) {
  const pasta = mkdtempSync(join(tmpdir(), "menufacil-totem-raw-"));
  const arquivo = join(pasta, "via.bin");
  writeFileSync(arquivo, bytes);
  try {
    return await enviar(arquivo, impressora, true);
  } catch (erro) {
    const motivo = String(erro.stderr || erro.message).split("\n").map((l) => l.trim()).find(Boolean);
    throw new Error(motivo || "a impressora não aceitou o modo térmica");
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}
