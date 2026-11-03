// Manifesto do atalho do entregador.
//
// Salvo na tela inicial do celular, abre direto nas entregas dele, sem
// barra de endereço -- é o mais perto de aplicativo que o navegador
// entrega, e é o que ele vai usar até existir um APK de verdade.
//
// O ícone é o contrário do painel de propósito: lá a marca é laranja no
// claro, aqui é branca sobre o laranja. Com os dois atalhos lado a lado na
// mesma tela, não há como pegar um pelo outro -- e continua sendo a mesma
// marca, não um desenho à parte.
//
// O `scope` em /entregador é o que prende o atalho na tela dele: um toque
// num link de fora abre no navegador, e não dentro do aplicativo.
export function GET() {
  const manifest = {
    name: "MenuFácil Entregas",
    short_name: "Entregas",
    description: "As entregas do seu restaurante, no seu celular.",
    lang: "pt-BR",
    start_url: "/entregador",
    scope: "/entregador",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f9680b",
    icons: [
      { src: "/app/entregador-icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app/entregador-icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/app/entregador-icone-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, { headers: { "content-type": "application/manifest+json; charset=utf-8" } });
}
