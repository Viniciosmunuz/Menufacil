import path from "node:path";

import { defineConfig } from "vitest/config";

// Os testes cobrem só as contas puras -- taxa por bairro, mensalidade,
// janela do mês. Nada aqui sobe banco nem servidor: é o que roda em um
// segundo e pega o erro que em produção vira dinheiro cobrado errado.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
