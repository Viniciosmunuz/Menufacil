# Menu Fácil Totem

Aplicativo do totem de autoatendimento, para o mini PC do balcão (Pipo X8 Pro,
tela de toque de 7 polegadas). Projeto Electron próprio: **não faz parte do
site**, não entra no build da Vercel e não é lido pelo lint nem pelo typecheck
do MenuFácil.

## O que ele faz

**Este aplicativo não tem cardápio próprio.** Ele abre, travado em tela cheia,
a página `/totem/<slug>` do MenuFácil -- o mesmo `<RestaurantMenu />` que o
cliente vê pelo link do restaurante. O desenho é idêntico porque é a mesma
página: mexer no cardápio muda os dois de uma vez.

1. Abre travado em tela cheia (modo quiosque). Alt+F4, Ctrl+W, F5, F11 e o
   inspetor ficam bloqueados, e a janela recupera o foco sozinha.
2. Na primeira vez, pede o **mesmo e-mail e senha do painel**. Entrou, já abre
   no cardápio do restaurante daquela conta -- sem escolher nada.
3. O cliente monta o pedido igual ao do link. No fim, em vez de endereço de
   entrega, o balcão pergunta **comer aqui ou levar** e **cartão ou Pix**.
   Dinheiro não existe no totem: não há quem receba nem quem dê troco.
4. Os dois caem direto na conta do Mercado Pago do próprio restaurante,
   cadastrada no painel → Totem. O MenuFácil não fica com nada no meio.
5. Aprovado o pagamento, o pedido é gravado como pedido normal, marcado como
   **Totem**. A comanda sai na impressora térmica ligada ao totem -- e continua
   saindo também na impressora do balcão, pela aba Pedidos do painel.
6. Para sair, um toque no pontinho apagado do canto de cima (ou a tecla **M**)
   pede a **senha do painel**, conferida no servidor. Destravado, aparecem os
   ajustes de impressora e o botão de fechar.

## Rodar durante o desenvolvimento

```bash
cd totem-app
npm install
npm start
```

Na tela de entrada, abra "Não tem a senha à mão?" para apontar o endereço do
servidor para `http://localhost:3000` enquanto testa.

## Gerar o instalador

```bash
npm run dist
```

O arquivo sai em `dist/`. Para publicar: copie o instalador para
`public/totem/` do site, e no MenuFácil mude `TOTEM_APP_VERSION` e vire
`TOTEM_APP_DISPONIVEL` para `true` em `src/lib/totem-release.ts`.

## O que este aplicativo fala com o servidor

Tudo em `/api/totem/`, com o token do aparelho no cabeçalho `Authorization`.
O token fica em `%APPDATA%/menufacil-totem/totem.json` e nunca chega à tela.

- `POST /api/totem/login` — entrar com e-mail e senha do painel
- `POST /api/totem/parear` — ligar por código, quando não se tem a senha
- `GET /api/totem/cardapio` — o cardápio, já sem o que esgotou
- `POST /api/totem/pagamento` — começa a cobrança (`forma: "cartao"` ou `"pix"`)
- `GET /api/totem/pagamento?id=` — como está; quando aprova, devolve a via pronta
- `DELETE /api/totem/pagamento?id=` — o cliente desistiu
- `POST /api/totem/desbloquear` — confere a senha para sair do modo quiosque

O totem pergunta o tempo todo como está o pagamento, em vez de esperar um aviso.
É de propósito: assim ele funciona mesmo em restaurante que não cadastrou o
webhook no Mercado Pago. O webhook, quando existe, só adianta o trabalho.

## Roda no Windows e no Linux

A única parte presa ao sistema é a impressão, e ela tem os dois caminhos:

- **Windows** (`raw.js`, `windows.js`): fala com a fila de impressão pelo
  winspool, via PowerShell. É o caminho já testado -- veio do Print Fácil, que
  imprime em térmica USB há meses.
- **Linux** (`linux.js`): fala com o CUPS pelo `lp`, com `-o raw` para o ESC/POS
  chegar intacto. Sai até mais simples que no Windows.

Quem escolhe é o `impressoras.js`, pelo `process.platform`. O resto do programa
não sabe a diferença.

```bash
npm run dist        # Windows: instalador .exe
npm run dist:linux  # Linux: AppImage
```

No Linux, a térmica USB costuma aparecer sozinha no CUPS. Quando não aparece, é
instalá-la uma vez em http://localhost:631.

## O que ainda falta

A lista completa -- inclusive o que precisa ser feito na conta do Mercado Pago e
na maquininha -- está em [`docs/totem-maquininha.md`](../docs/totem-maquininha.md).

Do lado deste aplicativo:

- Ícone e identidade visual (`assets/`).
- Atualização automática (o Print Fácil usa `electron-updater`).
- Pizza montada por sabores: hoje o produto de pizza não aparece no totem.
- Ctrl+Alt+Del e a tecla Windows: nenhum aplicativo consegue bloquear isso. Para
  travar de verdade, o Windows precisa estar configurado com conta sem
  privilégio e shell restrito.
