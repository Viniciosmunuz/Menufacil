import type { MetadataRoute } from "next";

// Quando alguém salva o site na tela inicial do celular, é isto que dá o
// nome e o ícone do atalho — e faz ele abrir sem a barra do navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MenuFácil",
    short_name: "MenuFácil",
    description: "Cardápio digital e pedidos para restaurantes, lanchonetes e pizzarias.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e14",
    theme_color: "#0a0e14",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      // recortado pelo sistema em círculo ou quadrado, sem cortar o desenho
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
