# Reel MenuFácil — roteiro de narração

Pronto para publicar: **`divulgacao/reel-menufacil-com-voz.mp4`** — 1080×1920,
30 fps, 55,8 s, com a narração já encaixada e normalizada a −14 LUFS.

O `reel-menufacil.mp4` é o mesmo vídeo sem áudio, caso você queira trocar a voz.

O desenho segue o vídeo de referência: título à esquerda com a segunda parte
em laranja, telas do aplicativo desenhadas em creme, emoji no lugar de foto,
balões ligados por tracejado, e cartão laranja chapado para abrir e fechar.

Preços e itens dos planos vieram de
`src/app/(site)/cadastre-seu-restaurante/conteudo.ts`. Mudou lá? Veja a última
seção deste arquivo.

---

## Como o vídeo está dividido

A narração **já está gravada e encaixada** (`narracao.mp3`, voz Paulo). Os
tempos abaixo foram medidos nela pelo `reel/align.mjs`, não escolhidos a mão:
o vídeo é que foi ajustado à fala, e cada cena entra 0,30 s antes do bloco
dela para já estar na tela quando a voz começa.

| Bloco | Fala entra | Cena entra | Cena na tela |
|---|---|---|---|
| 1 | 0,00 s | 0,00 s | "Ainda pagando **comissão** em cada pedido?" |
| 2 | 4,15 s | 3,85 s | Cartão laranja: logo + "sem pagar comissão" |
| 3 | 7,70 s | 7,40 s | "Link **próprio**" + celular com o cardápio |
| 4 | 14,62 s | 14,32 s | **0%** de comissão + Pix / Cartão / Dinheiro |
| 5 | 18,55 s | 18,25 s | "Pedido **sem erro**" + tela de opções |
| 6 | 24,23 s | 23,93 s | "Aviso na hora, **com som**" + painel |
| 7 | 28,55 s | 28,25 s | "Imprime sozinho **no balcão**" + comanda |
| 8 | 34,30 s | 34,00 s | "Cardápio **na sua mão**" + esgotado |
| 9 | 38,40 s | 38,10 s | "Quanto **custa?**" + **Essencial R$ 100** |
| 10 | 44,30 s | 44,00 s | "O pedido **todo aqui**" + **100% Delivery R$ 180** |
| 11 | 50,05 s | 49,75 s | Cartão laranja: cadastrar, site e WhatsApp |

A fala acaba em 54,16 s e o vídeo em 55,80 s: a sobra de 1,65 s deixa o cartão
final respirar antes de acabar.

## A narração, bloco por bloco

Gere **um áudio por bloco** no labs. Fica mais fácil de encaixar do que um
arquivo só, e se um bloco ficar comprido você regrava só ele.

### Bloco 1 — entra em 0,2 s (cabe em 3,9 s)
> Ainda pagando comissão em cada pedido? Tem um jeito mais fácil.

### Bloco 2 — entra em 4,8 s (cabe em 2,6 s)
> MenuFácil: receba pedidos direto do cliente.

### Bloco 3 — entra em 7,8 s (cabe em 5,4 s)
> Seu cardápio ganha link próprio, com sua logo e seus preços. O cliente abre
> e pede, sem baixar nada.

### Bloco 4 — entra em 13,8 s (cabe em 3,9 s)
> Zero de comissão por pedido. O cliente paga direto pra você.

### Bloco 5 — entra em 18,3 s (cabe em 4,4 s)
> Tamanho, sabor e adicionais escolhidos antes de confirmar. O pedido chega
> sem erro.

### Bloco 6 — entra em 23,3 s (cabe em 3,9 s)
> Pedido novo apita na hora, no celular, no tablet ou no computador.

### Bloco 7 — entra em 27,8 s (cabe em 5,4 s)
> E imprime sozinho no balcão: itens, observações, troco calculado e o
> endereço da entrega.

### Bloco 8 — entra em 33,8 s (cabe em 3,9 s)
> Acabou um prato? Marcou como esgotado, some do cardápio na hora.

### Bloco 9 — entra em 38,3 s (cabe em 5,9 s)
> Dois planos. O Essencial, cem reais por mês, com o cardápio no link e o
> pedido no seu WhatsApp.

### Bloco 10 — entra em 44,8 s (cabe em 5,9 s)
> E o cem por cento Delivery, cento e oitenta: o cliente paga Pix e o dinheiro
> cai na sua conta.

### Bloco 11 — entra em 51,3 s (cabe em 4,4 s)
> Comece a receber pedidos em poucos minutos. Chama a gente no WhatsApp.

---

## Versão corrida (se preferir gerar tudo de uma vez)

```
Ainda pagando comissão em cada pedido? Tem um jeito mais fácil.

MenuFácil: receba pedidos direto do cliente.

Seu cardápio ganha link próprio, com sua logo e seus preços. O cliente abre e pede, sem baixar nada.

Zero de comissão por pedido. O cliente paga direto pra você.

Tamanho, sabor e adicionais escolhidos antes de confirmar. O pedido chega sem erro.

Pedido novo apita na hora, no celular, no tablet ou no computador.

E imprime sozinho no balcão: itens, observações, troco calculado e o endereço da entrega.

Acabou um prato? Marcou como esgotado, some do cardápio na hora.

Dois planos. O Essencial, cem reais por mês, com o cardápio no link e o pedido no seu WhatsApp.

E o cem por cento Delivery, cento e oitenta: o cliente paga Pix e o dinheiro cai na sua conta.

Comece a receber pedidos em poucos minutos. Chama a gente no WhatsApp.
```

**Dicas para o labs:** voz brasileira, tom de conversa (não de locutor de
rádio). Estabilidade mais para o meio: muito alta deixa a leitura dura, e o
texto é de venda, precisa de vida. Escreva os números por extenso, como está
acima ("cem reais", "cento e oitenta") — escrito como "R$ 180" a leitura sai
errada em boa parte dos modelos.

---

## Juntar a narração ao vídeo

Com um arquivo só (`narracao.mp3` na pasta `divulgacao/`):

```bash
cd divulgacao
ffmpeg -i reel-menufacil.mp4 -i narracao.mp3 \
  -c:v copy -c:a aac -b:a 192k -shortest \
  reel-menufacil-com-voz.mp4
```

Com narração **e** trilha de fundo (`trilha.mp3`), abaixando a trilha para a
voz passar na frente:

```bash
ffmpeg -i reel-menufacil.mp4 -i narracao.mp3 -i trilha.mp3 \
  -filter_complex "[2:a]volume=0.16[t];[1:a][t]amix=inputs=2:duration=first[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest \
  reel-menufacil-com-voz.mp4
```

Se gerou **um áudio por bloco**, monte a faixa com os tempos da tabela
(`adelay` é em milissegundos):

```bash
ffmpeg -i reel-menufacil.mp4 \
  -i b1.mp3 -i b2.mp3 -i b3.mp3 -i b4.mp3 -i b5.mp3 -i b6.mp3 \
  -i b7.mp3 -i b8.mp3 -i b9.mp3 -i b10.mp3 -i b11.mp3 \
  -filter_complex "\
   [1:a]adelay=200|200[a1];      [2:a]adelay=4800|4800[a2]; \
   [3:a]adelay=7800|7800[a3];    [4:a]adelay=13800|13800[a4]; \
   [5:a]adelay=18300|18300[a5];  [6:a]adelay=23300|23300[a6]; \
   [7:a]adelay=27800|27800[a7];  [8:a]adelay=33800|33800[a8]; \
   [9:a]adelay=38300|38300[a9];  [10:a]adelay=44800|44800[a10]; \
   [11:a]adelay=51300|51300[a11]; \
   [a1][a2][a3][a4][a5][a6][a7][a8][a9][a10][a11]amix=inputs=11:normalize=0[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest \
  reel-menufacil-com-voz.mp4
```

---

## Legenda sugerida para o post

> Ainda pagando comissão em cada pedido? No MenuFácil não tem: o cliente paga
> direto para você.
>
> 🍔 Cardápio digital com link próprio
> 🔔 Pedido novo apita no celular
> 🖨️ Sai impresso no balcão
> 💸 Pix caindo direto na sua conta
>
> Plano Essencial R$ 100/mês · Plano 100% Delivery R$ 180/mês
> A gente monta seu cardápio com você. Chama no WhatsApp (92) 99913-0838.
>
> #delivery #restaurante #cardapiodigital #manaus #gastronomia #foodservice
> #semcomissao #pedidoonline #hamburgueria #pizzaria

---

## Antes de publicar, confira

- **O preço do Essencial.** Aqui está **R$ 100**, que é o que está no
  `conteudo.ts` e, portanto, o que a página de venda mostra hoje. O seu vídeo
  de referência diz **R$ 120**. Os dois não podem estar certos: se o valor
  certo é 120, mude no `conteudo.ts` e no `PLANOS` do `timeline.js`, e
  renderize de novo.
- **A logo.** O vídeo está usando o vetor do `src/components/brand/logo.tsx`,
  que é a mesma silhueta da arte oficial, redesenhada sem o relevo. Para usar
  o arquivo da arte, salve-o como `divulgacao/reel/logo.png` e rode
  `node render.mjs`: o renderizador troca sozinho e avisa qual dos dois usou.
- **Fidelidade não é citada em lugar nenhum**, de propósito: no `conteudo.ts`
  a pergunta "Tem fidelidade?" está com a resposta em branco (TODO).
- O endereço no fecho é **menufacildelivery.com.br**, que é o que aparece no
  seu vídeo de referência. No projeto o domínio vem da variável `APP_URL`, que
  está vazia no `.env.example` — vale confirmar que é esse mesmo.
