import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { noAr } from "@/lib/features";
import { formatPhone } from "@/lib/format";
import { requireDono } from "@/server/auth/dal";

import { Esquecer, NoCardapio, Pedidos } from "./chaves";
import { ListasDaIa } from "./ignorados";
import { LigarIa } from "./ligar";

export const metadata: Metadata = { title: "Menu Fácil IA" };

// A IA do restaurante, do lado do dono -- que é onde ela se usa.
//
// A seção existe quando o admin liga a chave em Recursos. Dali para a
// frente as decisões são dele: ligar o atendimento no WhatsApp, deixar ela
// anotar pedido, responder no chat do cardápio, quem ela nunca responde e
// apagar o que ela lembra.
//
// O que fica com o admin é só o que o dono não tem como fazer: conectar o
// número, que passa por uma conta da plataforma.

export default async function IaPage({ params }: PageProps<"/painel/[restaurantId]/ia">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireDono(restaurantId);
  if (!noAr("iaEnabled") || !restaurant.iaEnabled) notFound();

  const atendente = await db.atendenteIa.findUnique({
    where: { restaurantId: restaurant.id },
    select: {
      ativo: true,
      fazPedidos: true,
      noChat: true,
      phoneNumberId: true,
      zapiChannelId: true,
      numeroExibido: true,
      ignorados: true,
      semEspera: true,
    },
  });

  // Conectado por qualquer um dos dois caminhos. Sem WhatsApp, o chat do
  // cardápio ainda funciona -- ele não depende de conexão nenhuma --, e é
  // por isso que a página não some.
  const comWhatsapp = Boolean(atendente?.phoneNumberId || atendente?.zapiChannelId);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Menu Fácil IA"
        description="O atendente que responde os seus clientes. Você decide o que ele faz."
      />

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`size-3.5 shrink-0 rounded-full ${atendente?.ativo ? "bg-success" : "bg-danger"}`}
            aria-hidden="true"
          />
          <p className="text-lg font-extrabold">
            No WhatsApp: {atendente?.ativo ? "ligada" : "desligada"}
          </p>
          {atendente?.numeroExibido && (
            <span className="text-sm text-muted">no {formatPhone(atendente.numeroExibido)}</span>
          )}
        </div>

        {comWhatsapp ? (
          <>
            <p className="text-sm text-muted">
              {atendente?.ativo
                ? "Ela responde quem mandar mensagem enquanto o restaurante estiver aberto. Fora do horário, ou fechado no botão, ela não responde nada. Se você ou alguém da equipe responder pelo celular, ela fica quieta naquela conversa por 30 minutos."
                : "Desligada, as mensagens chegam no seu WhatsApp normalmente e ninguém responde por você."}
            </p>
            <LigarIa restaurantId={restaurant.id} ligada={Boolean(atendente?.ativo)} />
          </>
        ) : (
          <Alert tone="info">
            O WhatsApp do restaurante ainda não foi conectado — isso é feito pelo suporte do MenuFácil. Enquanto isso,
            o atendente no cardápio aqui embaixo já funciona.
          </Alert>
        )}
      </Card>

      {comWhatsapp && (
        <Card className="flex flex-col gap-3">
          <Pedidos restaurantId={restaurant.id} ligado={Boolean(atendente?.fazPedidos)} />
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <NoCardapio restaurantId={restaurant.id} ligado={Boolean(atendente?.noChat)} />
      </Card>

      {atendente && (
        <Card>
          <ListasDaIa
            restaurantId={restaurant.id}
            ignorados={atendente.ignorados}
            semEspera={atendente.semEspera}
          />
        </Card>
      )}

      {atendente && (
        <Card className="flex flex-col gap-3">
          <Esquecer restaurantId={restaurant.id} />
        </Card>
      )}
    </div>
  );
}
