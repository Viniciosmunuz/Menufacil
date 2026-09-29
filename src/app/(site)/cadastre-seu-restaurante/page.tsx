import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";

import { buttonClasses } from "@/components/ui/button";

import { WHATSAPP, WHATSAPP_MSG } from "./conteudo";
import { LeadForm } from "./lead-form";
import { ANCORA, Beneficios, ComoComecar, Duvidas, Plano, Topo, VejaFuncionando } from "./sections";

export const metadata: Metadata = {
  title: "Cardápio digital para restaurantes",
  description:
    "Receba pedidos direto do cliente, sem comissão. Cardápio com link próprio, aviso de pedido e impressão automática. Plano Essencial por R$ 120/mês.",
};

export default function LeadPage() {
  const whatsapp = WHATSAPP && `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MSG)}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 sm:gap-16">
      <Topo />
      <VejaFuncionando />
      <Beneficios />
      <ComoComecar />
      <Plano />
      <Duvidas />

      <section id={ANCORA} className="scroll-mt-24">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl leading-tight font-extrabold sm:text-3xl">Comece agora</h2>
          <p className="mt-1 text-sm text-muted sm:text-base">Te chamamos no WhatsApp em até 24h.</p>
        </div>
        <LeadForm
          submitLabel="Quero meu cardápio digital"
          successTitle="Recebemos!"
          successText="Vamos te chamar no WhatsApp em breve."
          footer={
            whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "lg", "w-full")}>
                <MessageCircle className="size-5" aria-hidden="true" />
                Prefiro falar no WhatsApp
              </a>
            ) : null
          }
        />
      </section>
    </div>
  );
}
