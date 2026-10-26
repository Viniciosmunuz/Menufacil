import { ChevronRight, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EsgotadosCard } from "@/components/panel/esgotados-card";
import { MensalidadeCard } from "@/components/panel/mensalidade-card";
import { MesCard } from "@/components/panel/mes-card";
import { TemposCard } from "@/components/panel/tempos-card";
import { WeekChart } from "@/components/panel/week-chart";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { competenciaDe, situacaoDaCobranca } from "@/lib/cobranca";
import { db } from "@/lib/db";
import { TIME_ZONE, formatCents, startOfDaysAgo, startOfToday } from "@/lib/format";
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

      {/* Esgotado com nome e interruptor: dizer "4 produtos esgotados"
          obrigava a ir até o cardápio e procurar quais eram, para uma coisa
          de um segundo. A lista inteira abre na seta, e religar acontece
          aqui mesmo. */}
      <EsgotadosCard
        esgotados={esgotados.map((p) => ({ id: p.id, nome: p.name, secao: p.category?.name ?? null }))}
        cardapioHref={`${base}/cardapio`}
        toggleAction={toggleProduct}
        restaurantId={restaurant.id}
      />

      {/* O gráfico manda na linha: é o que se olha por mais tempo. Ao lado
          dele, o que está na mão agora e o fechamento do dia. */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
        <WeekChart dias={semana} titulo="Vendas e pedidos" descricao="Últimos sete dias." />
        <div className="flex flex-col gap-4">
          <MovimentacaoCard base={base} emAndamento={emAndamento} concluidos={completedToday} cancelados={canceladosHoje} />
          <FechamentoCard linhas={fechamento.linhas} totalCentavos={fechamento.totalCentavos} totalPedidos={fechamento.totalPedidos} />
        </div>
      </div>

      {/* o que conta história: o mês, os tempos e os campeões */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <MesCard mes={mes} />
        <TemposCard tempos={tempos} />

        <Card className="flex flex-col">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <Trophy className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg leading-tight font-extrabold">Mais pedidos no mês</h2>
              <p className="text-sm text-muted">Os campeões dos últimos 30 dias.</p>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Assim que chegarem os primeiros pedidos, os produtos mais vendidos aparecem aqui.</p>
          ) : (
            <ol className="mt-3 flex flex-col divide-y divide-line">
              {topProducts.map((p, i) => (
                <li key={p.productName} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={
                        i === 0
                          ? "grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-ink"
                          : "grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold text-muted"
                      }
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 truncate text-sm font-semibold">{p.productName}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-extrabold tabular-nums">{p._sum.quantity ?? 0}x</span>
                    <span className="block text-xs text-muted tabular-nums">{formatCents(p._sum.totalCents ?? 0)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}

          <Link href={`${base}/cardapio`} className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-bold text-brand hover:underline">
            Ver o cardápio
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </Card>
      </div>

      <ClientesCard clientes={clientes.clientes} deQuemVoltou={clientes.deQuemVoltou} totalDePedidos={clientes.totalDePedidos} />
    </div>
  );
}
