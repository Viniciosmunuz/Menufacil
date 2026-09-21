import type { Metadata } from "next";

import { HowItWorks, WhyMenuFacil } from "@/components/site/home-sections";

import { LeadForm } from "./lead-form";

export const metadata: Metadata = {
  title: "Cadastre seu restaurante",
  description: "Coloque seu cardápio no MenuFácil e receba pedidos organizados no WhatsApp.",
};

export default function LeadPage() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <h1 className="text-3xl leading-tight font-extrabold sm:text-4xl">
            Seu restaurante <span className="text-brand">no MenuFácil</span>
          </h1>
          <p className="mt-2 max-w-xl text-lg text-muted">
            Deixe seu contato. A gente monta o cardápio com você e seu restaurante começa a receber pedidos.
          </p>
        </div>
        <LeadForm />
        <HowItWorks />
      </div>
      <WhyMenuFacil />
    </div>
  );
}
