/* =========================================================================
   Acha onde cada bloco da narração começa, para as cenas entrarem junto
   com a fala em vez de em tempos redondos inventados.

     node align.mjs ../narracao.mp3

   Imprime os tempos prontos para colar no `t:` de cada cena do timeline.js.

   Por que não basta o silencedetect do ffmpeg: nesta narração as pausas
   entre blocos têm 200 a 400 ms, o mesmo tamanho das pausas entre frases
   dentro de um bloco. Procurar silêncio acha 24 pausas e não diz quais são
   as 10 que interessam.

   O que se faz aqui: estima a duração de cada bloco pela quantidade de
   letras (a fala tem velocidade quase constante) e escolhe, entre os
   centros de pausa, as 10 fronteiras que melhor batem com essa estimativa.
   A escolha é global, não uma a uma: encaixar cada fronteira na pausa mais
   próxima punha duas no lugar errado, com um bloco saindo 48% mais rápido
   que a média e o seguinte 31% mais lento.
   ========================================================================= */

import { spawn } from "node:child_process";

/* Os mesmos blocos do roteiro-narracao.md, na ordem. Mudou a narração?
   Mude aqui também, senão o alinhamento mede outra coisa. */
const BLOCOS = [
  "Ainda pagando comissão em cada pedido? Tem um jeito mais fácil.",
  "MenuFácil: receba pedidos direto do cliente.",
  "Seu cardápio ganha link próprio, com sua logo e seus preços. O cliente abre e pede, sem baixar nada.",
  "Zero de comissão por pedido. O cliente paga direto pra você.",
  "Tamanho, sabor e adicionais escolhidos antes de confirmar. O pedido chega sem erro.",
  "Pedido novo apita na hora, no celular, no tablet ou no computador.",
  "E imprime sozinho no balcão: itens, observações, troco calculado e o endereço da entrega.",
  "Acabou um prato? Marcou como esgotado, some do cardápio na hora.",
  "Dois planos. O Essencial, cem reais por mês, com o cardápio no link e o pedido no seu WhatsApp.",
  "E o cem por cento Delivery, cento e oitenta: o cliente paga Pix e o dinheiro cai na sua conta.",
  "Comece a receber pedidos em poucos minutos. Chama a gente no WhatsApp.",
];

const SR = 8000, JANELA = 400;     // 50 ms
const PISO_DB = -45;               // abaixo disto conta como pausa
const ANTES = 0.30;                // a cena entra um tico antes da fala
const CAUDA = 1.65;                // o cartão final respira depois da última palavra

const audio = process.argv[2];
if (!audio) { console.error("uso: node align.mjs <arquivo de audio>"); process.exit(1); }

/** decodifica para PCM mono 8 kHz, que é de sobra para medir energia */
const pcm = await new Promise((ok, erro) => {
  const ff = spawn("ffmpeg", ["-v", "error", "-i", audio, "-ac", "1", "-ar", String(SR), "-f", "s16le", "-"]);
  const partes = [];
  ff.stdout.on("data", (d) => partes.push(d));
  ff.on("close", (c) => (c === 0 ? ok(Buffer.concat(partes)) : erro(new Error(`ffmpeg saiu com ${c}`))));
});

const amostras = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
const n = Math.floor(amostras.length / JANELA);
const rms = [];
for (let i = 0; i < n; i++) {
  let s = 0;
  for (let k = 0; k < JANELA; k++) { const v = amostras[i * JANELA + k]; s += v * v; }
  rms.push(Math.sqrt(s / JANELA) || 1);
}
const pico = Math.max(...rms);
const db = rms.map((r) => 20 * Math.log10(r / pico));
const FIM = amostras.length / SR;

/* centros das pausas */
const pausas = [];
for (let i = 0; i < n; ) {
  if (db[i] <= PISO_DB) {
    let j = i;
    while (j < n && db[j] <= PISO_DB) j++;
    pausas.push(((i + j) / 2) * (JANELA / SR));
    i = j;
  } else i++;
}

/* duração ideal de cada bloco, pela contagem de letras */
const letras = (b) => [...b].filter((c) => /[0-9A-Za-zÀ-ÿ]/.test(c)).length;
const peso = BLOCOS.map(letras);
const TOTAL = peso.reduce((a, b) => a + b, 0);
const alvo = peso.map((p) => (FIM * p) / TOTAL);

/* escolhe as fronteiras de uma vez só (programação dinâmica) */
const C = pausas.filter((p) => p > 0.5 && p < FIM - 0.5);
const K = BLOCOS.length, INF = Infinity;
const custo = Array.from({ length: K }, () => new Array(C.length).fill(INF));
const pai = Array.from({ length: K }, () => new Array(C.length).fill(-1));
for (let j = 0; j < C.length; j++) custo[1][j] = (C[j] - alvo[0]) ** 2;
for (let k = 2; k < K; k++)
  for (let j = 0; j < C.length; j++)
    for (let i = 0; i < j; i++) {
      if (custo[k - 1][i] === INF) continue;
      const d = C[j] - C[i];
      if (d < 0.8) continue;
      const v = custo[k - 1][i] + (d - alvo[k - 1]) ** 2;
      if (v < custo[k][j]) { custo[k][j] = v; pai[k][j] = i; }
    }
let melhor = -1, melhorV = INF;
for (let j = 0; j < C.length; j++) {
  if (custo[K - 1][j] === INF) continue;
  const v = custo[K - 1][j] + (FIM - C[j] - alvo[K - 1]) ** 2;
  if (v < melhorV) { melhorV = v; melhor = j; }
}
const corte = [];
for (let k = K - 1, j = melhor; k >= 1; j = pai[k][j], k--) corte.push(C[j]);
corte.reverse();
const fala = [0, ...corte];

/* confere: a velocidade de fala tem de ficar parecida em todos os blocos */
const media = TOTAL / FIM;
console.log(`audio ${FIM.toFixed(2)} s · ${pausas.length} pausas · ${media.toFixed(1)} letras/s\n`);
console.log("bloco     fala    cena     dur   letras/s   desvio");
let pior = 0;
fala.forEach((a, i) => {
  const d = (fala[i + 1] ?? FIM) - a;
  const taxa = peso[i] / d, dev = (taxa / media - 1) * 100;
  pior = Math.max(pior, Math.abs(dev));
  const cena = Math.max(0, a - (i === 0 ? 0 : ANTES));
  console.log(
    `b${String(i + 1).padEnd(3)} ${a.toFixed(2).padStart(8)} ${cena.toFixed(2).padStart(7)}` +
    ` ${d.toFixed(2).padStart(7)} ${taxa.toFixed(1).padStart(10)} ${(dev.toFixed(0) + "%").padStart(8)}` +
    (Math.abs(dev) > 18 ? "  <<< confira" : ""));
});
console.log(`\npior desvio: ${pior.toFixed(0)}%` + (pior > 18 ? "  — alguma fronteira caiu no lugar errado" : ""));
console.log(`\nDURACAO = ${(FIM + CAUDA).toFixed(2)};`);
console.log("t: de cada cena, na ordem:");
console.log("  " + fala.map((a, i) => (i === 0 ? 0 : +(a - ANTES).toFixed(2))).join(", "));
