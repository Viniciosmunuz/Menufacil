# 100% Delivery

O pedido inteiro dentro do MenuFácil: cardápio, carrinho, endereço, Pix,
acompanhamento e conversa. Sem passar pelo WhatsApp de ninguém.

É um módulo a parte, como o totem. Nada aqui é lido pelo fluxo do WhatsApp
nem pelo Menu Fácil para PC, e o restaurante que não tem o recurso liberado
não vê diferença nenhuma no sistema dele.

**O dinheiro é do restaurante.** Cada um liga a própria conta do Mercado
Pago, pelo fluxo oficial de autorização. O Pix nasce nessa conta e cai nessa
conta. A plataforma não intermedia pagamento nenhum e nunca vê o dinheiro.

---

## Como ligar, do começo

### 1. Uma vez por servidor (quem cuida da plataforma)

Cadastrar o MenuFácil como aplicativo no Mercado Pago, em
`mercadopago.com.br/developers` → Suas integrações → criar aplicação.

Na própria página de credenciais, cadastrar a **URL de retorno**, exatamente
assim:

```
https://menufacildelivery.com.br/painel/mercado-pago/retorno
```

O Mercado Pago exige que o endereço de retorno seja idêntico ao cadastrado,
sem nada variável no meio. É por isso que ele é um só para todos os
restaurantes: de quem é cada volta vai no `state`, assinado.

Depois, três variáveis de ambiente na Vercel (ver `.env.example`):

| Variável           | O que é                                                        |
| ------------------ | -------------------------------------------------------------- |
| `MP_CLIENT_ID`     | Client ID da aplicação                                         |
| `MP_CLIENT_SECRET` | Client Secret da aplicação                                     |
| `MP_TOKEN_KEY`     | 32 bytes em base64; criptografa os tokens no banco             |

Sem `MP_CLIENT_ID`/`MP_CLIENT_SECRET`, a seção Entrega avisa que não dá para
conectar e nada mais quebra. Sem `MP_TOKEN_KEY`, cai na `TOTEM_TOKEN_KEY`,
que já está configurada.

### 2. Por restaurante (admin da plataforma)

`/admin/restaurantes/<id>` → quadro **Recursos** → marcar **100% Delivery**.

É só isso. Desmarcar devolve o restaurante ao Pedido pelo WhatsApp na hora.

Logo abaixo nasce o quadro **100% Delivery**, de leitura, que responde à
pergunta de suporte: o dono ligou? a conta está de pé? é conta de verdade ou
de teste? quantos pedidos e quanto dinheiro?

### 3. Por restaurante (o dono, no painel dele)

Aparece a seção **Entrega** no menu.

1. **Conectar Mercado Pago.** Ele sai para o site do Mercado Pago, entra na
   conta do restaurante, autoriza e volta com a conta ligada. O MenuFácil
   não pede senha nem token em momento nenhum.
2. **Escolher o fluxo**: Pedido pelo WhatsApp ou 100% Delivery. A segunda
   opção só destrava com a conta ligada — ligar o modo sem conta levaria o
   cliente a um checkout sem forma de pagar.

Só isso. **Não há webhook para cadastrar** -- ver mais abaixo.

---

## O caminho do pedido

```
cliente monta o pedido
        ↓
AWAITING_PAYMENT ── o QR do Pix aparece na tela dele
        ↓            (não imprime, não apita: ninguém pagou ainda)
   [Mercado Pago confirma]
        ↓
     PAID ────────── a comanda sai na impressora e o sino toca
        ↓
   CONFIRMED ─────── "Receber pedido" (o balcão abriu)
        ↓
   PREPARING ─────── "Começar o preparo"
        ↓
     READY ───────── "Pronto"
        ↓
OUT_FOR_DELIVERY ─── "Saiu para entrega" (só na entrega)
        ↓
   COMPLETED ─────── "Entregue"
```

Cada passo que o balcão toca aparece na tela do cliente em segundos, sem
ele fazer nada. `CANCELED` pode acontecer de qualquer ponto.

Cartão e dinheiro continuam valendo, do jeito que estão em **Meu
restaurante**: quem escolher um desses paga na entrega ou na retirada, e o
pedido nasce em `NEW` como sempre.

---

## Quem diz que o pedido está pago

Só o Mercado Pago. Isto é regra do sistema, não recomendação:

- Abrir a tela do Pix não paga nada.
- Não existe botão "já paguei" neste fluxo. Ele existe no fluxo do WhatsApp
  porque alguém do restaurante vai conferir o comprovante na mão; aqui não
  há o que conferir.
- Nenhum toque no painel marca um pagamento do Mercado Pago como
  confirmado. `recordStatus`, em `src/server/orders/update-order.ts`, sai
  fora quando o pagamento é `MERCADO_PAGO`.
- O valor é conferido em centavos antes de confirmar. Pagamento de valor
  diferente do pedido não vira pago: fica registrado em `Payment.lastEvent`
  para o restaurante olhar.

### Dois caminhos até a confirmação

Os dois terminam na mesma função, `confirmarPagamentoAprovado`, e ela só
deixa um passar (o `updateMany` com o status antigo no `where` é a trava).

1. **Webhook** — `POST /api/pagamento/webhook?r=<restaurante>`. É o caminho
   principal e funciona com o celular do cliente desligado.
2. **A consulta da própria tela** — enquanto o cliente está com o Pix
   aberto, a página pergunta de quatro em quatro segundos
   (`GET /api/pagamento/situacao?code=<pedido>`), e o servidor pergunta ao
   Mercado Pago. É a rede embaixo da rede: vale mesmo que o aviso se perca
   no caminho.

### O webhook, em detalhe

**Ninguém cadastra webhook.** O endereço do aviso
(`/api/pagamento/webhook?r=<restaurante>`) vai no campo `notification_url`
de cada cobrança, já apontando para o restaurante certo.

É assim porque tem de ser: no Mercado Pago, webhook mora dentro de uma
*aplicação* de desenvolvedor, e o restaurante que só vende não tem aplicação
nenhuma -- ele apenas autoriza a do MenuFácil. Mandar o endereço por
cobrança resolve os dois modos de uma vez e tira um passo de configuração da
frente de todo mundo.

A chave da assinatura continua existindo no painel, fechada atrás de "Tenho
uma aplicação própria no Mercado Pago": é o caso de quem veio do Totem, que
criou uma aplicação para pegar o Access Token. Para esse, conferir a
assinatura é uma camada a mais. Nunca é requisito.

O aviso do Mercado Pago traz só um id. Nada é feito com base no que ele
diz: o servidor pega o id e **pergunta ao Mercado Pago** como está aquele
pagamento, com o token do próprio restaurante. Um POST forjado não aprova
pedido nenhum — ele levaria o servidor a consultar um pagamento que não
está aprovado.

A assinatura (`x-signature`) é conferida quando existe uma chave secreta
cadastrada; aí o aviso mal assinado é recusado antes de gastar consulta.

**Idempotência** em duas camadas:

1. Cada aviso entra em `MpWebhookEvent` com `eventKey` único
   (`restaurante:pagamento:situação`) antes de qualquer coisa ser feita.
   Chave repetida sai na hora com `200`. O mesmo aviso reenviado três vezes
   passa uma; os avisos de "criado" e de "aprovado" do mesmo Pix são dois
   avisos diferentes e os dois passam.
2. A troca de status é guardada pelo `where` do `updateMany`, para o caso de
   dois avisos diferentes chegarem no mesmo instante.

Situações tratadas: aprovado, pendente, recusado, cancelado e vencido.

---

## Impressão e sino

Sem mudança no Menu Fácil para PC nem no APK. O que mudou é **quem entra na
fila**: `EXCLUDE_UNPAID`, em `src/lib/order-flow.ts`, tira o pedido do 100%
Delivery que ainda está esperando o Pix.

Vale nos dois lugares que disparam papel:

- `pendingOrders`, em `src/server/print/queue.ts` (o programa do PC e o APK);
- a lista `openOrders` da aba Pedidos, que é a que toca o sino e imprime pelo
  navegador.

Comanda de pedido não pago é comida saindo de graça, e sino a cada carrinho
abandonado faz o balcão desligar o som. Pedido do WhatsApp e do totem
continuam entrando na hora em que nascem, como sempre.

---

## A conversa

Uma por pedido, e só no 100% Delivery. Existe porque o modo tira o WhatsApp
do caminho: "pode tirar a cebola?", "estou na portaria", "o entregador já
saiu?".

- O cliente escreve na própria página do pedido. Quem pode escrever é quem
  tem o código do pedido, que é o que o link dele tem — a mesma regra do
  resto daquela página.
- O balcão responde em `/painel/<id>/pedidos/<pedido>`, e **quem respondeu
  fica gravado**: num restaurante com três pessoas no balcão, isso é o que
  resolve discussão.
- Não lidas aparecem como selo na lista de pedidos, para a mensagem não
  ficar esquecida dentro de um pedido fechado na lista.
- Nasce na primeira mensagem, não junto com o pedido: pedido em que ninguém
  falou nada não deixa linha vazia no banco.
- Freio de 20 mensagens por lado a cada 5 minutos, e 500 letras por
  mensagem.

A tela do cliente abre a conversa já lida, e o painel marca como lidas as
mensagens do cliente quando o pedido é aberto.

---

## Tempo real

Não há WebSocket, e não precisa: a Vercel não mantém conexão de pé entre
funções, e o projeto já tinha a resposta pronta.

- **Painel**: o canal SSE que já existia (`/api/painel/<id>/eventos`) agora
  carrega também o estado da conversa no retrato que ele compara. Mensagem
  nova do cliente aparece no balcão sem ninguém recarregar.
- **Cliente**: `PedidoAoVivo` pergunta a `/api/pagamento/situacao` de 4 em 4
  segundos enquanto o Pix está pendente, de 10 em 10 depois, e para quando a
  aba está escondida. Quando a resposta muda, a página se refaz pelo
  servidor.

Nos dois casos quem desenha a tela continua sendo o servidor, com os dados
do banco. Não existem dois desenhos da mesma coisa para discordarem.

Avisos no celular (push), para quem está com o painel fechado: pagamento
confirmado e mensagem nova do cliente, além do pedido novo que já existia.

---

## O limite de funções da Vercel

O plano aceita 12 funções, e o projeto já estava nas 12 — o deploy já
estourou esse limite uma vez (commit `bbcd333`).

Para o 100% Delivery caber sem encostar no caminho do PC:

- As duas rotas do WhatsApp viraram uma, `/api/whatsapp/[acao]`. **Os
  endereços não mudaram**: `/api/whatsapp/webhook` (cadastrado na Meta) e
  `/api/whatsapp/processar` (o cron) continuam iguais, letra por letra. Quem
  faz o trabalho mudou de lugar, para `src/server/whatsapp/api/`.
- O 100% Delivery gastou a vaga liberada, com `/api/pagamento/[acao]`
  servindo o webhook e a consulta de situação.

Continuam 12. As seis rotas de `/api/impressao/` não foram tocadas.

Todo o resto do módulo — ligar a conta, cobrar, conversar, mudar status — é
server action ou página, e não gasta função nenhuma. Inclusive a volta do
OAuth, que é a página `/painel/mercado-pago/retorno`.

---

## Onde está cada coisa

| Caminho                                           | O que faz                                        |
| ------------------------------------------------- | ------------------------------------------------ |
| `src/server/pagamentos/oauth.ts`                  | autorização, `state` assinado, troca e renovação |
| `src/server/pagamentos/conta.ts`                  | guardar, mostrar, desligar, entregar credenciais |
| `src/server/pagamentos/pix.ts`                    | criar o QR e confirmar o pagamento               |
| `src/server/pagamentos/webhook.ts`                | o aviso do Mercado Pago, idempotente             |
| `src/server/pagamentos/relatorio.ts`              | o diagnóstico que o admin lê                     |
| `src/server/pagamentos/segredo.ts`                | AES-256-GCM dos tokens                           |
| `src/server/chat/chat.ts`                         | a conversa dos dois lados                        |
| `src/components/chat/conversa.tsx`                | a tela da conversa, a mesma dos dois lados       |
| `src/app/painel/[restaurantId]/entrega/`          | a seção Entrega                                  |
| `src/app/painel/mercado-pago/retorno/page.tsx`    | a volta do OAuth                                 |
| `src/app/(site)/pedido/[code]/`                   | acompanhamento, QR e conversa do cliente         |
| `src/lib/order-flow.ts`                           | os passos e o `EXCLUDE_UNPAID`                   |

O módulo do Mercado Pago em si (`src/server/totem/mercado-pago.ts`) é
compartilhado com o totem: `criarPix`, `verPagamento` e a tradução de
situação já estavam lá, testados em produção. Não foram duplicados.

---

## Conta de teste

Dá para experimentar o caminho inteiro com as credenciais de teste do
Mercado Pago. O painel marca a conta como **Conta de teste** e avisa que
nenhum pagamento de verdade entra — em dois lugares, no painel do dono e no
quadro do admin, porque confundir isso significa achar que está vendendo
sem estar.

---

## O que ficou de fora

- **Estorno pelo painel.** Hoje é no site do Mercado Pago. O pedido
  cancelado não devolve dinheiro sozinho.
- **Cartão online.** O Pix é o que entra agora. Cartão no 100% Delivery
  exigiria tokenização no navegador, que é outro assunto.
- **Histórico de pagamentos do delivery no painel**, com busca e filtro. O
  que existe é o resumo e o `mpPaymentId` em cada pedido, que é o que se
  procura no extrato.
