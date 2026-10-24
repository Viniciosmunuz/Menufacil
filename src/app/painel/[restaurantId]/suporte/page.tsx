import { CircleCheck, Clock } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { requireDono } from "@/server/auth/dal";

import { SuporteForm } from "./form";

export const metadata: Metadata = { title: "Suporte" };

// Pedir ajuda.
//
// O suporte do MenuFácil é o WhatsApp, e vai continuar sendo: é por onde o
// dono já fala, no meio do movimento, com uma mão só. O que esta tela faz
// é deixar o pedido registrado antes de abrir a conversa -- para ninguém
// ficar esperando resposta de uma mensagem que se perdeu entre outras
// três.
//
// O histórico fica abaixo porque a pergunta seguinte é sempre a mesma:
// "eu já avisei disso?".

export default async function SuportePage({ params }: PageProps<"/painel/[restaurantId]/suporte">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireDono(restaurantId);

  const chamados = await db.supportTicket.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, assunto: true, mensagem: true, status: true, createdAt: true, resolvedAt: true },
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Suporte" description="Conte o que está acontecendo. A conversa abre no WhatsApp do MenuFácil com tudo escrito." />

      <Card>
        <SuporteForm restaurantId={restaurant.id} />
      </Card>

      {chamados.length > 0 && (
        <Card className="flex flex-col gap-3">
          <p className="font-extrabold">O que você já contou</p>
          <ul className="flex flex-col divide-y divide-line">
            {chamados.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-3 first:pt-0">
                <Badge tone={c.status === "RESOLVIDO" ? "success" : "warning"}>
                  {c.status === "RESOLVIDO" ? (
                    <>
                      <CircleCheck className="size-3.5" aria-hidden="true" /> Resolvido
                    </>
                  ) : (
                    <>
                      <Clock className="size-3.5" aria-hidden="true" /> Esperando
                    </>
                  )}
                </Badge>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{c.assunto}</span>
                  <span className="block text-sm text-muted">{c.mensagem}</span>
                </span>
                <span className="shrink-0 text-sm text-faint">{formatWhen(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
