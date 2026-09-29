# Totem: o que falta para funcionar 100% com a maquininha

Anotado em 29/09/2026, quando a base do totem entrou no ar (commits `35b91f8`
e `557eb70`).

Hoje o código está pronto e testado até o ponto em que o Mercado Pago recusa um
token falso. Daí para a frente só anda com conta real e maquininha na mão. Este
arquivo é a lista do que falta, na ordem.

---

## 1. O que precisa existir no balcão

| Item | Observação |
| --- | --- |
| Mini PC com tela de toque | O Pipo X8 Pro (7") é o que está no plano. Windows. |
| Impressora térmica USB | Ex.: Tomate MTI-773. Precisa de driver instalado no Windows. |
| Maquininha **Mercado Pago Point** | **Atenção ao modelo** — ver abaixo. |
| Internet | A maquininha e o mini PC precisam estar on-line. |

### O modelo da maquininha importa

A cobrança automática (o totem manda o valor e a maquininha já mostra na tela)
usa a **API Point** do Mercado Pago. Nem todo modelo aceita isso.

- **Point Smart / Point Pro 2** — são os modelos com a API de integração.
- **Point Mini** (a de Bluetooth, mais barata) — **não serve**: ela não recebe
  cobrança pela API, só funciona pelo aplicativo no celular.

**Confirmar com o Mercado Pago antes de comprar.** Se vier o modelo errado, o
totem só vai conseguir cobrar por Pix — que funciona em qualquer conta, mas
deixa metade do balcão sem atender.

---

## 2. Na conta do Mercado Pago do restaurante

O dinheiro é do restaurante: cada um usa a conta dele, e o MenuFácil não fica
com nada no meio. Isso significa que **cada restaurante que quiser totem passa
por esta lista de novo**.

1. **Conta do Mercado Pago no CNPJ do restaurante.**
2. **Chave Pix cadastrada na conta.** Sem ela, o Mercado Pago cria a cobrança
   mas não devolve o QR — e o totem mostra "a conta deste restaurante ainda não
   recebe Pix".
3. **Credenciais de produção.** Em *Seu negócio → Configurações → Gestão e
   administração → Credenciais*. O Access Token de produção começa com
   `APP_USR-`. O de teste começa com `TEST-` e **não cobra de verdade**.
4. **Maquininha no modo integrado (PDV).** Este é o passo que mais gente esquece.
   Uma Point recém-comprada vem em modo *standalone*: ela cobra sozinha, pelo
   teclado dela, e **ignora** a cobrança que o totem manda. Precisa ser virada
   para o modo integrado.
5. **Pegar o `device_id` da maquininha.** É um código do tipo
   `PAX_A910__SMARTPOS1234567890`.
6. **Cadastrar o webhook.** Em *Suas integrações → Webhooks*, com o endereço que
   o painel do MenuFácil mostra (já vem com o `?r=...` do restaurante), marcando
   o evento de **pagamentos**. Copiar a **chave secreta** que aparece ali.

> O webhook é opcional para funcionar, mas faz falta: sem ele o totem descobre o
> pagamento perguntando de 2 em 2 segundos, e se o totem travar no meio da
> passada, o pedido não entra sozinho. Com ele, entra.

---

## 3. No MenuFácil

1. **Criar a variável `TOTEM_TOKEN_KEY` na Vercel** (32 bytes em base64). É a
   chave que criptografa, no banco, o token do Mercado Pago de cada restaurante.
   Sem ela, a seção Totem abre mas avisa que não dá para guardar o token.
   Uma vez só, para a plataforma inteira.
2. **Ligar o recurso Totem** para o restaurante: *Admin → Restaurantes → (o
   restaurante) → Recursos → Totem de autoatendimento*.
3. No painel do restaurante, em **Totem**, colar: Access Token, `device_id` e a
   chave secreta do webhook.
4. O painel diz sozinho o que ainda falta ("o Pix já funciona, falta a
   maquininha", etc.).

---

## 4. O que ainda falta programar

> Atualizado em 29/09/2026: o totem deixou de ter cardápio próprio. Ele abre a
> página `/totem/<slug>` do MenuFácil, que é o mesmo cardápio do link do
> restaurante -- fotos, esgotado, preço e pizza saem do banco na hora. Não há
> um segundo cardápio para manter.


### Precisa, antes de ligar num restaurante

- [x] ~~Gerar o instalador do totem.~~ Feito: `public/totem/MenuFacilTotem-Setup-0.1.0.exe`.
- [ ] **Ligar o recurso Totem para o restaurante** no admin. Sem isso,
      `/totem/<slug>` responde 404 de propósito.
- [ ] **Testar o aplicativo no Pipo X8 Pro de verdade.** O instalador foi gerado
      e o build passou, mas nunca rodou numa máquina: modo quiosque, impressora
      térmica e maquininha só se provam no hardware. **Windows** é o sistema
      escolhido (o código do Linux existe, mas não é o caminho).
- [ ] **Travar o Windows.** O modo quiosque do aplicativo bloqueia Alt+F4,
      Ctrl+W, F5, F11 e o inspetor, e recupera o foco sozinho. Mas
      **Ctrl+Alt+Del e a tecla Windows nenhum aplicativo consegue bloquear** —
      isso é configuração do sistema: conta sem privilégio de administrador e
      shell restrito. Precisa ser feito na instalação do mini PC.
- [ ] **Testar uma passada de cartão de verdade**, de ponta a ponta: cobrança →
      maquininha → pedido na aba Pedidos → comanda nas duas impressoras.
- [ ] **Testar um Pix de verdade**, idem.

### Melhorias que tiram trabalho da instalação

- [ ] **Listar as maquininhas no painel em vez de digitar o `device_id`.** A API
      Point tem um endereço que devolve as maquininhas da conta
      (`GET /point/integration-api/devices`). Com o token já cadastrado, dá para
      o painel mostrar uma lista e o dono só escolher. Hoje ele precisa achar o
      código na maquininha e digitar sem errar.
- [ ] **Botão "colocar a maquininha em modo integrado".** A mesma API troca o
      modo de operação da maquininha
      (`PATCH /point/integration-api/devices/{device_id}` com
      `operating_mode: "PDV"`). Isso resolve o passo 4 da seção 2 sem ninguém
      mexer no aparelho — e é o passo em que a instalação mais trava.
- [ ] **Botão "testar a cobrança"** no painel: manda R$ 1,00 para a maquininha e
      cancela em seguida, só para provar que a ligação está de pé antes do
      primeiro cliente.

### Buracos conhecidos, que vão doer quando acontecerem

- [ ] **"Pago sem pedido".** Existe um caso real: o cartão passa, e o pedido não
      entra (um produto esgotou entre a cobrança e a gravação, ou o banco caiu).
      O código **já detecta e registra** isso em `TotemPayment.lastEvent`, e o
      totem manda chamar o atendente. Mas **não há tela nenhuma no painel** que
      mostre esses casos. Hoje só olhando o banco. Precisa de um lugar visível,
      senão o cliente pagou e ninguém fica sabendo.
- [ ] **Estorno.** Não existe botão para devolver o dinheiro de um pedido do
      totem. Por enquanto é pelo aplicativo do Mercado Pago, na mão.
- [ ] **Histórico dos pagamentos do totem.** A tabela `TotemPayment` guarda tudo
      (valor, forma, situação, o que o Mercado Pago respondeu), mas nada disso
      aparece no painel.
- [ ] **O instalador vai para dentro do git**, como já acontecia com o Menu
      Fácil para PC. São 98 MB por versão, e o git guarda cada uma para sempre:
      o repositório já está em 306 MB, e a Vercel clona ele a cada deploy. Antes
      da próxima versão vale mover os instaladores para o Vercel Blob (o projeto
      já tem token) ou para Releases do GitHub.
- [ ] **Atualização automática do aplicativo.** O Print Fácil usa
      `electron-updater`; o totem ainda não tem. Hoje, atualizar é reinstalar.

---

## 5. Ordem sugerida do primeiro teste

Fazer nesta ordem poupa muita confusão:

1. `TOTEM_TOKEN_KEY` na Vercel.
2. Ligar o recurso Totem no restaurante, pelo admin.
3. Colar o **Access Token de produção** no painel.
4. **Testar o Pix primeiro** — ele não depende de maquininha nenhuma. Se o QR
   aparecer na tela do totem, o caminho do dinheiro está de pé.
5. Só então: maquininha em modo integrado, `device_id` no painel, e testar o
   cartão.
6. Por último, o webhook. Ele é otimização, não é o que faz funcionar.

Se travar no passo 4, o problema é a conta (token, Pix). Se travar no 5, é a
maquininha (modelo ou modo de operação). Essa separação é o que torna o teste
rápido.
