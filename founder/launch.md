# Plano de execução — MenuFácil

> A skill planeja um lançamento. **Você já lançou** — tem sistema no ar, dois
> clientes pagando e um restaurante operando o dia inteiro nele. Então o que
> está aqui não é "como abrir": é **como sair de 2 para 10 clientes sem bater
> no teto**, com datas e dono de cada tarefa.
>
> Dono de tudo: você. É a operação inteira, e esse é o ponto.

## 1. O teste barato, antes de gastar

A skill manda testar com comprador real antes de assumir custo grande. O seu
custo grande não é dinheiro — é **tempo** e é **subir o preço**. Então o teste
é o preço.

| | |
| --- | --- |
| **O teste** | 6 visitas: 3 falando R$ 249, 3 falando R$ 199 |
| **Prazo** | 10 a 21 de novembro de 2026 |
| **Linha de sucesso, escrita antes** | **2 contratos fechados em 6 visitas**, sendo pelo menos 1 a R$ 249 |
| **Se falhar** | Nenhum contrato em 6 visitas: o problema não é preço. Volte para [offer.md](offer.md) — falta prova, não desconto |
| **Se passar no R$ 199 e falhar no R$ 249** | O preço é R$ 199, não R$ 249. Atualize `numbers.json` e refaça o CFO |

**Confie no comprador real acima de qualquer coisa escrita nestes arquivos.**

## 2. A contagem, de hoje até o décimo cliente

### Novembro — vender (3 a 28/11)

| semana | o que tem de acontecer | trava o resto? |
| --- | --- | --- |
| 3–7/11 | Autorização do Papaléguas para usar o número de outubro. Lista de 30 restaurantes. Pitch decorado | **Sim — caminho crítico.** Sem a prova do Papaléguas, a venda fica sem lastro |
| 10–14/11 | 15 visitas, teste de preço rodando | Sim |
| 17–21/11 | Voltar nos indecisos + 9 visitas novas | Não |
| 24–28/11 | Implantar quem fechou. Pedir indicação. Revisão dos 30 dias | Não |

### Dezembro — legalizar e aguentar (1 a 19/12)

| semana | o que tem de acontecer | trava o resto? |
| --- | --- | --- |
| 1–5/12 | **Buscar marca no INPI.** Decidir a saída do CNPJ com um contador — MEI de software, ME, ou outro caminho | **Sim — caminho crítico.** Trava a nota fiscal, o décimo cliente e o app na Stone |
| 8–12/12 | **Verificar os termos da Vercel e do Neon.** Orçar os planos pagos | **Sim.** Risco de suspensão com clientes dentro |
| 15–19/12 | Escrever o contrato de prestação com cláusula de LGPD e a política de privacidade. Um advogado olha | Sim, para fechar com restaurante maior |

**Dezembro e janeiro vendem mal** — restaurante está no corre de fim de ano e
ninguém quer mexer no sistema em dezembro. É por isso que esse mês é de
burocracia: você aproveita o vale.

### Janeiro a março — crescer com o pé no chão

- **Janeiro:** implantar quem ficou de dezembro. Medir quanto suporte cada
  cliente novo realmente consome — esse número decide tudo daqui pra frente.
- **Fevereiro:** retomar visitas com o pitch já calibrado pelas 24 conversas
  de novembro.
- **Março:** 31/03 é o fim do Plano Fundador. Honre a data: preço de fundador
  que não acaba vira preço normal, e aí você não pode mais subir.

### O caminho crítico, em uma frase

**A autorização do Papaléguas (semana 1) e o CNPJ (dezembro).** Sem a primeira
você vende sem prova; sem o segundo você não passa do nono cliente. Todo o
resto pode atrasar uma semana sem consequência.

## 3. O dia de uma visita

Não existe "dia do lançamento" para você. Existe o dia da visita, e ele tem
hora certa.

| hora | o quê |
| --- | --- |
| Antes de sair | Conferir que o restaurante de demonstração está no ar e com pedido de teste pronto |
| **14h–17h** | As visitas. **Nunca no almoço, nunca no jantar** — você vira estorvo e perde o cliente antes de falar |
| Na conversa | Pitch (2 min) → demonstração no celular **dele** (3 min) → o print do Papaléguas → *"Quer que eu cadastre seu cardápio essa semana?"* |
| Se ele disser "deixa eu pensar" | Marcar o retorno **ali, com data**. "Passo terça 17h, pode ser?" Sem data, não volta |
| À noite | Anotar: nome, objeção exata nas palavras dele, preço que você falou |

**Se algo quebrar durante a demonstração:** não disfarce. "Isso aqui está
assim porque eu mexi ontem, e quem conserta sou eu — hoje à noite." Dono de
restaurante já foi enganado por vendedor de software antes; honestidade na
falha vende mais que demonstração perfeita.

## 4. Os primeiros 30 dias, medidos

| número | onde ver | meta/semana | o que fazer se ficar abaixo |
| --- | --- | --- | --- |
| Conversas iniciadas | seu caderno | 15 | Só depende de você sair. Se está abaixo, o problema não é o mercado |
| Demonstrações | seu caderno | 7 | A abertura não prende. Reescreva os primeiros 30 segundos |
| Contratos | seu caderno | 1 | 2 semanas com demonstração e zero contrato → preço ou prova |
| Horas de suporte | seu relógio | ≤ 1,5 h por cliente | Subindo? O teto de 14 clientes cai, e a conta muda |

**As revisões:** dia **14/11** (o pitch está prendendo?), dia **21/11** (qual
objeção se repete?), dia **28/11** (fechou quantos? o preço se sustentou?).

### A linha de corte, escrita antes

**30 conversas em novembro e nenhum contrato:** pare de visitar. Não insista
por teimosia — o problema está na oferta ou na prova, e insistir só queima a
sua lista de 30 restaurantes, que é finita numa cidade pequena.

**3 ou mais contratos:** você achou o canal. E aí o gargalo deixa de ser venda
e passa a ser a sua hora de suporte — que é o assunto do [cfo.md](cfo.md) e do
[ops.md](ops.md).

---

Arquivo: `founder/launch.md`. A seguir: `/founder-plan`.
