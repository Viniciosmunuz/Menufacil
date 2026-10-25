import type { Viewport } from "next";

// As telas do garçom se comportam como aplicativo, não como site.
//
// Quem usa está de pé, tocando rápido com uma mão: dois toques seguidos
// numa mesa davam zoom na tela, e o garçom tinha de afastar com os dedos
// antes de continuar. Aqui o zoom fica travado -- de pinça e de dois toques
// --, e todo campo tem letra de 16px, porque abaixo disso o iPhone aproxima
// a tela sozinho quando o campo ganha o foco.
//
// Vale só para o garçom: o cardápio do cliente continua deixando ampliar,
// que é o que quem lê de longe ou tem a vista cansada precisa.

export const viewport: Viewport = {
  themeColor: "#f6f1ea",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function GarcomLayout({ children }: LayoutProps<"/garcom/[restaurantId]">) {
  return <div className="touch-manipulation [&_input]:text-base [&_select]:text-base [&_textarea]:text-base">{children}</div>;
}
