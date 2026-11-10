import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Aplicativo do totem: projeto Electron próprio, com o Node dele.
    // Não faz parte do site e não entra no build da Vercel.
    "totem-app/**",
    // Aplicativo de impressão do totem: projeto Android, compilado pelo
    // GitHub. Não faz parte do site.
    "menufacil-print/**",
    // Projeto dos vídeos: Remotion, com React e tsconfig próprios.
    // Não faz parte do site e não entra no build da Vercel.
    "video-menufacil/**",
    // Skills de agente instaladas por npx (Remotion). São material de
    // ferramenta, não código do site -- o .gitignore já as deixa fora.
    ".agents/**",
    // Material de implantação: os filmes em HTML e o renderizador deles
    // rodam fora do Next, com Node puro.
    "implantacao/**",
  ]),
]);

export default eslintConfig;
