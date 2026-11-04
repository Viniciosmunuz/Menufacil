// Manifesto do atalho do entregador.
//
// Salvo na tela inicial do celular, abre direto nas entregas dele, sem
// barra de endereço -- é o mais perto de aplicativo que o navegador
// entrega, e é o que ele vai usar até existir um APK de verdade.
//
// O ícone é a arte do entregador na moto, com a caixa levando a cúpula da
// marca -- trocada em 03/11/2026 pela que ele escolheu. É diferente do
// painel e do cardápio de propósito: na tela do celular os três atalhos
// ficam lado a lado, e com desenhos distintos não há como pegar um pelo
// outro. A cúpula dentro da caixa é o que mantém os três na mesma família.
//
// São três arquivos porque são três usos: o 192 e o 512 saem com os cantos
// transparentes (o sistema aplica a máscara dele), e o `maskable` traz a
// arte encolhida para a zona segura de 80%, porque o Android recorta em
// círculo e comeria as faixas das pontas.
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
    // a tela de abertura do Android sai daqui: fundo escuro e o ícone no
    // meio, que é o mais perto de splash que um aplicativo web tem
    background_color: "#ffffff",
    theme_color: "#0c0e12",
    icons: [
      { src: "/app/entregador-icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/app/entregador-icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/app/entregador-icone-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return Response.json(manifest, { headers: { "content-type": "application/manifest+json; charset=utf-8" } });
}
