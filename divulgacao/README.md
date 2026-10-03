# divulgacao — o reel de venda do MenuFácil

Vídeo vertical para o Instagram, montado a partir dos textos e preços de
verdade da página de venda (`src/app/(site)/cadastre-seu-restaurante/conteudo.ts`).

```
divulgacao/
├── reel-menufacil.mp4      o vídeo pronto (1080×1920, 30 fps, 45 s, sem áudio)
├── roteiro-narracao.md     a narração com os tempos, e como juntar o áudio
├── previa/                 quadros soltos em PNG, para conferir sem renderizar tudo
└── reel/
    ├── index.html          as 7 cenas
    ├── timeline.js         a linha do tempo e o conteúdo
    ├── render.mjs          o renderizador
    └── fonts/              Nunito e Caveat, as mesmas do site
```

## Mudar alguma coisa e renderizar de novo

Preço, item de plano, benefício e pratos estão todos no alto do `timeline.js`.
O desenho das cenas está no `index.html`.

```bash
cd divulgacao/reel

# conferir só alguns instantes (rápido, sai em divulgacao/previa/)
node render.mjs --previa 2.9,11.5,20.8,27.5,36,43

# renderizar o vídeo inteiro (~2 min)
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

Os quadros vão direto para o `ffmpeg` pela entrada padrão. Gravar os 1350 PNGs
em disco antes de montar passava de 600 MB e estourava o espaço da sessão.

## Mudou o preço na página de venda?

O `timeline.js` tem uma **cópia** dos textos, não lê o `conteudo.ts` (o vídeo
roda fora do Next, sem TypeScript). Se mexer no preço ou nos itens do plano
lá, passe a mesma mudança para o `PLANOS` do `timeline.js` e renderize de novo.
