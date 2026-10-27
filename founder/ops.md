# Operação — MenuFácil

Como o negócio roda de verdade com 10 clientes, e o que quebra antes disso.

## 1. Fornecedores e o que custam

| fornecedor | para quê | hoje | quando deixa de servir |
| --- | --- | --- | --- |
| Vercel | hospedagem do sistema | R$ 0 (plano gratuito) | **A conferir.** O plano gratuito tem limite de banda e de execução, e é de uso pessoal nos termos. Com 10 restaurantes cobrando mensalidade, é uso comercial |
| Neon | banco de dados | R$ 0 (plano gratuito) | **A conferir.** Limite de armazenamento e de horas de processamento |
| Registro.br | domínio | ~R$ 40/ano | Não deixa |
| Mercado Pago | maquininha do totem | tarifa por transação, paga pelo restaurante | Não deixa |
| Stone | app do garçom na maquininha | parado | Travado no CNPJ |

**O item mais urgente desta tabela não é preço, é termo de uso.** Operar um
SaaS pago em plano gratuito de uso pessoal é risco de ter o projeto suspenso
sem aviso — e aí dez restaurantes param no mesmo minuto. Isso precisa ser
verificado e resolvido **antes** do quinto cliente, não depois.

## 2. Quem trabalha quando

Uma pessoa. Essa é a operação inteira, e é o fato mais importante do
documento.

| bloco | horas/semana hoje | em 10 clientes |
| --- | --- | --- |
| Suporte | 3 h | **15 h** |
| Implantação de cliente novo | — | ~6 h por cliente, no primeiro mês |
| Desenvolvimento | o resto | o que sobrar |
| Venda (visitas) | 0 | 9 a 12 h se seguir o [marketing.md](marketing.md) |

**A conta não fecha sozinha.** 15 h de suporte + 12 h de visita = 27 h/semana
antes de programar uma linha. Ou a hora de suporte por cliente cai (ver
[cfo.md](cfo.md), melhoria nº 3), ou o crescimento para em algum ponto entre
10 e 14 clientes.

## 3. As rotinas

### Implantar um cliente novo (meia dia, hoje)

1. Criar o restaurante no admin; definir plano e modo de operação.
2. Cadastrar o cardápio a partir da foto do impresso (é o passo longo).
3. Criar a conta do dono; ele troca a senha no primeiro acesso.
4. Instalar o Menu Fácil PC e parear a impressora.
5. Fazer um pedido de teste de ponta a ponta: link → painel → impressora.
6. Treinar o dono em 20 minutos: aceitar pedido, esgotar item, fechar o dia.
7. Combinar o primeiro sábado: você de plantão no WhatsApp.

### O dia a dia

- Manhã: olhar o painel do admin — algum restaurante com pedido atrasado?
- Responder WhatsApp no horário do restaurante, não no seu.
- Publicar mudança de código **fora** do horário de pico (nunca entre 18h e
  23h).

### Fechar o mês

- Conferir quem pagou a mensalidade.
- Emitir a nota — **hoje não é possível, ver a seção 4.**
- Olhar o uso de banco e banda contra os limites gratuitos.

## 4. Licenças, papel e o que está faltando

| o quê | situação | consequência de não ter |
| --- | --- | --- |
| **CNPJ próprio** | **não existe** | Não emite nota. Restaurante com contador pede nota. Trava a venda, e trava o app na Stone |
| Nota fiscal de serviço | depende do CNPJ | idem |
| Contrato de prestação de serviço | não existe | Sem ele, "preço travado 12 meses" e "sem fidelidade" são palavra falada |
| **Adequação à LGPD** | não verificada | Ver abaixo |
| Registro de marca (INPI) | não verificado | [brand.md](brand.md) |

### A LGPD, que ninguém levantou ainda

O sistema guarda **nome, telefone e endereço dos clientes finais** de cada
restaurante. Juridicamente o restaurante é o controlador desses dados e **você
é o operador**. Isso te dá obrigações próprias, e a principal é documental:

- Um **contrato com cláusula de tratamento de dados** entre você e cada
  restaurante, dizendo o que você faz com os dados e que não usa para outra
  coisa.
- Uma **política de privacidade** no cardápio público, onde o cliente final
  digita o endereço.
- Um plano para quando um cliente final pedir os dados dele ou pedir exclusão.

**Não é teoria e não é caro de resolver** — é escrever dois documentos. Mas
cresce de importância a cada restaurante novo, e um contador ou advogado
precisa olhar junto com o CNPJ.

## 5. Registro de riscos

| risco | chance | impacto | o que fazer |
| --- | --- | --- | --- |
| **Você ficar doente, viajar ou sumir por uma semana** | alta | **crítico** | É o maior risco do negócio e não tem solução boa sozinho. O mínimo: um documento de "como resolver os 5 problemas mais comuns" na mão dos donos, para eles não ficarem parados |
| Vercel ou Neon suspenderem por uso comercial em plano gratuito | média | **crítico** | Verificar os termos e migrar para plano pago **antes** do quinto cliente |
| Banco cair no sábado à noite | média | alto | Você já viu isso acontecer no ambiente local (P1017 o tempo todo). Saber restaurar rápido e avisar o dono antes que ele te ligue |
| Restaurante perder pedido no pico | média | alto | O aviso de pedido atrasado já existe no painel. Serve para você ver antes dele |
| Cliente sair (churn) | desconhecida | alto | Com 2 clientes, perder 1 é perder metade da receita. Não há como estimar; só dá para observar |
| Mercado Pago bloquear conta do restaurante | baixa | médio | Não é seu, mas você vai ser chamado. Saber a quem encaminhar |
| Concorrente copiar | alta | **baixo** | Copiam o produto em semanas. Não copiam você atender pelo nome. Não gaste energia aqui |
| Marca já registrada no INPI | desconhecida | alto | Verificar antes de imprimir qualquer coisa |

**Leia a tabela de novo e repare:** os dois riscos críticos não têm nada a ver
com concorrência nem com produto. São você ser uma pessoa só e a
infraestrutura estar em plano gratuito. É aí que a operação quebra.

## 6. O que volta para o CFO

- Infra deixará de ser R$ 0. Ordem de grandeza: algumas centenas de reais por
  mês quando os planos pagos entrarem — **a confirmar nos sites**, não é um
  número que eu tenha verificado.
- Implantação consome ~6 h por cliente novo. A R$ 249/mês, o cliente paga essas
  horas em pouco mais de um mês — o que torna o churn precoce especialmente
  caro.

---

Arquivo: `founder/ops.md`. A seguir: `/founder-launch`.
