import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatPhone } from "@/lib/format";
import { requireDono } from "@/server/auth/dal";

import { LigarIa } from "./ligar";

export const metadata: Metadata = { title: "Menu Fácil IA" };

// A IA do restaurante, do lado do dono: está ligada ou não, e o botão.
//
// A aba só existe depois que o admin conectou o WhatsApp do restaurante.
// Conectar, e decidir se a IA também anota pedidos, continua com o admin:
// aqui o dono só liga e desliga -- dia de movimento estranho, cardápio
// mudando, ou simplesmente quer atender ele mesmo.

export default async function IaPage({ params }: PageProps<"/painel/[restaurantId]/ia">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireDono(restaurantId);

  const atendente = await db.atendenteIa.findUnique({
    where: { restaurantId: restaurant.id },
    select: { ativo: true, fazPedidos: true, phoneNumberId: true, numeroExibido: true },
  });
  if (!atendente?.phoneNumberId) notFound();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Menu Fácil IA" description="O atendente que responde os clientes no WhatsApp do restaurante." />

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`size-3.5 shrink-0 rounded-full ${atendente.ativo ? "bg-success" : "bg-danger"}`}
            aria-hidden="true"
          />
          <p className="text-lg font-extrabold">{atendente.ativo ? "Ligada" : "Desligada"}</p>
          {atendente.numeroExibido && <span className="text-sm text-muted">no WhatsApp {formatPhone(atendente.numeroExibido)}</span>}
        </div>

        <p className="text-sm text-muted">
          {atendente.ativo
            ? "Ela responde quem mandar mensagem enquanto o restaurante estiver aberto. Fora do horário, ou fechado no botão, ela não responde nada. Se você ou alguém da equipe responder pelo celular, ela fica quieta naquela conversa por 30 minutos."
            : "Desligada, as mensagens chegam no seu WhatsApp normalmente e ninguém responde por você."}
        </p>

        <LigarIa restaurantId={restaurant.id} ligada={atendente.ativo} />
      </Card>

      <Card className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 font-extrabold">
          O que ela faz
          {atendente.fazPedidos ? <Badge tone="success">Anota pedidos</Badge> : <Badge>Só tira dúvidas</Badge>}
        </p>
        <p className="text-sm text-muted">
          {atendente.fazPedidos
            ? "Tira dúvidas e manda o link do cardápio. Se o cliente não conseguir pedir pelo link, ela anota o pedido, lê o resumo com o total e só cria depois do \"sim\" — o pedido chega em Pedidos com o selo \"Feito pela IA\". Também manda o Pix de pedido em aberto e pede o comprovante, mas quem confirma o pagamento é você (ou o Mercado Pago)."
            : "Tira dúvidas sobre o cardápio, horário, entrega e pagamento, e manda o link do cardápio para o cliente pedir."}
        </p>
        <p className="text-sm text-muted">Para mudar isso, fale com o suporte do MenuFácil.</p>
      </Card>
    </div>
  );
}
