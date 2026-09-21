import { Mail, MessageCircle, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { formatPhone } from "@/lib/format";

import { LeadForm } from "../cadastre-seu-restaurante/lead-form";

export const metadata: Metadata = { title: "Contato" };

export default function ContactPage() {
  // contato da equipe (opcional): vem das variáveis de ambiente
  const email = process.env.CONTACT_EMAIL;
  const whatsapp = process.env.CONTACT_WHATSAPP;
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader title="Contato" description="Tem um restaurante e quer entrar na plataforma? Deixe seu contato." />
        <LeadForm />
      </div>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-2">
          <ReceiptText className="size-6 text-brand" aria-hidden="true" />
          <p className="font-extrabold">Dúvida sobre um pedido?</p>
          <p className="text-sm text-muted">
            Fale direto com o restaurante: o botão do WhatsApp fica na página do seu pedido.
          </p>
          <Link href="/restaurantes" className="text-sm font-bold text-brand hover:underline">
            Ver restaurantes
          </Link>
        </Card>
        {(email || whatsapp) && (
          <Card className="flex flex-col gap-3 text-sm">
            <p className="font-extrabold">Equipe MenuFácil</p>
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-bold hover:text-brand">
                <MessageCircle className="size-4 text-faint" aria-hidden="true" />
                {formatPhone(whatsapp)}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-2 font-bold hover:text-brand">
                <Mail className="size-4 text-faint" aria-hidden="true" />
                {email}
              </a>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
