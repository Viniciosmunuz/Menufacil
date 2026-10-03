import type { NextConfig } from "next";

import { APP_SETUP_PATH } from "./src/lib/app-release";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    // Cada tamanho novo de cada foto custa uma transformação do plano, e o
    // plano tem conta. Guardando por 31 dias, o cardápio inteiro de um
    // restaurante custa isso uma vez por mês em vez de a cada visita.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    // só os tamanhos que o cardápio realmente pede: cada largura a mais na
    // lista é mais uma transformação possível por foto
    imageSizes: [96, 128, 192, 256, 384],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1920],
  },
  // o endereço antigo do instalador, que já foi para fora em link e mensagem
  async redirects() {
    return [{ source: "/menufacil-setup.exe", destination: APP_SETUP_PATH, permanent: false }];
  },
  experimental: {
    serverActions: {
      // fotos do cardápio: o navegador já reduz antes de enviar, isto é folga
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
