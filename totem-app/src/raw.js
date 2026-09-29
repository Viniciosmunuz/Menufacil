import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

// Envio em modo RAW: os bytes vão para a impressora exatamente como
// foram escritos, sem o driver do Windows reescrever nada. É o que o
// modo térmica precisa — os comandos ESC/POS só funcionam se chegarem
// intactos.
//
// O Windows faz isso pelo winspool.drv. Como o Node não fala com ele
// direto, montamos um script do PowerShell na hora e ele entrega os
// bytes pela mesma fila de impressão de sempre.

const run = promisify(execFile);

const SCRIPT = `
param([string]$Impressora, [string]$Arquivo)
$ErrorActionPreference = "Stop"

Add-Type -Language CSharp -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class MenuFacilTotemRaw {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }

  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static void Enviar(string impressora, byte[] dados) {
    IntPtr fila;
    if (!OpenPrinter(impressora, out fila, IntPtr.Zero))
      throw new Exception("nao consegui abrir a impressora (codigo " + Marshal.GetLastWin32Error() + ")");

    DOCINFO doc = new DOCINFO();
    doc.pDocName = "Menu Facil Totem";
    doc.pDataType = "RAW";
    IntPtr buffer = IntPtr.Zero;
    try {
      if (!StartDocPrinter(fila, 1, doc))
        throw new Exception("a impressora nao aceitou o modo RAW (codigo " + Marshal.GetLastWin32Error() + ")");
      try {
        if (!StartPagePrinter(fila))
          throw new Exception("nao consegui comecar a pagina (codigo " + Marshal.GetLastWin32Error() + ")");
        buffer = Marshal.AllocCoTaskMem(dados.Length);
        Marshal.Copy(dados, 0, buffer, dados.Length);
        int escritos = 0;
        if (!WritePrinter(fila, buffer, dados.Length, out escritos) || escritos != dados.Length)
          throw new Exception("a impressora recebeu so parte da via (codigo " + Marshal.GetLastWin32Error() + ")");
        EndPagePrinter(fila);
      } finally {
        EndDocPrinter(fila);
      }
    } finally {
      if (buffer != IntPtr.Zero) Marshal.FreeCoTaskMem(buffer);
      ClosePrinter(fila);
    }
  }
}
"@

$bytes = [System.IO.File]::ReadAllBytes($Arquivo)
[MenuFacilTotemRaw]::Enviar($Impressora, $bytes)
`;

/**
 * Manda os bytes para a impressora informada, sem passar pelo driver.
 * Precisa do nome exato da impressora no Windows.
 */
export async function imprimirBytes(bytes, impressora) {
  if (!impressora) throw new Error("escolha a impressora para usar o modo térmica");

  const pasta = mkdtempSync(join(tmpdir(), "menufacil-totem-"));
  const via = join(pasta, "via.bin");
  const script = join(pasta, "enviar.ps1");
  writeFileSync(via, bytes);
  writeFileSync(script, SCRIPT, "utf8");

  try {
    await run(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, "-Impressora", impressora, "-Arquivo", via],
      { windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    return impressora;
  } catch (erro) {
    // o PowerShell devolve o motivo em várias linhas; fica só a primeira
    const motivo = String(erro.stderr || erro.message).split("\n").map((l) => l.trim()).find(Boolean);
    throw new Error(motivo || "a impressora não aceitou o modo térmica");
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
}
