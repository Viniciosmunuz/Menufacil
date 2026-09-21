@AGENTS.md

# MenuFácil: notas do projeto

- Interface, textos e comentários em português do Brasil; nomes de código em inglês.
- Autorização sempre por `src/server/auth/dal.ts` (`requireAdmin`, `requireRestaurantAccess`).
  Nunca confiar só no proxy. Toda server action confere a permissão de novo.
- Multi-tenant por `restaurantId`: nenhuma consulta de painel sem esse filtro.
- Admin gerencia qualquer restaurante com a própria conta (`viaAdmin`); registrar
  alterações com `audit()` de `src/server/audit.ts`.
- Dinheiro em centavos (`Int`). Formatar com `formatCents` de `src/lib/format.ts`.
- Prisma 7: client gerado em `src/generated/prisma` (importar de `@/generated/prisma/client`),
  conexão via `@prisma/adapter-pg`, config em `prisma7.config.ts`.
- WhatsApp só pela API oficial (Cloud API), atrás de uma interface de serviço com
  implementação mock. Nada de automação do WhatsApp Web.
- Identidade visual: tokens em `src/app/globals.css` (fundo escuro, laranja `brand`).
