# Resposta para a Stone — quando eles entrarem em contato

Escrita em 26/10/2026, logo após a candidatura ser concluída no Partner HUB.
Curta de propósito: a equipe deles lê muitas dessas por dia.

**Confira o nome antes de mandar** — assinei como Vinícius, deduzindo do
e-mail. Se estiver errado, troque.

---

**Assunto:** Menu Fácil — ajuste na integração escolhida (Connect Stone)

Olá, tudo bem?

Sou Vinícius, do **Menu Fácil** (menufacildelivery.com.br), sistema de
cardápio digital, salão e delivery para bares e restaurantes. Candidatura
enviada em 26/10, trilha **Plug-in Partner**.

Antes de seguirmos, preciso corrigir um ponto do que declarei no formulário:

**A integração é o Connect Stone, não o SDK Android.**

Meu aplicativo de salão hoje é uma casca Android que carrega a interface do
sistema em WebView. Como a WebView é vedada nas máquinas Stone por normativa
PCI, embarcá-lo exigiria reescrever a interface inteira em Kotlin nativo.
Optei pelo Connect Stone: o sistema continua rodando no celular do garçom e
cria o pedido via API para a maquininha cobrar, recebendo depois o webhook de
confirmação para fechar a comanda.

Isso muda também a frase da minha descrição de que "o aplicativo não processa
pagamento": o pagamento continua sendo capturado pelo terminal Stone, mas
passa a ser **iniciado pelo meu sistema**.

Quatro dúvidas para começar:

1. **Terminais:** a documentação cita S920, V240M e Q92 (sistema Mamba).
   Essa é a lista atual?
2. **Ambiente de testes:** como obtenho acesso ao painel de testes da
   Pagar.me?
3. **Pix:** entendi que o Pix pelo Connect exige que o estabelecimento tenha
   Conta Stone com Pix habilitado. É isso mesmo? E há parcelamento no
   crédito?
4. **Pré-requisitos:** além do aceite do Termo de Uso e Adesão, falta algo
   antes da liberação do setup?

Obrigado,

**Vinícius — Menu Fácil**
contato@menufacildelivery.com.br
menufacildelivery.com.br

---

## Por que está escrita assim

- **Corrige antes de começar.** Se ele receber o setup de SDK Android, o
  prazo de 4 semanas de suporte dedicado começa a correr para o caminho
  errado.
- **Diz o motivo técnico.** "Mudei de ideia" soa amador; "a WebView é vedada
  por PCI" mostra que ele leu os requisitos.
- **Não promete prazo.** Ele é uma pessoa só; data assumida por e-mail vira
  cobrança depois.
- **Não menciona o CNPJ.** O cadastro foi feito com a MEI do pai, e isso é
  decisão dele — levantar o assunto sem ser perguntado só cria atrito.
- **Pergunta os terminais primeiro.** Sem saber quais máquinas atendem, não
  dá para prometer nada ao restaurante da Clarice, que é o motivo de tudo
  isso.
