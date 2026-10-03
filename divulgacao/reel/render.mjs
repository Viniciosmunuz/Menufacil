/* =========================================================================
   Renderiza o reel: abre o index.html no Chromium, pede quadro por quadro
   e manda cada um direto para o ffmpeg pela entrada padrão — sem gravar
   1350 PNGs no disco, que é o que estourava o espaço da sessão.

   Uso:
     node render.mjs                      -> divulgacao/reel-menufacil.mp4
     node render.mjs --saida outro.mp4
     node render.mjs --previa 0.9,2.6,5.2 -> PNGs de conferência
   ========================================================================= */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FPS = 30;
const L = 1080, A = 1920;

const arg = (nome, padrão = null) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : padrão;
};

const navegador = await chromium.launch({
  executablePath: CHROME,
  args: [
    "--no-sandbox",
    "--font-render-hinting=none",
    "--disable-lcd-text",          // sem franja colorida nas letras
    "--force-color-profile=srgb",
    "--hide-scrollbars",
    "--disable-gpu",
  ],
});
const pagina = await navegador.newPage({
  viewport: { width: L, height: A },
  deviceScaleFactor: 1,
});
// Se a arte oficial estiver em reel/logo.png, ela entra no lugar do vetor.
const temPng = existsSync(resolve(AQUI, "logo.png"));
const endereco = pathToFileURL(resolve(AQUI, "index.html")).href + (temPng ? "?logo=png" : "");
console.log(temPng ? "logo: usando logo.png" : "logo: usando o vetor do logo.tsx");
await pagina.goto(endereco, { waitUntil: "load" });
await pagina.evaluate(() => window.__pronto);
const duração = await pagina.evaluate(() => window.__DURACAO);

const quadro = async (t) => {
  await pagina.evaluate((s) => window.__seek(s), t);
  return pagina.screenshot({ type: "png" });
};

/* ---------- modo conferência: alguns instantes em PNG ---------- */
const prévia = arg("previa");
if (prévia) {
  const destino = resolve(AQUI, "../previa");
  await mkdir(destino, { recursive: true });
  for (const bruto of prévia.split(",")) {
    const t = Number(bruto);
    const png = await quadro(t);
    const caminho = `${destino}/t${t.toFixed(2).replace(".", "_")}.png`;
    await (await import("node:fs/promises")).writeFile(caminho, png);
    console.log(`previa ${t.toFixed(2)}s -> ${caminho}`);
  }
  await navegador.close();
  process.exit(0);
}

/* ---------- vídeo ---------- */
const saída = resolve(AQUI, arg("saida", "../reel-menufacil.mp4"));
await mkdir(dirname(saída), { recursive: true });
const total = Math.round(duração * FPS);

const ff = spawn("ffmpeg", [
  "-y",
  "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18",
  "-pix_fmt", "yuv420p",                 // o que o Instagram aceita sem reclamar
  "-vf", "scale=1080:1920:flags=lanczos",
  "-movflags", "+faststart",
  "-r", String(FPS),
  saída,
], { stdio: ["pipe", "inherit", "inherit"] });

const escreve = (buf) =>
  new Promise((ok, erro) => {
    ff.stdin.write(buf, (e) => (e ? erro(e) : ok()));
  });

const t0 = Date.now();
for (let i = 0; i < total; i++) {
  await escreve(await quadro(i / FPS));
  if (i % 60 === 0 || i === total - 1) {
    const feito = i + 1;
    const seg = (Date.now() - t0) / 1000;
    const falta = seg > 0 ? ((total - feito) * (seg / feito)).toFixed(0) : "?";
    process.stderr.write(`\rquadro ${feito}/${total} (${((feito / total) * 100).toFixed(1)}%) — faltam ~${falta}s   `);
  }
}
process.stderr.write("\n");
ff.stdin.end();
await new Promise((ok, erro) => {
  ff.on("close", (c) => (c === 0 ? ok() : erro(new Error(`ffmpeg saiu com ${c}`))));
});
await navegador.close();
console.log(`pronto: ${saída}`);
