import type { NextConfig } from "next";

import { APP_SETUP_PATH } from "./src/lib/app-release";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
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
