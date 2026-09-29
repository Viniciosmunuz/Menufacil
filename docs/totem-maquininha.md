# Totem: tudo que falta para colocar em ação

Atualizado em 29/09/2026.

O totem está construído e no ar. O que falta não é código: é conta do
Mercado Pago, maquininha e o aparelho do balcão. Este arquivo é a lista
completa, na ordem de fazer.

**Estado de hoje:** a tela do totem já funciona em
`menufacildelivery.com.br/totem/papaleguas` — dá para abrir no celular e
montar um pedido inteiro. Só o pagamento não acontece, porque depende da
conta do restaurante.

---

## 1. O que comprar

| Item | Observação |
| --- | --- |
| Mini PC com tela de toque | Pipo X8 Pro (7"). **Windows** é o sistema escolhido. |
| Impressora térmica USB | Ex.: Tomate MTI-773. Com driver instalado no Windows. |
| Maquininha **Mercado Pago Point** | **Atenção ao modelo** — ver abaixo. |
| Internet | A maquininha e o mini PC precisam estar on-line. |

### O modelo da maquininha importa

A cobrança automática (o totem manda o valor e a maquininha já mostra na
tela) usa a **API Point** do Mercado Pago. Nem todo modelo aceita.

- **Point Smart / Point Pro 2** — têm a API de integração.
- **Point Mini** (a de Bluetooth, mais barata) — **não serve**: não recebe
  cobrança pela API, só funciona pelo aplicativo no celular.

**Confirmar com o Mercado Pago antes de comprar.** Com o modelo errado, o
totem só cobra por Pix — metade do balcão fica sem atender.

---

## 2. Na conta do Mercado Pago do restaurante

O dinheiro é dele: cada restaurante usa a conta dele e o MenuFácil não fica
com nada no meio. **Cada restaurante novo passa por esta lista de novo.**

1. **Conta no CNPJ do restaurante.**
2. **Chave Pix cadastrada.** Sem ela o Mercado Pago cria a cobrança mas não
   devolve o QR, e o totem avisa que a conta não recebe Pix.
3. **Credenciais de produção** (*Seu negócio → Configurações → Gestão e
   administração → Credenciais*). O token de produção começa com `APP_USR-`.
   O de teste começa com `TEST-` e **não cobra de verdade**.
4. **Maquininha em modo integrado (PDV).** O passo que mais gente esquece.
   Uma Point nova vem em modo *standalone*: cobra sozinha pelo teclado dela
   e **ignora** o que o totem manda. Não dá erro claro — a cobrança
   simplesmente não aparece na tela dela.
5. **Pegar o `device_id`** (tipo `PAX_A910__SMARTPOS1234567890`).
6. **Cadastrar o webhook** em *Suas integrações → Webhooks*, com o endereço
   que o painel mostra (já vem com o `?r=...` do restaurante), marcando o
   evento de **pagamentos**. Copiar a **chave secreta** que aparece ali.

> O webhook é opcional para funcionar, mas faz falta: sem ele o totem
> descobre o pagamento perguntando de 2 em 2 segundos, e se travar no meio
> da passada o pedido não entra sozinho. Com ele, entra.

---

## 3. No MenuFácil

1. **`TOTEM_TOKEN_KEY` nas variáveis de ambiente da Vercel** (32 bytes em
   base64). É a chave que criptografa, no banco, o token do Mercado Pago de
   cada restaurante. **Uma vez só, para a plataforma inteira.** Sem ela a
   seção Totem abre mas avisa que não dá para guardar o token.
   Gerar com:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. **Ligar o recurso Totem** para o restaurante: *Admin → Restaurantes →
   (o restaurante) → Recursos → Totem de autoatendimento*. Sem isso,
   `/totem/<slug>` responde 404 de propósito. *(Papaléguas: já ligado.)*
3. No painel do restaurante, em **Totem**, colar: Access Token, `device_id`
   e a chave secreta do webhook.
4. O painel diz sozinho o que ainda falta ("o Pix já funciona, falta a
   maquininha", etc.).

---

## 4. O aplicativo no mini PC

O instalador **não fica dentro do site**: com os dois (o do PC e o do
totem, ~100 MB cada) em `public/`, a Vercel recusa o deploy inteiro. Isso
já aconteceu e travou o site por horas.

**Publicar uma versão:**

1. `cd totem-app && npm run dist` → sai em `totem-app/dist/`
2. Subir o `.exe` para o Blob do projeto: *Vercel → Storage →
   menufacil-blob → Browse data → Upload*
3. Colar o endereço em `TOTEM_SETUP_URL` (`src/lib/totem-release.ts`) e
   atualizar `TOTEM_APP_VERSION`

Enquanto `TOTEM_SETUP_URL` estiver vazio, o painel mostra "Em preparo" no
lugar do botão de baixar. **É o estado de hoje.**

**Instalar:**

1. Rodar o instalador no mini PC. O Windows avisa ("protegeu o seu
   computador") → *Mais informações* → *Executar assim mesmo*.
2. Abre travado em tela cheia pedindo e-mail e senha → usar **o login do
   painel do restaurante** → cai direto no cardápio dele.
3. Impressora: tocar no **pontinho apagado do canto de cima** (ou apertar
   **M**) → senha do painel → escolher a impressora → *Imprimir via de
   teste* → *Voltar ao atendimento* (tranca de novo).

**Travar o Windows.** O aplicativo bloqueia Alt+F4, Ctrl+W, F5, F11, o
inspetor e recupera o foco sozinho. Mas **Ctrl+Alt+Del e a tecla Windows
nenhum aplicativo consegue bloquear** — isso é configuração do sistema:
conta sem privilégio de administrador e shell restrito. Precisa ser feito
na instalação do mini PC.

---

## 5. O que testar antes do primeiro cliente

Nesta ordem. Ela separa os problemas.

1. **Pix primeiro** — não depende de maquininha nenhuma. Se o QR aparecer
   na tela do totem, o caminho do dinheiro está de pé. Travou aqui? O
   problema é a conta (token ou chave Pix).
2. **Cartão** — maquininha em modo integrado + `device_id` no painel.
   Travou aqui? O problema é a maquininha (modelo ou modo).
3. **A comanda sai nas duas impressoras?** A do totem e a do balcão (esta
   sai sozinha, pela fila da aba Pedidos).
4. **O pedido aparece na aba Pedidos** com o selo **Totem** e dizendo
   "Comer no local" ou "Para viagem".
5. **Painel de senhas** no segundo monitor: o número muda de coluna quando
   a cozinha marca pronto.
6. **Esgotar um prato no painel** e conferir que ele fica cinza no totem.
   *(Já testado em desenvolvimento; vale repetir no balcão.)*
7. **Fechar o totem pela senha** e reabrir.

---

## 6. Buracos conhecidos — resolver antes de virar rotina

- [ ] **"Pago sem pedido".** O cartão passa e o pedido não entra (um produto
      esgotou entre a cobrança e a gravação, ou o banco caiu). O código já
      detecta, registra em `TotemPayment.lastEvent` e manda chamar o
      atendente. Mas **não existe tela nenhuma no painel** que mostre esses
      casos — hoje só olhando o banco. **É o mais urgente da lista:** o
      cliente pagou e ninguém fica sabendo.
- [ ] **Estorno.** Não há botão para devolver dinheiro de um pedido do
      totem. Por enquanto é pelo aplicativo do Mercado Pago, na mão.
- [ ] **Histórico dos pagamentos do totem.** A tabela `TotemPayment` guarda
      tudo (valor, forma, situação, resposta do Mercado Pago) e nada disso
      aparece no painel.
- [ ] **Atualização automática do aplicativo.** O Print Fácil usa
      `electron-updater`; o totem ainda não. Hoje, atualizar é reinstalar.
- [ ] **Ícone próprio** do aplicativo (`totem-app/assets/`).
- [ ] **Nunca rodou numa máquina de verdade.** O instalador foi gerado e o
      build passa, mas modo quiosque, impressora térmica e maquininha só se
      provam no hardware.

### Melhorias que tiram trabalho da instalação

- [ ] **Listar as maquininhas no painel** em vez de digitar o `device_id`.
      A API Point devolve as maquininhas da conta
      (`GET /point/integration-api/devices`). Com o token já cadastrado, o
      painel podia mostrar uma lista para o dono escolher.
- [ ] **Botão "colocar a maquininha em modo integrado"**
      (`PATCH /point/integration-api/devices/{device_id}` com
      `operating_mode: "PDV"`). Resolve o passo 4 da seção 2 sem ninguém
      mexer no aparelho — e é onde a instalação mais trava.
- [ ] **Botão "testar a cobrança"**: manda R$ 1,00 para a maquininha e
      cancela em seguida, só para provar que a ligação está de pé.

---

## 7. Coisas do servidor que já morderam

Anotado porque custou tempo e vai voltar a acontecer.

- **Limite de 12 Serverless Functions (plano Hobby da Vercel).** Rota nova
  demais derruba o deploy inteiro. As cinco portas do totem já foram
  juntadas numa só (`/api/totem/[acao]`). Quando apertar de novo: juntar
  mais rotas, ou plano Pro.
- **Arquivo grande em `public/` derruba o deploy.** Os dois instaladores
  juntos (~200 MB) fizeram a Vercel recusar com uma mensagem que falava de
  *funções*, não de tamanho. Instalador vai para o Blob, nunca para
  `public/`.
- **O repositório está em ~306 MB** por causa de instaladores commitados no
  passado (o git guarda cada versão para sempre). Já não entram mais
  (`.gitignore`), mas o histórico não encolhe sozinho.
