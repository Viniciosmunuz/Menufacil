import { Eraser, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { Card } from "@/components/ui/card";
import { Gaveta } from "@/components/ui/gaveta";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { noAr } from "@/lib/features";
import { formatPhone } from "@/lib/format";
import { requireDono } from "@/server/auth/dal";
import { conversasDaIa } from "@/server/ia/conversas";
import { conferirPareamento } from "@/server/ia/uazapi";

import { Esquecer, NoCardapio, Ofertas, Pedidos } from "./chaves";
import { ConversasDaIa } from "./conversas";
import { ListasDaIa } from "./ignorados";
import { ConectarWhatsapp } from "./conectar";
import { LigarIa } from "./ligar";

export const metadata: Metadata = { title: "WhatsApp IA" };

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
        ofertas: true,
        noChat: true,
        phoneNumberId: true,
        zapiChannelId: true,
        uazapiBaseUrl: true,
        uazapiToken: true,
        numeroExibido: true,
        ignorados: true,
        semEspera: true,
      },
    }),
    conversasDaIa(restaurant.id),
  ]);

  /**
   * Na uazapi, ter token **não** é estar conectado.
   *
   * O token nasce no instante em que a instância é criada no servidor,
   * antes de alguém ler o QR -- e tem de ser assim, senão uma falha no
   * meio do caminho deixaria a instância viva lá e desconhecida aqui,
   * ocupando um lugar do plano. O efeito colateral mordeu em 12/11/2026:
   * ele tocou em Conectar, viu o QR, não leu, e ao voltar à página o
   * botão tinha sumido -- o token já estava gravado, a tela deu o
   * restaurante por conectado e não havia mais como chegar no QR.
   *
   * Então quem responde isto é a uazapi, não o banco. De quebra resolve
   * o caso que ia aparecer mais tarde e seria pior: a sessão do QR
   * expira sozinha depois de um tempo, e sem esta pergunta o dono veria
   * "ligada" com a IA muda, sem nada na tela explicando.
   *
   * `null` é "não consegui perguntar" (provedor fora do ar, rede), e aí
   * vale o que está guardado: mostrar o QR a quem está conectado é pior
   * do que deixar a tela como estava.
   */
  const contaUazapi =
    atendente?.uazapiToken && atendente?.uazapiBaseUrl
      ? { baseUrl: atendente.uazapiBaseUrl, token: atendente.uazapiToken }
      : null;

  const pareamento = contaUazapi
    ? await conferirPareamento(contaUazapi).catch(() => null)
    : null;

  /** a uazapi respondeu, e respondeu que o WhatsApp não está pareado */
  const uazapiSolta = Boolean(pareamento && !pareamento.conectado);

  // Conectado por qualquer um dos três caminhos. Sem WhatsApp, o chat do
  // cardápio ainda funciona -- ele não depende de conexão nenhuma --, e é
  // por isso que a página não some.
  const comWhatsapp =
    Boolean(atendente?.phoneNumberId || atendente?.zapiChannelId || atendente?.uazapiToken) &&
    !uazapiSolta;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="WhatsApp IA"
        description="O atendente que responde os seus clientes. Você decide o que ele faz."
      />

      {/* O número e o estado da conexão, que é o que se olha primeiro: sem
          WhatsApp conectado, nada do resto desta tela acontece. */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-control",
                comWhatsapp ? "bg-success/12 text-success" : "bg-surface-2 text-faint",
              )}
            >
              <MessageCircle className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-extrabold">
                {atendente?.numeroExibido ? formatPhone(atendente.numeroExibido) : "WhatsApp do restaurante"}
              </p>
              <p className="text-sm text-muted">{comWhatsapp ? "Conectado" : "Sem conexão"}</p>
            </div>
          </div>

          {comWhatsapp && (
            <LigarIa restaurantId={restaurant.id} ligada={Boolean(atendente?.ativo)} />
          )}
        </div>

        {comWhatsapp ? (
          <p className="text-sm text-muted">
            {atendente?.ativo
              ? "Ela atende enquanto o restaurante está aberto. Se alguém da equipe responder pelo celular, ela se cala naquela conversa por 30 minutos."
              : "Desligada, as mensagens chegam no seu WhatsApp e ninguém responde por você."}
          </p>
        ) : (
          /* Sem WhatsApp, o caminho de conectar sozinho -- que existe
             só na uazapi, onde o QR code tem API. Quem está num dos
             outros dois provedores nunca cai aqui: ter canal lá já
             conta como conectado. */
          <ConectarWhatsapp restaurantId={restaurant.id} retomando={uazapiSolta} />
        )}
      </Card>

      {/* As chaves numa lista só. Eram quatro cartões soltos, cada um com
          o seu parágrafo; em pilha ficava impossível ver de relance o que
          estava ligado. */}
      <Card className="flex flex-col divide-y divide-line p-0 sm:p-0">
        {comWhatsapp && (
          <Pedidos restaurantId={restaurant.id} ligado={Boolean(atendente?.fazPedidos)} />
        )}
        {/* Oferecer só faz sentido para quem anota o pedido: é no meio da
            anotação que a oferta cabe. Sem isso, a chave ficaria ligada
            sem mudar nada. */}
        {comWhatsapp && atendente?.fazPedidos && (
          <Ofertas restaurantId={restaurant.id} ligado={Boolean(atendente?.ofertas)} />
        )}
        <NoCardapio restaurantId={restaurant.id} ligado={Boolean(atendente?.noChat)} />
      </Card>

      {/* Daqui para baixo é tudo gaveta: listas de número e conversas são
          coisa de consultar de vez em quando, não de deixar aberta na
          tela. Ele pediu assim. */}
      {atendente && (
        <ListasDaIa
          restaurantId={restaurant.id}
          ignorados={atendente.ignorados}
          semEspera={atendente.semEspera}
        />
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
        <Gaveta titulo="Recomeçar as conversas" resumo="Ela esquece tudo e atende do zero" icone={<Eraser />}>
          <Esquecer restaurantId={restaurant.id} />
        </Gaveta>
      )}
    </div>
  );
}
