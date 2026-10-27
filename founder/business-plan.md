# Plano de negócio — MenuFácil

Compilado em 26 de outubro de 2026.

> **Compilado à mão.** O `compile.py` da skill precisa de Python 3, que não
> está instalado neste computador. Os testes abaixo foram calculados na mão a
> partir de `founder/numbers.json`, com os mesmos critérios do script.
> Instalando o Python, dá para rodar o original e conferir.

---

## Veredito: **Incompleto**

| # | teste | critério | resultado |
| --- | --- | --- | --- |
| 1 | Cada unidade ganha antes dos custos fixos | contribuição > 0 | ✅ **R$ 180,00** |
| 2 | Ano 1 dá lucro operacional | lucro > 0 | ✅ **R$ 12.918** |
| 3 | Equilíbrio cabe na capacidade | 0,02 ≤ 14 | ✅ |
| 4 | Compradores suficientes compram | ≥ 25% | ⛔ **não executado** |

O teste 4 depende do painel de consumidores, cortado a pedido do fundador. A
regra é não preencher teste em aberto com estimativa, então o veredito não
pode ser "Lucrativo". **Os três testes numéricos passam com folga.**

## Números-chave

| | |
| --- | --- |
| Unidade | restaurante-mês |
| Preço atual | R$ 100 (Essencial) · R$ 180 (100% Delivery) |
| Preço recomendado | R$ 149 · R$ 249 (clientes novos) |
| Custo variável | R$ 0,00 |
| Contribuição | R$ 180,00 (R$ 249 no preço novo) |
| Custo fixo mensal | R$ 3,50 |
| Ponto de equilíbrio | 0,02 cliente |
| Margem no volume planejado | 99,8% |
| Capacidade (limite de suporte) | 14 clientes |
| Receita ano 1 | R$ 12.960 |
| Lucro ano 1 | R$ 12.918 |
| Caixa necessário | R$ 0 |
| Payback | mês 1 |

## 1. A ideia

→ [idea.md](idea.md)

Sistema de cardápio e pedidos para restaurantes, no ar desde setembro de 2026
em menufacildelivery.com.br. Dois clientes pagando. Cardápio pelo link, painel
de pedidos ao vivo, salão com comanda e caixa, totem com pagamento na
maquininha e impressão no computador do restaurante. Mensalidade fixa, sem
comissão. Feito e mantido por uma pessoa.

## 2. O resumo executivo

→ [summary.md](summary.md)

## 3. O conselho

**Não executado** — cortado a pedido do fundador. Roda com `/founder-board`.

*Observação: o conselho serve para testar uma ideia antes de existir. Esta já
existe, está no ar e tem receita. A ausência dele aqui é razoável.*

## 4. A concorrência

→ [competitors.md](competitors.md) · [competitors.csv](competitors.csv)

Faixa de preço do mercado: R$ 99 a R$ 400, **mediana ~R$ 209**. Yooga cobra
R$ 249/mês **mais R$ 0,99 por pedido**; Anota AI sobe de faixa conforme o
volume; Goomer cobra por pedido excedente no plano grátis.

**A brecha, em três pontos com evidência:**
1. Suporte com nome e rosto — a reclamação nº 1 contra os concorrentes.
2. Preço fixo sem pedágio por pedido — quem cresce não paga mais.
3. Independência do iFood — Anota AI e Saipos são do grupo.

**O que não é brecha:** funcionalidade. Todos têm totem, salão e KDS.

## 5. O painel de compradores

**Não executado** — cortado a pedido do fundador. Roda com `/founder-consumer`.

É a lacuna que deixa o veredito incompleto. O substituto real: as 6 visitas de
teste em novembro ([launch.md](launch.md)).

## 6. Preço

→ [pricing.md](pricing.md)

**R$ 149 e R$ 249 para clientes novos**, mantendo os dois atuais no preço
atual. A R$ 249, o sistema custa ao Papaléguas R$ 1,04 por pedido — menos que
o pedágio de R$ 0,99/pedido que a Yooga cobra **além** da mensalidade de
R$ 249.

Oferta de entrada: **Plano Fundador**, preço travado 12 meses para os 10
primeiros, até 31/03/2027.

## 7. A oferta

→ [offer.md](offer.md) · [pitch.md](pitch.md)

Núcleo: *"Seu restaurante recebendo pedido sozinho em uma semana — sem
comissão, sem pagar por pedido, e sem ser do iFood."*

Três bônus: cardápio cadastrado por você, impressora configurada por você,
preço travado 12 meses. Garantia de 30 dias com devolução do mês e entrega do
cardápio em PDF — custa R$ 24,90 por cliente novo a 10% de acionamento.

Na equação de valor, o salto está em **chance de conseguir** (4→8) e **esforço**
(3→8). Não exige construir nada novo: exige dizer.

## 8. Os números

→ [cfo.md](cfo.md) · [numbers.json](numbers.json) · [cfo-sources.md](cfo-sources.md)

Margem de 99,8%, equilíbrio em 0,02 cliente, caixa zero. **Nenhum cenário
clássico derruba** (preço −10%, volume −20%, custos +15%) porque não há custo
para comprimir — e é por isso que a planilha engana. O gargalo é hora: 15 h/semana
de suporte em 10 clientes, 21 h em 14.

**10 clientes a R$ 180 = R$ 1.800/mês. É renda extra, não salário.** Para
R$ 5.000/mês seriam 28 clientes a R$ 180 ou 20 a R$ 249.

## 9. Marketing

→ [marketing.md](marketing.md)

Posicionamento escolhido: *para o dono de restaurante do interior, que resolve
tudo no WhatsApp e no caderno, o MenuFácil é o sistema que alguém monta para
ele e atende pelo nome.*

Canais: visita presencial, indicação do Papaléguas, Instagram local.
**Zero em anúncio pago** — sem orçamento, sem página que converte, sem o que
medir.

Metas semanais: 15 conversas, 7 demonstrações, 1 contrato.

## 10. Marca

→ [brand.md](brand.md)

Nome e identidade visual já existem e estão coerentes — não mexer. **O que
falta é verificação:** busca de marca no INPI, que não foi feita e é urgente
porque "MenuFácil" é um nome descritivo.

Promessa: **Seu cliente, seu pedido, seu dinheiro.**
Voz: dono para dono. Dizer "eu", nunca "nossa equipe".

## 11. Operação

→ [ops.md](ops.md)

Uma pessoa. Dois riscos críticos, nenhum deles competitivo:

1. **Infra em plano gratuito com cliente pagando dentro.** Termos de uso
   precisam ser verificados antes do quinto cliente — suspensão para dez
   restaurantes no mesmo minuto.
2. **Ninguém cobre você.** Uma semana doente é uma semana de dez restaurantes
   sem suporte.

Pendências legais: **CNPJ** (trava nota fiscal, décimo cliente e o app na
Stone), contrato de prestação, **LGPD** — o sistema guarda nome, telefone e
endereço dos clientes finais, e você é operador desses dados.

## 12. Execução

→ [launch.md](launch.md)

- **Novembro:** vender. 24 visitas, teste de preço R$ 249 × R$ 199.
- **Dezembro:** legalizar. CNPJ, INPI, termos de infra, contrato e LGPD —
  dezembro vende mal, aproveite o vale.
- **Jan–Mar:** crescer medindo a hora de suporte por cliente.

Caminho crítico: **autorização do Papaléguas (semana 1)** e **CNPJ
(dezembro)**.

Linha de corte: 30 conversas em novembro sem contrato → pare e volte para a
oferta.

---

## O que ainda não está feito

| falta | quem faz |
| --- | --- |
| Painel de compradores (teste 4 do veredito) | `/founder-consumer` — cortado a pedido |
| Conselho | `/founder-board` — cortado a pedido |
| Busca de marca no INPI | você |
| Termos de uso de Vercel e Neon | você |
| Custo real da infra em plano pago | você |
| Depoimento do Papaléguas | você |
| CNPJ | você + contador |

---

> **Leia isto antes de usar qualquer número daqui numa conversa.** Os números
> são projeção. O único dado histórico real é outubro do Papaléguas
> (R$ 10.510,50 em 240 pedidos), vindo do print do próprio painel. O painel de
> compradores não rodou. Preços de Anota AI, Neemo e Saipos vieram de sites
> concorrentes, não das fontes oficiais — confirme antes de citar. Isto não é
> consultoria contábil, fiscal ou jurídica.
