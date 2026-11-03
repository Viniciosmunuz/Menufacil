import { Bike, CheckCircle2, Moon, PackageCheck, PauseCircle, Zap } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EntregadorNav } from "@/components/panel/entregador-nav";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { Badge } from "@/components/ui/badge";
import { requireEntregador } from "@/server/auth/dal";
import { entregasLivres, fechadasHoje, minhasEntregas, pedidoDoEntregador } from "@/server/entregadores/entregas";
import { destinoDoPedido } from "@/server/entregadores/geocodificar";

import { CartaoDePedido, Faixa, ListaVazia, Numero, Recado, Secao } from "./componentes";
import { ChaveDeDisponibilidade } from "./disponibilidade";
import { TelaEmRota } from "./em-rota";
import { AvisoDePedidoNovo, type PedidoNovo } from "./novo-pedido";
import { MandaPosicao } from "./posicao";

export const metadata: Metadata = { title: "Minhas entregas" };

// A primeira tela do entregador.
//
// Responde a uma pergunta só: o que eu tenho para fazer agora. Por isso a
// entrega em andamento vem antes de qualquer número -- quem está com um
// pedido na garupa não abriu o aplicativo para ver estatística.

/** o recado escuro muda com o que ele mesmo disse do próprio estado */
const RECADO = {
  DISPONIVEL: { titulo: "Você está online!", corpo: "Aguardando novas entregas…", icone: Bike },
  PAUSA: { titulo: "Você está em pausa", corpo: "O balcão sabe que você volta já.", icone: PauseCircle },
  INDISPONIVEL: { titulo: "Você está fora do ar", corpo: "Mude para Disponível para receber entregas.", icone: Moon },
} as const;

export default async function EntregadorPage({ params }: PageProps<"/entregador/[restaurantId]">) {
  const { restaurantId } = await params;
  const { entregador, restaurant } = await requireEntregador();
  // o endereço aponta para outro restaurante: para ele, esta tela não existe
  if (restaurantId !== restaurant.id) notFound();
  const base = `/entregador/${restaurant.id}`;

  const [levando, livres, hoje] = await Promise.all([
    minhasEntregas(restaurant.id, entregador.id),
    entregasLivres(restaurant.id),
    fechadasHoje(restaurant.id, entregador.id),
  ]);

  // A entrega que ele está levando abre com o mapa, sem ele procurar:
  // quem abre o aplicativo com um pedido na garupa quer ver para onde vai,
  // e não uma lista com um item só.
  const atual = levando[0] ? await pedidoDoEntregador(restaurant.id, entregador.id, levando[0].id) : null;
  const destino = atual ? await destinoDoPedido(atual) : null;

  // o que pode virar aviso de tela cheia: o que mandaram para ele primeiro,
  // depois o que está livre para quem pegar
  const paraAvisar: PedidoNovo[] = [...levando, ...livres].map((p) => ({
    id: p.id,
    numero: p.number,
    cliente: p.customerName,
    bairro: p.deliveryNeighborhood,
    minha: p.atribuidoEm !== null,
  }));

  // Com entrega na mão, a tela vira o mapa.
  //
  // É outra tela, e não a mesma com um mapa dentro: quem está com a moto
  // ligada tem uma pergunta só -- para onde eu vou --, e lista de números
  // e de pedidos livres só atrapalha nessa hora.
  if (atual) {
    return <TelaEmRota pedido={atual} destino={destino} base={base} disponibilidade={entregador.disponibilidade} />;
  }

  const primeiroNome = entregador.nome.split(" ")[0];
  const recado = RECADO[entregador.disponibilidade];

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      {/* o pedido novo aparece sem ninguém puxar a tela */}
      <AutoRefresh seconds={30} />
      {/* com entrega na mão, o cliente acompanha a moto no mapa */}
      <MandaPosicao ativo={levando.length > 0} />
      <AvisoDePedidoNovo pedidos={paraAvisar} base={base} />

      <Faixa
        titulo={`Olá, ${primeiroNome}!`}
        subtitulo="Vamos fazer mais entregas hoje?"
        acao={<ChaveDeDisponibilidade atual={entregador.disponibilidade} />}
        alta
      />

      <div className="flex flex-col gap-5 pb-6">
        {/* os cartões sobem por cima da faixa: é esse encaixe que dá a
            profundidade de aplicativo */}
        <div className="-mt-12 grid grid-cols-2 gap-3">
          <Numero rotulo="Em entrega" valor={levando.length} icone={PackageCheck} tom="brand" />
          <Numero rotulo="Entregues hoje" valor={hoje} icone={CheckCircle2} tom="success" />
        </div>

        <Recado titulo={recado.titulo} icone={recado.icone} arte>
          {recado.corpo}
        </Recado>

        <section className="flex flex-col gap-3">
          <Secao icone={Zap}>Com você agora</Secao>
          <ListaVazia titulo="Nenhuma entrega no momento">Assim que chegar uma, você vê por aqui.</ListaVazia>
        </section>

        {livres.length > 0 && (
          <section className="flex flex-col gap-3">
            <Secao>Esperando quem leve</Secao>
            {livres.map((p) => (
              <CartaoDePedido key={p.id} pedido={p} base={base} selo={<Badge tone="warning">Livre</Badge>} />
            ))}
          </section>
        )}
      </div>

      <EntregadorNav base={base} />
    </main>
  );
}
