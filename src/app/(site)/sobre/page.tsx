import type { Metadata } from "next";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";
import { HowItWorks, WhyMenuFacil } from "@/components/site/home-sections";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sobre nós" };

export default function AboutPage() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <LogoIcon className="h-12 self-start" />
          <h1 className="text-3xl font-extrabold">Seu cardápio, mais perto do cliente.</h1>
          <p className="text-lg text-muted">
            O MenuFácil nasceu para os restaurantes, lanchonetes e pizzarias da nossa região venderem mais, sem complicação:
            cardápio digital sempre atualizado, pedido organizado chegando no WhatsApp e pagamento por Pix, cartão ou dinheiro.
          </p>
          <p className="text-muted">
            Para quem pede, é simples: escolhe, monta o carrinho e faz o pedido sem precisar criar conta. Para o restaurante, um
            painel feito para usar no celular, no meio do expediente.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/restaurantes" className={buttonClasses("primary")}>
              Ver restaurantes
            </Link>
            <Link href="/cadastre-seu-restaurante" className={buttonClasses("secondary")}>
              Cadastrar meu restaurante
            </Link>
          </div>
        </Card>
        <HowItWorks />
      </div>
      <WhyMenuFacil />
    </div>
  );
}
