import type { NextConfig } from "next";

import { APP_SETUP_PATH } from "./src/lib/app-release";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    // Cada tamanho novo de cada foto custa uma transformação do plano, e o
    // plano tem conta. Guardando por 31 dias, o cardápio inteiro de um
    // restaurante custa isso uma vez por mês em vez de a cada visita.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    // Poucas larguras, de propósito: cada uma é mais uma transformação
    // possível por foto e mais texto no HTML de uma página com 130 fotos.
    imageSizes: [96, 192, 384],
    deviceSizes: [640, 828, 1080, 1920],
  },
  // o endereço antigo do instalador, que já foi para fora em link e mensagem
  async redirects() {
    return [{ source: "/menufacil-setup.exe", destination: APP_SETUP_PATH, permanent: false }];
  },
  /**
   * Três cabeçalhos de segurança, e só os que não têm como quebrar nada.
   *
   * - `X-Frame-Options`: ninguém de fora embute o painel dentro de outra
   *   página para enganar o dono a clicar onde não queria. Conferido
   *   antes: o Print Fácil e o app do garçom abrem o site direto, não em
   *   iframe, então não são afetados.
   * - `nosniff`: o navegador não adivinha o tipo de um arquivo enviado.
   * - `Referrer-Policy`: o link de um pedido (que é o segredo do pedido)
   *   não vaza inteiro para o site de fora em que o cliente clicar.
   *
   * Uma política de conteúdo completa (CSP) ficou de fora de propósito:
   * mapa, Mercado Pago e fotos vêm de fora, e uma lista errada derruba a
   * tela em produção. É trabalho para fazer medindo, não de uma vez.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      // fotos do cardápio: o navegador já reduz antes de enviar, isto é folga
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
