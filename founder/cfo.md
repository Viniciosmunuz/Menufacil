# CFO — MenuFácil

> **Contas feitas à mão.** O script `unit_economics.py` da skill precisa de
> Python 3, que não está instalado neste computador. Refiz o que ele calcula
> na mão, com os mesmos cenários (preço −10%, volume −20%, custos +15%).
> Instalando o Python, dá para rodar o original e conferir.
>
> Isto não é consultoria contábil, fiscal ou jurídica. Antes de mover dinheiro
> — e principalmente antes de abrir o CNPJ — um contador precisa olhar a
> estrutura e o imposto.

---

## A nota do CFO

**A margem.** Cada restaurante a R$ 180/mês deixa **R$ 180**. Não é força de
expressão: o custo variável por cliente é zero hoje e o custo fixo da operação
inteira é o domínio, R$ 3,50/mês. A margem no volume planejado é de **99,8%**.

Esse número é bonito e **quase não quer dizer nada**, porque ele só é verdade
enquanto duas coisas se mantiverem: a infraestrutura gratuita e o fato de você
não se pagar salário. As duas vão mudar.

**A linha para vigiar: as horas, não o dinheiro.** Rodei os três cenários que
o CFO manda rodar e o resultado é o mesmo nos três — o negócio continua
lucrativo, porque não há custo para comprimir. O que aperta é outra coisa:

> Hoje são **3 h de suporte por semana para 2 clientes** = 1,5 h por cliente.
> Em 10 clientes isso vira **15 h por semana**. Em 14, vira 21 h — meio
> expediente, antes de escrever uma linha de código.

No mês 12, com 10 clientes, você faz R$ 1.800/mês e gasta ~65 h/mês de
suporte: **R$ 27,70 por hora**, e isso contando só o suporte, não o
desenvolvimento. O teto não é financeiro, é físico: **14 clientes**, com o
nível de atendimento de hoje.

**Caixa.** Você precisa de **R$ 0**. O gasto inicial é o domínio (R$ 40) e o
primeiro cliente já pagou isso no primeiro mês. Não há o que financiar, não há
payback a esperar. Nesse aspecto o negócio é invejável.

**O número que mais me chamou atenção.** O Papaléguas faturou **R$ 10.510,50**
pelo sistema em outubro (240 pedidos, ticket de R$ 43,79) e te paga R$ 180.
Isso é **1,71% do que passou pelo seu sistema**. Você está cobrando quase
nada — e é isso que a próxima seção trata.

---

## 1. A unidade

| | |
| --- | --- |
| Unidade | um restaurante-mês (uma assinatura ativa, um mês) |
| Preço | R$ 180,00 (100% Delivery) · R$ 100,00 (Essencial) |
| Custo variável | R$ 0,00 |
| **Contribuição por unidade** | **R$ 180,00** |

## 2. Custo fixo mensal

| item | valor |
| --- | --- |
| Domínio menufacildelivery.com.br | R$ 3,50 |
| Vercel | R$ 0,00 (plano gratuito) |
| Banco Neon | R$ 0,00 (plano gratuito) |
| **Total** | **R$ 3,50** |

**Ponto de equilíbrio: 0,02 restaurante.** O primeiro cliente paga a operação
inteira 51 vezes.

## 3. Ano 1, mês a mês

Rampa de 2 para 10 clientes, ~0,7 cliente novo por mês. **Sem churn** — e isso
é otimismo embutido, não um dado.

| mês | clientes | receita (todos a R$ 180) | receita (mix realista) |
| --- | --- | --- | --- |
| 1 | 2 | R$ 360 | R$ 280 |
| 2 | 3 | R$ 540 | R$ 380 |
| 3 | 3 | R$ 540 | R$ 380 |
| 4 | 4 | R$ 720 | R$ 480 |
| 5 | 5 | R$ 900 | R$ 580 |
| 6 | 6 | R$ 1.080 | R$ 760 |
| 7 | 6 | R$ 1.080 | R$ 760 |
| 8 | 7 | R$ 1.260 | R$ 860 |
| 9 | 8 | R$ 1.440 | R$ 1.040 |
| 10 | 9 | R$ 1.620 | R$ 1.140 |
| 11 | 9 | R$ 1.620 | R$ 1.140 |
| 12 | 10 | R$ 1.800 | R$ 1.320 |
| **ano** | **72 restaurante-meses** | **R$ 12.960** | **R$ 9.120** |

*Mix realista = 6 Essencial + 4 Delivery no mês 12, porque nem todo restaurante
vai querer o plano de cima.*

- **Lucro operacional do ano 1:** R$ 12.918 (ou R$ 9.078 no mix)
- **Depois do gasto inicial (R$ 40):** R$ 12.878
- **Payback:** mês 1
- **Run-rate no mês 12:** R$ 21.600/ano (ou R$ 15.840 no mix)

## 4. Os cenários

| cenário | receita ano 1 | lucro ano 1 | muda a decisão? |
| --- | --- | --- | --- |
| Base | R$ 12.960 | R$ 12.918 | — |
| **Preço −10%** (R$ 162) | R$ 11.664 | R$ 11.622 | Não |
| **Volume −20%** (8 no mês 12) | R$ 10.440 | R$ 10.398 | Não |
| **Custos +15%** (domínio R$ 4,03) | R$ 12.960 | R$ 12.912 | Não |
| **Churn de 1 cliente/ano** | R$ 11.880 | R$ 11.838 | Pouco |
| **Infra deixa de ser grátis** (~R$ 250/mês, *estimativa*) | R$ 12.960 | R$ 9.918 | Não |

**Nenhum dos cenários clássicos quebra isso** — e é justamente por isso que a
planilha engana. Um negócio sem custo é imune a cenário de custo. O que ele
não é imune é a ninguém comprar, e a você não ter mais hora no dia.

## 5. Três jeitos de melhorar, com o número de cada um

**1. Subir o preço dos clientes novos.**
A mediana do mercado é R$ 209 ([competitors.md](competitors.md)) e você cobra
R$ 180 entregando salão, totem e delivery no mesmo valor. A R$ 250:

> 10 clientes × R$ 250 = **R$ 2.500/mês**, contra R$ 1.800. **+R$ 700/mês,
> +39% no ano**, sem uma hora a mais de trabalho.

Nos clientes atuais, não mexa: dois clientes é pouco para arriscar um. Vale
para quem entrar daqui pra frente.

**2. Cobrar implantação.**
A hora mais cara é a do primeiro mês — cadastrar cardápio, ensinar, acertar
impressora. Hoje é de graça. R$ 300 de implantação × 8 clientes novos no ano =
**+R$ 2.400 no ano 1**, quase 19% em cima da receita base, e cobra exatamente
o que mais consome você.

**3. Derrubar a hora de suporte por cliente.**
De 1,5 h para 0,75 h por cliente por semana **dobra o teto**: de 14 para 28
clientes dentro das mesmas 21 h/semana. É a única das três que muda o tamanho
possível do negócio, e não um número da planilha.

## 6. O veredito honesto

**É lucrativo desde o primeiro cliente.** Não há dúvida nenhuma sobre isso.

**Mas 10 restaurantes a R$ 180 não é um emprego, é uma renda extra.**
R$ 1.800/mês no mês 12, por 15 h/semana de suporte mais todo o
desenvolvimento. Se a meta é viver disso, a conta não é de 10 restaurantes:

| receita desejada | a R$ 180 | a R$ 250 |
| --- | --- | --- |
| R$ 3.000/mês | 17 clientes | 12 clientes |
| R$ 5.000/mês | 28 clientes | 20 clientes |
| R$ 8.000/mês | 45 clientes | 32 clientes |

E 28 clientes a 1,5 h/semana cada são 42 h/semana só de suporte — impossível
sozinho. **Por isso as duas alavancas reais são preço e hora de suporte, não
número de clientes.** Qualquer plano que só persiga cliente novo bate no teto
antes de virar salário.

**O risco que a planilha não mostra:** a receita não passa por empresa
nenhuma. Enquanto for R$ 1.800/mês entre conhecidos, passa. Em 10 clientes com
restaurante querendo nota fiscal, não passa. O CNPJ não é burocracia a
resolver depois — é pré-requisito do décimo cliente.

---

Arquivos: `founder/numbers.json`, `founder/cfo.md`, `founder/cfo-sources.md`.
A seguir: `/founder-pricing` (a margem não é fina, mas o preço está abaixo da
mediana) e `/founder-marketing` (o furo é aquisição).
