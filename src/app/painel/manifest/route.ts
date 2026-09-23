// Manifesto do atalho do painel: salvo na tela inicial, o ícone abre direto
// os pedidos do restaurante, e não a página inicial do site.
export function GET() {
  const manifest = {
    name: "MenuFácil Painel",
    short_name: "Painel",
    description: "Pedidos, cardápio e ajustes do seu restaurante.",
    lang: "pt-BR",
    start_url: "/painel",
    scope: "/painel",
    display: "standalone",
    background_color: "#0a0e14",
    theme_color: "#0a0e14",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, { headers: { "content-type": "application/manifest+json; charset=utf-8" } });
}
