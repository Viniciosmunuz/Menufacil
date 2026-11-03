import type { Metadata, Viewport } from "next";

// As telas do entregador se comportam como aplicativo, não como site.
//
// Quem usa está na rua, tocando rápido com uma mão: dois toques seguidos
// davam zoom na tela, e o garçom tinha de afastar com os dedos antes de
// continuar. Aqui o zoom fica travado, e todo campo tem letra de 16px,
// porque abaixo disso o iPhone aproxima a tela sozinho quando o campo ganha
// o foco.
//
// O `user-scalable=no` do viewport não basta: o Safari do iPhone o ignora
// desde o iOS 10. Quem de fato desliga o toque duplo é o `touch-action`, e
// ele precisa estar no `html` e no `body` -- posto só no container, o
// toque que cai no fundo da página, fora dele, ainda dava zoom.
//
// Vale só para esta tela: o cardápio do cliente continua deixando ampliar,
// que é o que quem lê de longe ou tem a vista cansada precisa.

// o atalho da tela inicial: ícone e nome próprios, abrindo nas entregas
// O atalho da tela inicial: ícone e nome próprios, abrindo nas entregas.
//
// O manifesto resolve o Android. **O iPhone não lê o manifesto** nessa
// hora: ele usa o apple-touch-icon, que aqui vem de
// src/app/entregador/apple-icon.png -- e era por faltar esse arquivo que o
// atalho saía com o ícone genérico do site, igual ao do cardápio e ao do
// painel. O nome curto também é outro: appleWebApp.title.
export const metadata: Metadata = {
  manifest: "/entregador/manifest",
  title: { default: "MenuFácil Entregas", template: "%s · Entregas" },
  appleWebApp: { capable: true, title: "Entregas", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0c0e12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// o fundo escuro precisa chegar até a moldura do navegador, senão sobra
// uma faixa branca embaixo quando a tela rola além do conteúdo
const TEMA = "html,body{touch-action:manipulation;-webkit-text-size-adjust:100%;background:#0c0e12}";

export default function EntregadorLayout({ children }: LayoutProps<"/entregador/[restaurantId]">) {
  return (
    <div className="tema-entregador min-h-dvh touch-manipulation [&_input]:text-base [&_select]:text-base [&_textarea]:text-base">
      <style dangerouslySetInnerHTML={{ __html: TEMA }} />
      {children}
    </div>
  );
}
