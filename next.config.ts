import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // fotos do cardápio: o navegador já reduz antes de enviar, isto é folga
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
