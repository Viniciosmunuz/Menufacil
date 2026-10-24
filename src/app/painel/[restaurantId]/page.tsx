import { ChevronRight, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TemposCard } from "@/components/panel/tempos-card";
import { WeekChart } from "@/components/panel/week-chart";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { competenciaDe, situacaoDaCobranca } from "@/lib/cobranca";
import { db } from "@/lib/db";
import { TIME_ZONE, formatCents, startOfDaysAgo, startOfToday } from "@/lib/format";
import { restaurantStatusLabel, restaurantStatusTone } from "@/lib/labels";
import { isOpenNow, soRetirada, todayLabel } from "@/lib/opening-hours";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { activationChecklist } from "@/server/restaurants/checklist";
import { fechamentoDoDia, filaDeEspera, hojeContraOntem, mesAteAgora, quemMaisPede, semanaDePedidos, temposDoAtendimento } from "@/server/stats";
import { MesCard } from "@/components/panel/mes-card";

import { toggleProduct } from "./cardapio/actions";
import { ClientesCard } from "./clientes-card";
import { DiaCard } from "./dia-card";
import { MensalidadeCard } from "@/components/panel/mensalidade-card";
import { EsgotadosCard } from "@/components/panel/esgotados-card";
import { EsperandoCard } from "./esperando-card";
import { FechamentoCard } from "./fechamento-card";
import { OpenNowCard } from "./open-now-card";
import { StatusCard } from "./status-card";

export const metadata: Metadata = { title: "Início" };

/** "Bom dia" de verdade: a hora é a de Manaus, não a do servidor em UTC */
function saudacao() {
  const hora = Number(new Date().toLocaleString("pt-BR", { hour: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE }));
  if (hora < 12) return "Bom dia!";
  return hora < 18 ? "Boa tarde!" : "Boa noite!";
}

export default async function RestaurantDashboardPage({ params }: PageProps<"/painel/[restaurantId]">) {
  const { restaurantId } = await params;
  const { restaurant, viaAdmin } = await requireRestaurantAccess(restaurantId);

  const escopo = { restaurantId: restaurant.id };
  const hoje = startOfToday();
  // Esta tela é do delivery. O pedido da mesa usa o mesmo Order, mas não
  // entra em nenhum número daqui: o salão tem o caixa dele. As funções de
  // stats.ts já filtram por dentro; estas duas consultas são as da própria
  // tela, e precisam dizer o mesmo.
  const todayWhere = { ...escopo, origin: { not: "SALAO" as const }, createdAt: { gte: hoje } };

  const [dia, semana, fila, clientes, tempos, completedToday, esgotados, topProducts, checklist, details] = await Promise.all([
    hojeContraOntem(escopo),
    semanaDePedidos(escopo),
    filaDeEspera(escopo),
    quemMaisPede(restaurant.id, startOfDaysAgo(30)),
    temposDoAtendimento(escopo, startOfDaysAgo(30)),
    db.order.count({ where: { ...todayWhere, status: "COMPLETED" } }),
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
      where: { order: { ...escopo, origin: { not: "SALAO" }, status: { not: "CANCELED" }, createdAt: { gte: startOfDaysAgo(30) } } },
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{saudacao()}</h1>
          <p className="mt-1 text-muted">{restaurant.name}</p>
        </div>
        <Badge tone={restaurantStatusTone[restaurant.status]}>{restaurantStatusLabel[restaurant.status]}</Badge>
      </div>

      <StatusCard
        restaurantId={restaurant.id}
        slug={restaurant.slug}
        status={restaurant.status}
        checklist={checklist.items}
        ready={checklist.ready}
        viaAdmin={viaAdmin}
      />

      {/* Aberto ou fechado fica na largura inteira, acima das colunas.
          É o interruptor do negócio: enquanto ele estiver errado, nenhum
          outro número desta tela acontece. Espremido em meia tela viraria
          mais um cartão entre nove. */}
      <OpenNowCard
        restaurantId={restaurant.id}
        open={isOpenNow(details.openMode, details.openingHours)}
        openMode={details.openMode}
        today={todayLabel(details.openingHours)}
        entregaAtiva={details.deliveryEnabled}
        soRetiradaAte={soRetirada(details.pickupOnlyUntil) ? details.pickupOnlyUntil : null}
      />

      {/* Daqui para baixo, duas colunas na tela grande: à esquerda o que
          pede decisão agora, à direita o que conta história.

          Os cartões foram nascendo um embaixo do outro e já são nove: num
          monitor eles ocupavam uma coluna estreita no meio, com as laterais
          vazias, e ver o caixa do dia custava rolar a tela inteira. No
          celular continua uma coluna só -- lá empilhar é o certo. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          {/* o atraso vem antes de tudo: é o único aviso aqui que não é
              sobre o movimento de hoje, e some sozinho quando o pagamento
              for registrado */}
          <MensalidadeCard situacao={mensalidade} restaurante={restaurant.name} />

          {/* a fila primeiro: é a única coisa desta tela que pede ação agora */}
          <EsperandoCard href={`${base}/pedidos`} quantos={fila.quantos} maisAntigo={fila.maisAntigo} />

          {/* Esgotado com nome e interruptor: dizer "4 produtos esgotados"
              obrigava a ir até o cardápio e procurar quais eram, para uma
              coisa de um segundo. A lista inteira abre na seta, e religar
              acontece aqui mesmo. */}
          <EsgotadosCard
            esgotados={esgotados.map((p) => ({ id: p.id, nome: p.name, secao: p.category?.name ?? null }))}
            cardapioHref={`${base}/cardapio`}
            toggleAction={toggleProduct}
            restaurantId={restaurant.id}
          />

          <DiaCard
            href={`${base}/pedidos?ver=todos`}
            pedidos={dia.hoje}
            pedidosOntem={dia.ontem}
            centavos={dia.centavosHoje}
            centavosOntem={dia.centavosOntem}
            concluidos={completedToday}
          />

          <FechamentoCard linhas={fechamento.linhas} totalCentavos={fechamento.totalCentavos} totalPedidos={fechamento.totalPedidos} />

          <TemposCard tempos={tempos} />
        </div>

        <div className="flex flex-col gap-6">
          <WeekChart dias={semana} titulo="Últimos sete dias" descricao="Quantos pedidos entraram em cada dia." />

          {/* o mês: quanto entrou e os dois dias que se destacaram */}
          <MesCard mes={mes} />

          <ClientesCard clientes={clientes.clientes} deQuemVoltou={clientes.deQuemVoltou} totalDePedidos={clientes.totalDePedidos} />

          <Card>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold">Mais pedidos no mês</h2>
                <p className="text-sm text-muted">Os campeões dos últimos 30 dias.</p>
              </div>
              <TrendingUp className="size-5 text-faint" aria-hidden="true" />
            </div>
            {topProducts.length === 0 ? (
              <p className="mt-3 text-muted">Assim que chegarem os primeiros pedidos, os produtos mais vendidos aparecem aqui.</p>
            ) : (
              <ol className="mt-4 flex flex-col divide-y divide-line">
                {topProducts.map((p, i) => (
                  <li key={p.productName} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={
                          i === 0
                            ? "grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-brand-ink"
                            : "grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-sm text-muted"
                        }
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 truncate font-semibold">{p.productName}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm">
                      <span className="block font-extrabold tabular-nums">{p._sum.quantity ?? 0}x</span>
                      <span className="block text-muted tabular-nums">{formatCents(p._sum.totalCents ?? 0)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <Link href={`${base}/cardapio`} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">
              Ver o cardápio
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
