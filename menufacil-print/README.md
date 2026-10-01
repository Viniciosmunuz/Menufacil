# Menu Fácil Print

A ponte entre o Menu Fácil e a impressora térmica do balcão, em Android.

É o **Print Fácil do computador, em tablet**: mesma API, mesmo pareamento por
código, mesma impressão automática. Ninguém toca em "imprimir" -- o aplicativo
fica em segundo plano, pega o pedido na fila e manda para a impressora.

Ele **não tem cardápio**. O totem é a página `/totem/<slug>`, aberta no
navegador do tablet em modo quiosque. Este aplicativo só imprime.

## Como funciona

1. Primeira abertura: o aplicativo se registra e mostra um **código** na tela.
2. O dono digita esse código no painel → aba **Totem** → **Impressoras ligadas**.
3. A partir daí o aplicativo pergunta de 4 em 4 segundos se há comanda nova.
4. Achou: baixa a via, manda em ESC/POS para a impressora USB e marca como
   impressa no servidor.

**Impressão duplicada não acontece**: quem decide é o servidor, e ele só aceita
"impresso" uma vez por pedido. Dois aparelhos ligados na mesma conta nunca
imprimem a mesma comanda.

**Internet caiu?** Ele erra a pergunta e tenta de novo sozinho. Pedido nenhum se
perde: continua na fila até sair no papel.

## A API que ele usa

Nenhuma porta nova foi criada para este aplicativo. São as mesmas do Menu Fácil
para PC, no ar há meses:

- `POST /api/impressao/dispositivos` — registra e devolve o código
- `GET /api/impressao/pedidos` — a fila do que falta imprimir
- `GET /api/impressao/pedidos/{id}` — a via pronta (texto e dados do ESC/POS)
- `POST /api/impressao/pedidos/{id}/impresso` — marca impresso

## Gerar o APK

Não precisa de Android Studio: o GitHub compila.

**Actions → "Menu Fácil Print (APK)" → Run workflow**, e o arquivo aparece em
*Artifacts*, no fim da execução.

Depois é só subir o APK para o Blob do projeto e colar o endereço em
`src/lib/totem-release.ts` (`PRINT_APK_URL`), que o botão de baixar nasce no
painel.

Para compilar na mão, com o Android SDK instalado:

```bash
cd menufacil-print
gradle assembleDebug
```

## O que ainda falta

- **Impressora Bluetooth.** Hoje só USB. No tablet com uma porta só, Bluetooth
  resolve o conflito entre carregador e impressora.
- **Nunca rodou em aparelho de verdade.** O código está escrito e compila, mas
  USB, permissão e impressão só se provam no balcão.
