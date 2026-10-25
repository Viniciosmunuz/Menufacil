import type { Viewport } from "next";

// As telas do garçom se comportam como aplicativo, não como site.
//
// Quem usa está de pé, tocando rápido com uma mão: dois toques seguidos
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
// Vale só para o garçom: o cardápio do cliente continua deixando ampliar,
// que é o que quem lê de longe ou tem a vista cansada precisa.

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const SEM_ZOOM = "html,body{touch-action:manipulation;-webkit-text-size-adjust:100%}";

export default function GarcomLayout({ children }: LayoutProps<"/garcom/[restaurantId]">) {
  return (
    <div className="touch-manipulation [&_input]:text-base [&_select]:text-base [&_textarea]:text-base">
      <style dangerouslySetInnerHTML={{ __html: SEM_ZOOM }} />
      {children}
    </div>
  );
}
