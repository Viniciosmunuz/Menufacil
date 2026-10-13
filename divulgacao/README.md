# divulgacao — o reel de venda do MenuFácil

Vídeo vertical para o Instagram, montado a partir dos textos e preços de
verdade da página de venda (`src/app/(site)/cadastre-seu-restaurante/conteudo.ts`).

```
divulgacao/
├── reel-menufacil-com-voz.mp4   o que vai para o Instagram (com a narração)
├── reel-menufacil.mp4      o vídeo sem áudio (1080×1920, 30 fps, 55,8 s)
├── narracao.mp3            a narração gravada (voz Paulo, ElevenLabs)
├── roteiro-narracao.md     o texto da narração e como refazer o encaixe
├── previa/                 quadros soltos em PNG, para conferir sem renderizar tudo
└── reel/
    ├── index.html          as 11 cenas
    ├── timeline.js         a linha do tempo e o conteúdo
    ├── render.mjs          o renderizador
    ├── align.mjs           acha onde cada bloco da narração começa
    ├── logo.png            (opcional) a arte oficial; sem ela, entra o vetor
    └── fonts/              Nunito, a mesma do site
```

## Mudar alguma coisa e renderizar de novo

Preço, item de plano, benefício e pratos estão todos no alto do `timeline.js`.
O desenho das cenas está no `index.html`.

```bash
cd divulgacao/reel

# conferir só alguns instantes (rápido, sai em divulgacao/previa/)
node render.mjs --previa 2,11,16,21,31.5,42,54

# renderizar o vídeo inteiro (~3 min)
node render.mjs

# renderizar com outro nome
node render.mjs --saida ../reel-v2.mp4
```

Precisa do `playwright-core` instalado (`npm i --no-save playwright-core`) e do
`ffmpeg` no PATH. O Chromium é o que já vem na máquina, em
`/opt/pw-browsers/chromium-1194/`; se o caminho mudar, é a constante `CHROME`
no começo do `render.mjs`.

## Por que o render é quadro a quadro

O `render.mjs` não grava a tela: ele chama `window.__seek(t)` para cada quadro
e tira uma foto. Nenhuma animação depende do relógio do navegador, então o
vídeo sai exatamente igual toda vez, sem quadro pulado quando a máquina
engasga — e dá para pedir um instante específico com `--previa`.

Os quadros vão direto para o `ffmpeg` pela entrada padrão. Gravar os 1680 PNGs
em disco antes de montar passava de 700 MB e estourava o espaço da sessão.

## O vídeo segue a narração, não o contrário

Os `t:` das cenas no `timeline.js` não são números redondos: saíram da
narração gravada. O `align.mjs` mede onde cada bloco de fala começa e as cenas
entram 0,30 s antes, para já estarem na tela quando a voz entra.

```bash
cd reel
node align.mjs ../narracao.mp3     # imprime os tempos prontos para colar
```

Regravou a narração? Rode isso de novo, passe os números para o `t:` de cada
cena e para o `DURACAO`, renderize, e junte o áudio:

```bash
cd divulgacao
ffmpeg -y -i reel-menufacil.mp4 -i narracao.mp3 \
  -filter_complex "[1:a]loudnorm=I=-14:TP=-1.5:LRA=11,apad[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest \
  -movflags +faststart reel-menufacil-com-voz.mp4
```

O `loudnorm` está aí porque a narração veio a −19,3 LUFS e o Instagram
trabalha perto de −14: sem isso, a plataforma faz esse ganho sozinha, e
costuma soar pior do que fazer antes.

## A logo

Por padrão entra o vetor do `src/components/brand/logo.tsx`, que é a arte
oficial redesenhada sem o relevo. Para usar o arquivo da arte, salve-o como
`reel/logo.png` e renderize: o `render.mjs` troca sozinho e diz na saída qual
dos dois usou. Prefira um PNG com fundo transparente — ele aparece sobre o
laranja chapado nos cartões de abre e fecha, e sobre a comanda branca.

## Mudou o preço na página de venda?

O `timeline.js` tem uma **cópia** dos textos, não lê o `conteudo.ts` (o vídeo
roda fora do Next, sem TypeScript). Se mexer no preço ou nos itens do plano
lá, passe a mesma mudança para o `PLANOS` do `timeline.js` e renderize de novo.
