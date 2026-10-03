# Reel MenuFácil — roteiro de narração

Vídeo: `divulgacao/reel-menufacil.mp4` — 1080×1920, 30 fps, **45 s**, sem áudio.
Você grava a narração no labs e junta depois (comando no fim deste arquivo).

Todos os números e frases vieram de `src/app/(site)/cadastre-seu-restaurante/conteudo.ts`.
Mudou o preço lá? Mude aqui e renderize de novo.

---

## Como o vídeo está dividido

| Trecho | Cena na tela | Fala |
|---|---|---|
| 0,0 – 4,0 s | Pizza com uma fatia saindo, marcada "a comissão" | bloco 1 |
| 4,0 – 9,0 s | **0%** gigante em laranja | bloco 2 |
| 9,0 – 18,0 s | Os 6 benefícios, entrando um a um | bloco 3 |
| 18,0 – 23,0 s | Celular com o cardápio rolando | bloco 4 |
| 23,0 – 32,0 s | Cartão do **Plano Essencial — R$ 100** | bloco 5 |
| 32,0 – 40,5 s | Cartão do **Plano 100% Delivery — R$ 180** | bloco 6 |
| 40,5 – 45,0 s | Logo, WhatsApp e site | bloco 7 |

A fala toda soma ~40 s dentro dos 45 s do vídeo. A sobra é de propósito: dá
respiro entre uma cena e outra, e é onde a sua trilha aparece.

---

## A narração, bloco por bloco

Gere **um áudio por bloco** no labs. Fica mais fácil de encaixar do que um
arquivo só, e se um bloco ficar comprido você regrava só ele.

### Bloco 1 — começa em 0,0 s (cabe em 3,4 s)
> Todo pedido pelo aplicativo, o aplicativo leva uma fatia sua.

### Bloco 2 — começa em 4,3 s (cabe em 4,4 s)
> No MenuFácil, não. Zero de comissão: o dinheiro da venda é todo seu.

### Bloco 3 — começa em 9,3 s (cabe em 8,4 s)
> Cardápio com a sua logo e as suas fotos. Pedido novo apita no celular e sai
> impresso no balcão. Acabou um prato? Marcou esgotado, some na hora.

### Bloco 4 — começa em 18,3 s (cabe em 4,4 s)
> O cliente escolhe tamanho, sabor e adicional, confere tudo, e manda o pedido pronto.

### Bloco 5 — começa em 23,3 s (cabe em 8,4 s)
> Dois planos. O Essencial, cem reais por mês: cardápio no link, pedido no seu
> WhatsApp, impressão automática — e a gente monta o cardápio para você.

### Bloco 6 — começa em 32,3 s (cabe em 7,9 s)
> E o cem por cento Delivery, cento e oitenta por mês: o cliente paga Pix na
> hora, e o dinheiro cai direto na sua conta.

### Bloco 7 — começa em 40,8 s (cabe em 4,0 s)
> Chama a gente no WhatsApp. Seu cardápio pode estar no ar hoje.

---

## Versão corrida (se preferir gerar tudo de uma vez)

Cole isto no labs. As reticências entre os blocos puxam a pausa que encaixa
com a troca de cena — confira no fim se não passou de 45 s.

```
Todo pedido pelo aplicativo, o aplicativo leva uma fatia sua.

No MenuFácil, não. Zero de comissão: o dinheiro da venda é todo seu.

Cardápio com a sua logo e as suas fotos. Pedido novo apita no celular e sai impresso no balcão. Acabou um prato? Marcou esgotado, some na hora.

O cliente escolhe tamanho, sabor e adicional, confere tudo, e manda o pedido pronto.

Dois planos. O Essencial, cem reais por mês: cardápio no link, pedido no seu WhatsApp, impressão automática — e a gente monta o cardápio para você.

E o cem por cento Delivery, cento e oitenta por mês: o cliente paga Pix na hora, e o dinheiro cai direto na sua conta.

Chama a gente no WhatsApp. Seu cardápio pode estar no ar hoje.
```

**Dicas para o labs:** voz masculina ou feminina brasileira, tom de conversa
(não de locutor de rádio). Deixe a estabilidade mais para o meio: muito alta
deixa a leitura dura, e o texto é de venda, precisa de vida. Escreva os
números por extenso, como está acima ("cem reais", "cento e oitenta") —
escrito como "R$ 180" a leitura sai errada em boa parte dos modelos.

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
  -i b1.mp3 -i b2.mp3 -i b3.mp3 -i b4.mp3 -i b5.mp3 -i b6.mp3 -i b7.mp3 \
  -filter_complex "\
   [1:a]adelay=0|0[a1];      [2:a]adelay=4300|4300[a2]; \
   [3:a]adelay=9300|9300[a3]; [4:a]adelay=18300|18300[a4]; \
   [5:a]adelay=23300|23300[a5];[6:a]adelay=32300|32300[a6]; \
   [7:a]adelay=40800|40800[a7]; \
   [a1][a2][a3][a4][a5][a6][a7]amix=inputs=7:normalize=0[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest \
  reel-menufacil-com-voz.mp4
```

---

## Legenda sugerida para o post

> Seu restaurante vende, e o aplicativo leva uma fatia. No MenuFácil não tem
> comissão: o cliente paga direto para você.
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

- **O site no fim do vídeo está como `menufacil.app`.** Esse endereço aparece
  uma única vez no projeto (num comentário em `src/server/totem/mercado-pago.ts`)
  e o domínio de verdade vem da variável `APP_URL`, que está vazia no `.env.example`.
  Confirme o endereço certo antes de postar — se for outro, troque em
  `divulgacao/reel/index.html` (`id="s7-site"`) e renderize de novo.
- **Fidelidade não é citada em lugar nenhum do vídeo**, de propósito: no
  `conteudo.ts` a pergunta "Tem fidelidade?" está com a resposta em branco
  (TODO). Quando você decidir, dá para voltar e pôr isso no cartão do plano.
- As fotos são as do restaurante de demonstração (`public/demo/burger`). Se
  forem de banco de imagens com licença limitada, troque por fotos suas antes
  de subir num anúncio pago.
