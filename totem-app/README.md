# Menu Fácil Totem

Aplicativo do totem de autoatendimento, para o mini PC do balcão (Pipo X8 Pro,
tela de toque de 7 polegadas). Projeto Electron próprio: **não faz parte do
site**, não entra no build da Vercel e não é lido pelo lint nem pelo typecheck
do MenuFácil.

## O que ele faz

1. Abre travado em tela cheia (modo quiosque). Alt+F4, Ctrl+W, F5, F11 e o
   inspetor ficam bloqueados, e a janela recupera o foco sozinha.
2. Na primeira vez, pede o **mesmo e-mail e senha do painel**. Entrou, já abre
   no cardápio do restaurante daquela conta — sem escolher nada.
3. O cliente monta o pedido, digita o nome e toca em pagar. A cobrança vai para
   a **maquininha Point do próprio restaurante** (a conta do Mercado Pago dele,
   cadastrada no painel → Totem).
4. Aprovado o cartão, o pedido é gravado no MenuFácil como pedido normal,
   marcado como **Totem**. A comanda sai na impressora térmica ligada ao totem —
   e continua saindo também na impressora do balcão, pela aba Pedidos do painel.
5. Para fechar o totem, cinco toques no canto superior esquerdo abrem os ajustes;
   ali o dono digita a **senha do painel**, que é conferida no servidor.

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

| Endereço | Para quê |
| --- | --- |
| `POST /api/totem/login` | entrar com e-mail e senha do painel |
| `POST /api/totem/parear` | ligar por código, quando não se tem a senha |
| `GET /api/totem/cardapio` | o cardápio, já sem o que esgotou |
| `POST /api/totem/pagamento` | manda a cobrança para a maquininha |
| `GET /api/totem/pagamento?id=` | como está o pagamento; quando aprova, devolve a via |
| `DELETE /api/totem/pagamento?id=` | o cliente desistiu |
| `POST /api/totem/desbloquear` | confere a senha para sair do modo quiosque |

## Impressão

Os arquivos `escpos.js`, `raw.js` e `windows.js` vieram do Print Fácil, que já
imprime em térmica USB no Windows há meses. São cópias de propósito: os dois
aplicativos podem evoluir sem quebrar um ao outro.

## O que ainda falta

- Ícone e identidade visual (`assets/`).
- Atualização automática (o Print Fácil usa `electron-updater`).
- Pizza montada por sabores: hoje o produto de pizza não aparece no totem.
