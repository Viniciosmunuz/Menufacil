# Menu Fácil Totem (antes Menu Fácil Print)

O totem do restaurante e a impressora térmica do tablet, num aplicativo só.

Começou como o **Print Fácil do computador, em tablet** -- mesma API, mesmo
pareamento por código, mesma impressão automática -- e cresceu do mesmo jeito
que o Print Fácil virou o Menu Fácil para PC: desde a 0.2.0 ele também
**abre o totem**.

- **A tela do totem é a página do link** (`/totem/<slug>`), mostrada em tela
  cheia dentro do aplicativo (`TelaDoTotem.kt`). O aplicativo não desenha
  nada do totem: o que mudar no site aparece aqui sem atualizar o APK.
- **Um pareamento só.** Pareada a impressora (o código abaixo), o aplicativo
  pede ao servidor o token do totem (`POST /api/totem/aplicativo`, com o
  token da impressora) e o entrega à página no mesmo lugar em que a tela de
  ativação guardaria. Desligar a impressora no painel derruba o totem junto.
- **Sem totem liberado** para o restaurante, ele continua sendo só a
  impressora, como antes.
- **Saída para os ajustes:** o voltar do Android cinco vezes seguidas. Sem
  mexer, volta sozinho ao totem em dois minutos. (Trava de quiosque com
  senha e abrir ao ligar o tablet ainda não existem.)
- **Atualizar** é instalar o APK novo. O APK é de depuração, com a chave de
  teste do runner do GitHub, que muda a cada compilação: por enquanto, para
  instalar uma versão nova é preciso desinstalar a anterior.

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
