import type { Metadata, Viewport } from "next";
import { Caveat, Nunito } from "next/font/google";

import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// só a frase manuscrita da home usa; o navegador baixa quando precisa
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "MenuFácil · Seu cardápio, mais perto do cliente",
    template: "%s · MenuFácil",
  },
  description:
    "Cardápio digital e pedidos para restaurantes, lanchonetes e pizzarias. Peça direto do restaurante, sem complicação.",
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} ${caveat.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
