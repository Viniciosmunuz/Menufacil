import type { Metadata } from "next";

import { EsgotadosCard } from "@/components/panel/esgotados-card";
import { MensalidadeCard } from "@/components/panel/mensalidade-card";
import { WeekChart } from "@/components/panel/week-chart";
import { competenciaDe, situacaoDaCobranca } from "@/lib/cobranca";
import { db } from "@/lib/db";
import { startOfDaysAgo, startOfToday } from "@/lib/format";
import { OPEN_ORDER_STATUSES } from "@/lib/labels";
import { isOpenNow, soRetirada, todayLabel } from "@/lib/opening-hours";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { activationChecklist } from "@/server/restaurants/checklist";
import {
  fechamentoDoDia,
  hojeContraOntem,
  mesDaLia,
  pedidosAtrasados,
  quemMaisPede,
  semanaDePedidos,
  temposDoAtendimento,
  type MesDaLia as MesDaLiaDados,
  type QuemMaisPede,
} from "@/server/stats";

import { toggleProduct } from "./cardapio/actions";
import { FechamentoCard } from "./fechamento-card";
import { ClientesQueVoltam } from "./clientes-que-voltam";
import { MesDaLia } from "./mes-da-lia";
import { DesempenhoCard } from "./desempenho";
import { Indicadores } from "./indicadores";
import { MaisPedidosCard } from "./mais-pedidos-card";
import { MovimentacaoCard } from "./movimentacao-card";
import { OperacaoCard } from "./open-now-card";
import { StatusCard } from "./status-card";

export const metadata: Metadata = { title: "Início" };

export default async function RestaurantDashboardPage({ params }: PageProps<"/painel/[restaurantId]">) {
  const { restaurantId } = await params;
  const { restaurant, viaAdmin } = await requireRestaurantAccess(restaurantId);

  const escopo = { restaurantId: restaurant.id };
  const hoje = startOfToday();
  // Esta tela é do delivery. O pedido da mesa usa o mesmo Order, mas não
  // entra em nenhum número daqui: o salão tem o caixa dele. As funções de
  // stats.ts já filtram por dentro; estas consultas são as da própria tela,
  // e precisam dizer o mesmo.
  const semSalao = { ...escopo, origin: { not: "SALAO" as const } };
  const todayWhere = { ...semSalao, createdAt: { gte: hoje } };

  const [dia, semana, tempos, completedToday, canceladosHoje, emAndamento, esgotados, topProducts, checklist, details] =
    await Promise.all([
      hojeContraOntem(escopo),
      semanaDePedidos(escopo),
      temposDoAtendimento(escopo, startOfDaysAgo(30)),
      db.order.count({ where: { ...todayWhere, status: "COMPLETED" } }),
      db.order.count({ where: { ...todayWhere, status: "CANCELED" } }),
      // sem recorte de dia, de propósito: a pergunta é "o que ainda está na
      // minha mão?", e o pedido de ontem que ninguém fechou continua estando.
      // É também o que a aba "Em andamento" dos Pedidos mostra, para onde
      // este número leva.
      db.order.count({ where: { ...semSalao, status: { in: [...OPEN_ORDER_STATUSES] } } }),
      // o esquecimento mais comum do balcão: marcar esgotado e nunca religar.
      // Os nomes vêm junto: "1 produto esgotado" obrigava a ir até o cardápio
      // só para descobrir qual era.
      db.product.findMany({
        where: { ...escopo, available: false },
        select: { id: true, name: true, category: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      // os campeões do mês, não de sempre: é o mês que diz o que comprar amanhã
      db.orderItem.groupBy({
        by: ["productName"],
        where: { order: { ...semSalao, status: { not: "CANCELED" }, createdAt: { gte: startOfDaysAgo(30) } } },
        _sum: { quantity: true, totalCents: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      activationChecklist(restaurant.id),
      db.restaurant.findUniqueOrThrow({
        where: { id: restaurant.id },
        select: {
          openMode: true,
          deliveryEnabled: true,
          pickupOnlyUntil: true,
          atendenteIa: { select: { ativo: true, phoneNumberId: true } },
          openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
          // a mensalidade do mês: o dono só descobria que estava devendo
          // quando alguém ligava
          plan: true,
          billingDay: true,
          payments: { where: { competencia: competenciaDe() }, take: 1, select: { amountCents: true, paidAt: true } },
        },
      }),
    ]);

  /**
   * A Lia está atendendo neste restaurante?
   *
   * Decide o que ocupa o canto do rodapé. Quem tem a IA ligada quer
   * saber se ela está valendo o que custa; quem não tem, não precisa de
   * um cartão dela apagado na tela, e ali cabe melhor a conta dos
   * clientes que voltam.
   *
   * É `ativo`, e não só o recurso liberado: a IA desligada no botão não
   * fechou pedido nenhum, e um cartão dela marcando zero seria cobrança
   * de uma coisa que o dono escolheu não usar.
   */
  const comLia = Boolean(restaurant.iaEnabled && details.atendenteIa?.ativo);

  // o caixa é do turno, e o turno vem do horário: por isso depois do
  // Promise.all, que é quando os horários chegam
  // o atraso se mede contra a régua da casa, que só existe depois dos tempos
  // e o cartão do rodapé, que depende de a Lia estar ligada ou não -- só
  // uma das duas contas é feita, nunca as duas
  const [fechamento, atrasados, rodape] = await Promise.all([
    fechamentoDoDia(escopo, details.openingHours),
    pedidosAtrasados(escopo, tempos),
    comLia ? mesDaLia(restaurant.id, startOfDaysAgo(30)) : quemMaisPede(restaurant.id, startOfDaysAgo(30)),
  ]);
  const mensalidade = situacaoDaCobranca(details, details.payments[0] ?? null);
  const base = `/painel/${restaurant.id}`;

  return (
    <div className="flex flex-col gap-5">
      {/* Esta faixa já trouxe a saudação e a data, e depois o selo de
          aberto. O selo subiu para a barra do alto, que acompanha a
          rolagem e vale em todas as telas: aqui ele era um segundo
          "Aberto" na mesma tela, e os dois nem sempre concordavam. O que
          muda o estado continua logo abaixo, no cartão de operação. */}

      {/* o atraso vem antes de tudo: é o único aviso aqui que não é sobre o
          movimento de hoje, e some sozinho quando o pagamento for registrado */}
      <MensalidadeCard situacao={mensalidade} restaurante={restaurant.name} />

      <Indicadores
        href={`${base}/pedidos?ver=todos`}
        pedidos={dia.hoje}
        pedidosOntem={dia.ontem}
        centavos={dia.centavosHoje}
        centavosOntem={dia.centavosOntem}
        concluidos={completedToday}
        tempos={tempos}
      />

      {/* O interruptor do negócio, logo abaixo dos números: enquanto ele
          estiver errado, nenhum outro número desta tela acontece. Apertou
          aqui, o selo do canto de cima vira de cor. */}
      <OperacaoCard
        restaurantId={restaurant.id}
        open={isOpenNow(details.openMode, details.openingHours)}
        openMode={details.openMode}
        today={todayLabel(details.openingHours)}
        entregaAtiva={details.deliveryEnabled}
        soRetiradaAte={soRetirada(details.pickupOnlyUntil) ? details.pickupOnlyUntil : null}
      />

      {/* O gráfico manda na linha: é o que se olha por mais tempo. Ao lado
          dele, o que está na mão agora e os campeões do mês. */}
      {/* São três cartões. Entre 1024 e 1280 de largura a linha tem duas
          colunas, e o terceiro deixaria um vazio do tamanho de um cartão
          ao lado dele: nessa faixa ele ocupa a linha inteira. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:[&>*:last-child]:col-span-2 xl:grid-cols-[1.5fr_1fr_1fr] xl:[&>*:last-child]:col-span-1">
        <WeekChart dias={semana} titulo="Vendas e pedidos" descricao="Últimos sete dias." />
        <MovimentacaoCard
          base={base}
          emAndamento={emAndamento}
          concluidos={completedToday}
          cancelados={canceladosHoje}
          atrasados={atrasados}
        />
        <MaisPedidosCard
          produtos={topProducts.map((p) => ({ nome: p.productName, quantidade: p._sum.quantity ?? 0, centavos: p._sum.totalCents ?? 0 }))}
          cardapioHref={`${base}/cardapio`}
        />
      </div>

      {/* As gavetas, depois do gráfico: o que acabou, o caixa do dia e o
          link do cardápio. As três são consulta -- abre quem quiser. O
          link era um bloco no alto da tela para uma coisa que o dono já
          fez na primeira semana. */}
      {/* `items-start`: sem ele o grid dá a todos a altura do mais alto, e
          abrir uma das gavetas esticava as outras duas junto -- dois
          cartões fechados com meio palmo de vazio dentro, do tamanho do
          que o vizinho abriu. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:[&>*:last-child]:col-span-2 xl:grid-cols-3 xl:[&>*:last-child]:col-span-1">
        {/* Esgotado com nome e interruptor: dizer "4 produtos esgotados"
            obrigava a ir até o cardápio e procurar quais eram, para uma
            coisa de um segundo. Religar acontece aqui mesmo. */}
        <EsgotadosCard
          esgotados={esgotados.map((p) => ({ id: p.id, nome: p.name, secao: p.category?.name ?? null }))}
          cardapioHref={`${base}/cardapio`}
          toggleAction={toggleProduct}
          restaurantId={restaurant.id}
        />
        <FechamentoCard linhas={fechamento.linhas} totalCentavos={fechamento.totalCentavos} totalPedidos={fechamento.totalPedidos} />
        <StatusCard
          restaurantId={restaurant.id}
          slug={restaurant.slug}
          status={restaurant.status}
          checklist={checklist.items}
          ready={checklist.ready}
          viaAdmin={viaAdmin}
        />
      </div>

      {/* O rodapé: para onde ir depois de olhar o movimento, e como o dia
          está indo contra a média da semana. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <DesempenhoCard base={base} />
        {comLia ? (
          <MesDaLia dados={rodape as MesDaLiaDados} href={`${base}/ia`} />
        ) : (
          <ClientesQueVoltam
            deQuemVoltou={(rodape as QuemMaisPede).deQuemVoltou}
            totalDePedidos={(rodape as QuemMaisPede).totalDePedidos}
            href={`${base}/clientes`}
          />
        )}
      </div>
    </div>
  );
}
