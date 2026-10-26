import type { Metadata } from "next";

import { EsgotadosCard } from "@/components/panel/esgotados-card";
import { MensalidadeCard } from "@/components/panel/mensalidade-card";
import { MesCard } from "@/components/panel/mes-card";
import { WeekChart } from "@/components/panel/week-chart";
import { Badge } from "@/components/ui/badge";
import { competenciaDe, situacaoDaCobranca } from "@/lib/cobranca";
import { db } from "@/lib/db";
import { TIME_ZONE, startOfDaysAgo, startOfToday } from "@/lib/format";
import { OPEN_ORDER_STATUSES, restaurantStatusLabel, restaurantStatusTone } from "@/lib/labels";
import { isOpenNow, soRetirada, todayLabel } from "@/lib/opening-hours";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { activationChecklist } from "@/server/restaurants/checklist";
import { fechamentoDoDia, filaDeEspera, hojeContraOntem, mesAteAgora, quemMaisPede, semanaDePedidos, temposDoAtendimento } from "@/server/stats";

import { toggleProduct } from "./cardapio/actions";
import { ClientesCard } from "./clientes-card";
import { EsperandoCard } from "./esperando-card";
import { FechamentoCard } from "./fechamento-card";
import { Indicadores } from "./indicadores";
import { MaisPedidosCard } from "./mais-pedidos-card";
import { MovimentacaoCard } from "./movimentacao-card";
import { OpenNowCard } from "./open-now-card";
import { StatusCard } from "./status-card";

export const metadata: Metadata = { title: "Início" };

/** "Bom dia" de verdade: a hora é a de Manaus, não a do servidor em UTC */
function saudacao() {
  const hora = Number(new Date().toLocaleString("pt-BR", { hour: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE }));
  if (hora < 12) return "Bom dia";
  return hora < 18 ? "Boa tarde" : "Boa noite";
}

/** "domingo, 26 de outubro de 2026", no fuso da casa */
function hojePorExtenso() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
}

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

  const [dia, semana, fila, clientes, tempos, completedToday, canceladosHoje, emAndamento, esgotados, topProducts, checklist, details] =
    await Promise.all([
      hojeContraOntem(escopo),
      semanaDePedidos(escopo),
      filaDeEspera(escopo),
      quemMaisPede(restaurant.id, startOfDaysAgo(30)),
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
          openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
          // a mensalidade do mês: o dono só descobria que estava devendo
          // quando alguém ligava
          plan: true,
          billingDay: true,
          payments: { where: { competencia: competenciaDe() }, take: 1, select: { amountCents: true, paidAt: true } },
        },
      }),
    ]);

  // o caixa é do turno, e o turno vem do horário: por isso depois do
  // Promise.all, que é quando os horários chegam
  const [fechamento, mes] = await Promise.all([fechamentoDoDia(escopo, details.openingHours), mesAteAgora(escopo)]);
  const mensalidade = situacaoDaCobranca(details, details.payments[0] ?? null);
  const base = `/painel/${restaurant.id}`;

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho baixo de propósito: o primeiro número precisa aparecer
          sem rolar. Antes a saudação ocupava uma faixa inteira sozinha. */}
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-muted">
            {saudacao()}, {restaurant.name}
          </p>
          <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">Visão geral</h1>
          <p className="mt-0.5 text-sm text-muted">Acompanhe o desempenho do seu restaurante.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge tone={restaurantStatusTone[restaurant.status]}>{restaurantStatusLabel[restaurant.status]}</Badge>
          <span className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-bold text-muted first-letter:uppercase">
            {hojePorExtenso()}
          </span>
        </div>
      </header>

      {/* o atraso vem antes de tudo: é o único aviso aqui que não é sobre o
          movimento de hoje, e some sozinho quando o pagamento for registrado */}
      <MensalidadeCard situacao={mensalidade} restaurante={restaurant.name} />

      <StatusCard
        restaurantId={restaurant.id}
        slug={restaurant.slug}
        status={restaurant.status}
        checklist={checklist.items}
        ready={checklist.ready}
        viaAdmin={viaAdmin}
      />

      {/* a fila é a única coisa desta tela que pede ação agora */}
      <EsperandoCard href={`${base}/pedidos`} quantos={fila.quantos} maisAntigo={fila.maisAntigo} />

      <Indicadores
        href={`${base}/pedidos?ver=todos`}
        pedidos={dia.hoje}
        pedidosOntem={dia.ontem}
        centavos={dia.centavosHoje}
        centavosOntem={dia.centavosOntem}
        concluidos={completedToday}
        semana={semana}
        tempos={tempos}
      />

      <OpenNowCard
        restaurantId={restaurant.id}
        open={isOpenNow(details.openMode, details.openingHours)}
        openMode={details.openMode}
        today={todayLabel(details.openingHours)}
        entregaAtiva={details.deliveryEnabled}
        soRetiradaAte={soRetirada(details.pickupOnlyUntil) ? details.pickupOnlyUntil : null}
      />

      {/* O gráfico manda na linha: é o que se olha por mais tempo. Ao lado
          dele, o que está na mão agora e o fechamento do dia. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <WeekChart dias={semana} titulo="Vendas e pedidos" descricao="Últimos sete dias." />
        <div className="flex flex-col gap-4">
          {/* Esgotado com nome e interruptor: dizer "4 produtos esgotados"
              obrigava a ir até o cardápio e procurar quais eram, para uma
              coisa de um segundo. A lista inteira abre na seta, e religar
              acontece aqui mesmo. Só existe quando falta alguma coisa. */}
          <EsgotadosCard
            esgotados={esgotados.map((p) => ({ id: p.id, nome: p.name, secao: p.category?.name ?? null }))}
            cardapioHref={`${base}/cardapio`}
            toggleAction={toggleProduct}
            restaurantId={restaurant.id}
          />
          <MovimentacaoCard base={base} emAndamento={emAndamento} concluidos={completedToday} cancelados={canceladosHoje} />
          <FechamentoCard linhas={fechamento.linhas} totalCentavos={fechamento.totalCentavos} totalPedidos={fechamento.totalPedidos} />
          <MaisPedidosCard
            produtos={topProducts.map((p) => ({ nome: p.productName, quantidade: p._sum.quantity ?? 0, centavos: p._sum.totalCents ?? 0 }))}
            cardapioHref={`${base}/cardapio`}
          />
        </div>
      </div>

      {/* o que conta história: o mês e quem volta. Os tempos saíram daqui
          -- cozinha e entrega abrem a tela nos indicadores, e repetir o
          mesmo número duas vezes na mesma página é ruído. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MesCard mes={mes} />
        <ClientesCard clientes={clientes.clientes} deQuemVoltou={clientes.deQuemVoltou} totalDePedidos={clientes.totalDePedidos} />
      </div>
    </div>
  );
}
