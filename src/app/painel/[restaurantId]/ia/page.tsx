import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { noAr } from "@/lib/features";
import { formatPhone } from "@/lib/format";
import { requireDono } from "@/server/auth/dal";
import { conversasDaIa } from "@/server/ia/conversas";

import { Esquecer, NoCardapio, Pedidos } from "./chaves";
import { ConversasDaIa } from "./conversas";
import { ListasDaIa } from "./ignorados";
import { ConectarWhatsapp } from "./conectar";
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

export default async function IaPage({
  params,
}: PageProps<"/painel/[restaurantId]/ia">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireDono(restaurantId);
  if (!noAr("iaEnabled") || !restaurant.iaEnabled) notFound();

  // as duas em paralelo: a gaveta das conversas não precisa esperar o
  // registro do atendente para ser consultada
  const [atendente, conversas] = await Promise.all([
    db.atendenteIa.findUnique({
      where: { restaurantId: restaurant.id },
      select: {
        ativo: true,
        fazPedidos: true,
        noChat: true,
        phoneNumberId: true,
        zapiChannelId: true,
        uazapiToken: true,
        numeroExibido: true,
        ignorados: true,
        semEspera: true,
      },
    }),
    conversasDaIa(restaurant.id),
  ]);

  // Conectado por qualquer um dos três caminhos. Sem WhatsApp, o chat do
  // cardápio ainda funciona -- ele não depende de conexão nenhuma --, e é
  // por isso que a página não some.
  const comWhatsapp = Boolean(
    atendente?.phoneNumberId || atendente?.zapiChannelId || atendente?.uazapiToken,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Menu Fácil IA"
        description="O atendente que responde os seus clientes. Você decide o que ele faz."
      />

      <Card className="flex flex-col gap-3">
        {/* A bolinha e o "No WhatsApp: ligada" saíram daqui: diziam o mesmo
            que a chavinha logo abaixo, e ler duas vezes a mesma coisa faz
            duvidar de qual das duas está certa. Fica o número, que a chave
            não diz. */}
        {atendente?.numeroExibido && (
          <p className="text-sm text-muted">
            No WhatsApp {formatPhone(atendente.numeroExibido)}
          </p>
        )}

        {comWhatsapp ? (
          <>
            <LigarIa
              restaurantId={restaurant.id}
              ligada={Boolean(atendente?.ativo)}
            />
            {/* a explicação vem depois da chave, como nas outras: a chave
                diz o estado, o texto diz o que isso significa */}
            <p className="text-sm text-muted">
              {atendente?.ativo
                ? "Ela responde quem mandar mensagem enquanto o restaurante estiver aberto. Fora do horário, ou fechado no botão, ela não responde nada. Se você ou alguém da equipe responder pelo celular, ela fica quieta naquela conversa por 30 minutos."
                : "Desligada, as mensagens chegam no seu WhatsApp normalmente e ninguém responde por você."}
            </p>
          </>
        ) : (
          /* Sem WhatsApp, o caminho de conectar sozinho -- que existe
             só na uazapi, onde o QR code tem API. Quem está num dos
             outros dois provedores nunca cai aqui: ter canal lá já
             conta como conectado. */
          <ConectarWhatsapp restaurantId={restaurant.id} />
        )}
      </Card>

      {comWhatsapp && (
        <Card className="flex flex-col gap-3">
          <Pedidos
            restaurantId={restaurant.id}
            ligado={Boolean(atendente?.fazPedidos)}
          />
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <NoCardapio
          restaurantId={restaurant.id}
          ligado={Boolean(atendente?.noChat)}
        />
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
        <ConversasDaIa
          restaurantId={restaurant.id}
          conversas={conversas}
          ignorados={atendente.ignorados}
          semEspera={atendente.semEspera}
        />
      )}

      {atendente && (
        <Card className="flex flex-col gap-3">
          <Esquecer restaurantId={restaurant.id} />
        </Card>
      )}
    </div>
  );
}
