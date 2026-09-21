# MenuFácil

**Seu cardápio, mais perto do cliente.**

Plataforma de cardápio digital e pedidos para restaurantes, lanchonetes e
pizzarias. Três níveis de acesso:

- **Administrador da plataforma**: cadastra, implanta, libera e gerencia
  qualquer restaurante (inclusive o cardápio), com a própria conta.
- **Dono do restaurante**: gerencia só o próprio estabelecimento.
- **Cliente**: faz pedidos sem precisar de conta.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL (Neon) ·
Prisma 7 · login próprio com sessões no banco.

## Rodando no computador

```bash
npm install
cp .env.example .env    # preencha DATABASE_URL e ADMIN_EMAIL
npm run db:migrate      # cria as tabelas
npm run db:seed         # admin, categorias e (opcional) restaurantes de demonstração
npm run dev             # http://localhost:3000
```

O seed mostra no terminal as senhas provisórias. Elas precisam ser trocadas
no primeiro acesso.

Sem banco na nuvem, dá para usar um PostgreSQL local do próprio Prisma:

```bash
npx prisma dev --name menufacil --detach
```

Ele mostra o endereço TCP (`postgres://postgres:postgres@localhost:.../template1`).
Use esse endereço no `DATABASE_URL` e o do banco sombra (a porta seguinte) no
`SHADOW_DATABASE_URL`.

## Estrutura

- `prisma/schema.prisma`: o banco (usuários, restaurantes, cardápio,
  pedidos, pagamentos, WhatsApp e auditoria).
- `src/server/auth/`: sessões, senhas e a camada de acesso (`dal.ts`), que
  confere quem pode ver e mexer em cada restaurante.
- `src/app/admin/`: painel do administrador da plataforma.
- `src/app/painel/[restaurantId]/`: painel do restaurante, usado pelo dono e
  pelo admin no modo "gerenciar restaurante".
- `src/proxy.ts`: redirecionamento otimista para o login.

## Regras que o código segue

- Tudo que é de um restaurante carrega `restaurantId`, e toda consulta do
  painel filtra por ele depois de `requireRestaurantAccess`.
- Toda server action confere a permissão de novo: ela é um endpoint público.
- Dinheiro em centavos (`Int`), nunca em ponto flutuante.
- Segredos só em variáveis de ambiente, nunca no código do navegador.
