# De onde veio cada número

| número | valor | origem |
| --- | --- | --- |
| Preço 100% Delivery | R$ 180/mês | O próprio produto, confirmado por ele |
| Preço Essencial | R$ 100/mês | idem |
| Custo de infra por restaurante | R$ 0 | **Resposta dele em 26/10/2026**: "não custa nada até o momento". Verdadeiro hoje (Vercel, Neon e Mercado Pago em faixa gratuita com 2 clientes); deixa de ser em algum volume — ver a seção "A linha para vigiar" |
| Suporte | 3 h/semana no total, "e olhe lá, quase nunca" | Resposta dele em 26/10/2026. São 2 clientes, logo ~1,5 h por cliente por semana |
| Faturamento do Papaléguas | R$ 10.510,50 em outubro/2026, 240 pedidos, ticket médio R$ 43,79 | Print da tela "Fechamento e resumo mensal" do próprio painel, enviado por ele em 26/10/2026 |
| Meta | 10 restaurantes em 12 meses | Resposta dele em 26/10/2026 |
| Domínio .com.br | ~R$ 40/ano | Preço do Registro.br |
| Mediana de preço do mercado | ~R$ 209/mês | `founder/competitors.md` |

## Marcado como estimativa, não como fato

- **Rampa de 2 → 10 clientes** (≈0,7 cliente novo por mês): é a meta dele
  distribuída linearmente. Não há histórico de vendas para calibrar — ele nunca
  prospectou, os 2 clientes vieram por contato direto.
- **Churn: zero.** Não modelei saída de cliente porque não existe base para
  estimar (2 clientes, nenhum saiu). **Isso torna o ano 1 otimista por
  construção.**
- **Teto de 14 clientes**: calculado de 1,5 h/cliente/semana contra um máximo
  de 21 h/semana de suporte. As 21 h são um arbítrio meu, não um número dele.
- **Quando a infra deixa de ser grátis**: sei que deixa; não confirmei em qual
  volume nem a qual preço. Precisa ser verificado nos planos pagos da Vercel e
  do Neon antes de virar número de plano.

## Não levantado

- Imposto. O MenuFácil ainda não tem CNPJ próprio; a receita hoje não passa por
  empresa. Nada aqui considera tributo.
- Custo do Mercado Pago por transação no totem (é repassado ao restaurante, mas
  não foi conferido).
