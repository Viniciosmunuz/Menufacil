import path from "node:path";

import { defineConfig } from "vitest/config";

// Os testes cobrem só as contas puras -- taxa por bairro, mensalidade,
// janela do mês. Nada aqui sobe banco nem servidor: é o que roda em um
// segundo e pega o erro que em produção vira dinheiro cobrado errado.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // O `import "server-only"` existe para o build do Next barrar um
      // módulo de servidor que vazasse para o navegador. Fora do Next ele
      // só sabe lançar erro, e lançava antes de o teste começar. Aqui ele
      // vira nada, para dar para testar as partes puras de um módulo de
      // servidor -- a leitura de um link de mapa, por exemplo, que não
      // toca em banco nem em rede.
      "server-only": path.resolve(__dirname, "src/lib/__tests__/server-only-vazio.ts"),
    },
  },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
