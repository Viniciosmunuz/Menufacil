import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

// Impressão no Windows sem depender de driver nosso: a via vai para um
// arquivo de texto e o PowerShell manda para a impressora instalada
// (Out-Printer). Funciona com impressora comum e com térmica que tenha
// driver do Windows.
//
// Mais para a frente, a térmica ESC/POS entra aqui do lado, com outro
// arquivo nesta mesma pasta (bytes crus na porta da impressora). O resto
// do programa não precisa saber a diferença.

const run = promisify(execFile);

/** roda um comando do PowerShell e devolve a saída */
async function powershell(script) {
  const { stdout } = await run(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
    { windowsHide: true, maxBuffer: 1024 * 1024 },
  );
  return stdout;
}

/** impressoras instaladas no Windows, com a padrão marcada */
export async function listarImpressoras() {
  const saida = await powershell(
    "Get-CimInstance Win32_Printer | Select-Object Name,Default | ConvertTo-Json -Compress",
  );
  const dados = JSON.parse(saida || "[]");
  const lista = Array.isArray(dados) ? dados : [dados];
  return lista.filter(Boolean).map((p) => ({ nome: p.Name, padrao: !!p.Default }));
}

export async function impressoraPadrao() {
  const lista = await listarImpressoras();
  return lista.find((p) => p.padrao)?.nome ?? null;
}

/**
 * Manda o texto para a impressora. Sem nome, vai para a padrão do
 * Windows. Devolve o nome da impressora que recebeu.
 */
export async function imprimirTexto(texto, impressora) {
  const pasta = mkdtempSync(join(tmpdir(), "menufacil-totem-"));
  const arquivo = join(pasta, "via.txt");
  // a impressora térmica corta melhor com algumas linhas em branco no fim
  writeFileSync(arquivo, `${texto}\n\n\n`, "utf8");

  try {
    const alvo = impressora ? ` -Name '${impressora.replace(/'/g, "''")}'` : "";
    await powershell(`Get-Content -LiteralPath '${arquivo.replace(/'/g, "''")}' -Encoding UTF8 | Out-Printer${alvo}`);
    return impressora ?? (await impressoraPadrao());
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}
