// Gera os sons pequenos do comercial em public/sons/.
//
// São sintetizados aqui, e não baixados: som de banco tem licença para
// conferir, e o que o vídeo precisa é pouco -- um estalo de mensagem, um
// toque, um sopro de transição, o tranco da impressora e um acorde no
// fecho. O sino do aviso não está aqui: é o som-sino.wav do próprio
// painel, copiado de public/ do sistema, porque é o som que o dono ouve
// de verdade no balcão.
//
// Rodar de dentro de video-menufacil:  node scripts/sons.mjs

import fs from "node:fs";

const TAXA = 44100;

/** grava um WAV mono de 16 bits a partir de amostras entre -1 e 1 */
const grava = (nome, amostras) => {
  const n = amostras.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(TAXA, 24);
  b.writeUInt32LE(TAXA * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, amostras[i]));
    b.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.mkdirSync("public/sons", { recursive: true });
  fs.writeFileSync(`public/sons/${nome}.wav`, b);
};

const faz = (segundos, f) =>
  Array.from({ length: Math.round(segundos * TAXA) }, (_, i) => f(i / TAXA, i));

// ruído que se repete igual a cada geração: o render tem de ser o mesmo
let semente = 7;
const ruido = () => {
  semente = (semente * 16807) % 2147483647;
  return (semente / 2147483647) * 2 - 1;
};

/** uma nota que desce de `de` para `ate` Hz e morre depressa */
const gota = (de, ate, dura, queda) => {
  let fase = 0;
  return faz(dura, (t) => {
    const f = de + (ate - de) * (t / dura);
    fase += (2 * Math.PI * f) / TAXA;
    const ataque = Math.min(1, t / 0.004);
    return Math.sin(fase) * Math.exp(-t * queda) * ataque * 0.8;
  });
};

// mensagem que chega: estalo agudo, curto
grava("chega", gota(1250, 760, 0.13, 34));
// mensagem que sai (a resposta da Lia): o mesmo gesto, mais grave e macio
grava("sai", gota(620, 880, 0.11, 38));
// toque na tela: quase só o clique
grava("toque", gota(1800, 900, 0.045, 90));
// prato saltando do aparelho: uma bolha subindo
grava("salta", gota(420, 760, 0.12, 30));

// o sopro da transição laranja: ruído passado por um filtro que abre
{
  let y = 0;
  grava(
    "sopro",
    faz(0.75, (t) => {
      const p = t / 0.75;
      const corte = 0.02 + Math.sin(p * Math.PI) * 0.22;
      y += corte * (ruido() - y);
      return y * Math.sin(p * Math.PI) ** 1.5 * 0.9;
    }),
  );
}

// a impressora térmica: um tranco por linha, 13 linhas. O tempo é o da
// comanda saindo na tela: 2,4 s de roteiro, esticados pelo RITMO de
// Comercial.tsx -- mudou lá, muda aqui e gera de novo.
const RITMO = 0.75;
{
  const total = 2.4 / RITMO;
  const dura = total + 0.1;
  const passo = total / 13;
  let y = 0;
  grava(
    "impressora",
    faz(dura, (t) => {
      const dentro = t % passo;
      const env = dentro < 0.07 ? Math.exp(-dentro * 55) : 0;
      y += 0.35 * (ruido() - y);
      const zumbido = Math.sin(2 * Math.PI * 190 * t) * 0.12 * (t < total ? 1 : 0);
      return (y * env * 1.4 + zumbido * env) * 0.8;
    }),
  );
}

// o fecho: duas notas que se abrem, como um "pronto"
{
  const nota = (f, t, de) =>
    t < de ? 0 : Math.sin(2 * Math.PI * f * (t - de)) * Math.exp(-(t - de) * 3.2) * Math.min(1, (t - de) / 0.01);
  grava(
    "fecho",
    faz(1.6, (t) => (nota(523.25, t, 0) + nota(783.99, t, 0.12) * 0.9 + nota(1046.5, t, 0.24) * 0.6) * 0.3),
  );
}

console.log("sons gerados em public/sons");
