# Narração — vídeo que explica o MenuFácil

Para `videos/menufacil-explicacao.mp4` (1080x1920, 55 s, 30 fps).

Este é um **roteiro novo**, diferente do story de 51,5 s: aquele contava a
jornada de um pedido; este **explica o sistema passo a passo**, e termina
com o preço, que é o que falta para alguém decidir.

**Como ler:** devagar, como quem explica para um amigo dono de
restaurante. O vídeo mostra as telas de verdade enquanto você fala, então
não corra para preencher o silêncio.

---

## Bloco a bloco

| Tempo | Cena | O que se fala |
|---|---|---|
| **0–5 s** | A marca se desenha | *(sem voz)* |
| **5–12,5 s** | 1 · O cardápio no celular, o link sendo digitado | "O MenuFácil dá ao seu restaurante um cardápio digital com link próprio. Suas fotos, seus preços, do seu jeito." |
| **12,5–19,5 s** | 2 · O painel, com o pedido novo chegando | "O cliente pede por esse link, e o pedido cai na hora no seu painel, com aviso sonoro no balcão. Nada mais se perde no meio do WhatsApp." |
| **19,5–27 s** | 3 · A comanda saindo da impressora | "A comanda sai sozinha na impressora, com os itens, as observações, o endereço e o pagamento. Ninguém precisa anotar nada." |
| **27–34,5 s** | 4 · O aplicativo do entregador | "O seu entregador recebe a corrida no celular dele. Ele aceita, pega o endereço e leva — e você acompanha tudo do balcão." |
| **34,5–42 s** | 5 · O "0%" e a conta | "E o mais importante: zero comissão por pedido. O cliente paga direto para você. Cem por cento do que você vende é seu." |
| **42–49 s** | 6 · Os três planos | "Os planos começam em cem reais por mês, sem taxa de adesão e sem fidelidade. E a gente monta o seu cardápio junto com você." |
| **49–55 s** | A marca, o site e o WhatsApp | "MenuFácil. Fale com a gente no menu fácil delivery, ponto com, ponto b r." |

**A voz entra aos 5 s e termina por volta dos 53 s.**

---

## O texto para colar no ElevenLabs

Um gerador de voz lê tudo o que está escrito, então aqui não há marcação
de silêncio nem travessão, e o endereço do site está escrito do jeito que
se fala:

> O MenuFácil dá ao seu restaurante um cardápio digital com link próprio.
> Suas fotos, seus preços, do seu jeito.
>
> O cliente pede por esse link, e o pedido cai na hora no seu painel, com
> aviso sonoro no balcão. Nada mais se perde no meio do WhatsApp.
>
> A comanda sai sozinha na impressora, com os itens, as observações, o
> endereço e o pagamento. Ninguém precisa anotar nada.
>
> O seu entregador recebe a corrida no celular dele. Ele aceita, pega o
> endereço e leva, e você acompanha tudo do balcão.
>
> E o mais importante: zero comissão por pedido. O cliente paga direto
> para você. Cem por cento do que você vende é seu.
>
> Os planos começam em cem reais por mês, sem taxa de adesão e sem
> fidelidade. E a gente monta o seu cardápio junto com você.
>
> Menu Fácil. Fale com a gente no menu fácil delivery, ponto com, ponto
> b r.

**São ~150 palavras.** Num ritmo calmo (cerca de 140 por minuto) dá uns
48 segundos de voz, que é o espaço entre os 5 s e os 53 s.

**Os ajustes que já deram certo da outra vez:** voz masculina brasileira
de tom calmo (a Daniel Brazilian Conversational serve), modelo
multilíngue v2 ou v3, estabilidade perto de 50%, velocidade 0,95. Gere
bloco por bloco para encaixar nos tempos. Se *"Fácil"* sair como
"fa-cil", escreva **"Menu Fássil"** só no campo do gerador.

---

## Juntar a voz ao vídeo

A voz começa aos 5 s, então o áudio precisa entrar atrasado e ser
normalizado para o volume de rede social (-14 LUFS; o ElevenLabs entrega
perto de -23, baixo demais):

```bash
ffmpeg -i narracao.mp3 -af "loudnorm=I=-14:TP=-1.5,aresample=48000,adelay=5000:all=1,apad" -t 55 -ac 2 -c:a pcm_s16le voz.wav
```

```bash
ffmpeg -i videos/menufacil-explicacao.mp4 -i voz.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest videos/menufacil-explicacao-narrado.mp4
```

Se a locução não couber exatamente, **mexa no vídeo, não na voz**: cada
cena tem a sua duração em segundos no topo de `src/Explicacao.tsx`, e
mudar um número lá não desarruma os outros passos.

---

## Para a legenda do post

> Seu delivery organizado num sistema só. 🍽️
>
> Cardápio digital com link próprio, pedido caindo no painel com aviso na
> hora, comanda impressa sozinha e o seu entregador recebendo a corrida
> no celular dele.
>
> E o que mais importa: **zero comissão por pedido**. O cliente paga
> direto para você.
>
> A partir de R$ 100/mês, sem taxa de adesão e sem fidelidade. A gente
> monta o seu cardápio junto com você.
>
> 📲 menufacildelivery.com.br
> 💬 (92) 99913-0838
>
> #menufacil #cardapiodigital #delivery #restaurante
> #presidentefigueiredo #sistemapararestaurante #semcomissao
