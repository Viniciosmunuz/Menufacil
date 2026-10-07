import { ChevronLeft, ChevronRight, ExternalLink, MessagesSquare, Printer, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AvisosDeMensagem } from "@/components/panel/avisos-de-mensagem";
import { OrderActions } from "@/components/panel/order-actions";
import { OrderStepActions } from "@/components/panel/order-step-actions";
import { OrderDrawer, editableOrder, orderSummarySelect } from "@/components/panel/order-summary";
import { PageHeader } from "@/components/panel/page-header";
import { PrintSettings } from "@/components/panel/print-settings";
import { PushAvisos } from "@/components/panel/push-avisos";
import { OrdersLive } from "@/components/panel/orders-live";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { OrderStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { nextStatusNotice } from "@/server/whatsapp/messages";
import { OPEN_ORDER_STATUSES } from "@/lib/labels";
import { EXCLUDE_UNPAID, esperaAceite, nextOrderStep } from "@/lib/order-flow";
import { appUrl } from "@/lib/site";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { naoLidasPorPedido, recadosEsperando } from "@/server/chat/chat";
import { listDevices } from "@/server/print/devices";
import { contarPagamentosSemPedido } from "@/server/totem/pagos";
import { chavePublicaDePush } from "@/server/push/avisos";

import { AvisoDePagosSemPedido } from "../totem/pagos";
import {
  desligarAvisos,
  ligarAvisos,
  markPrinted,
  pairPrintDevice,
  reprintOrder,
  stepRestaurantOrder,
  testarAvisos,
  unpairPrintDevice,
  updateRestaurantOrder,
} from "./actions";

export const metadata: Metadata = { title: "Pedidos" };

const PAGE_SIZE = 30;

const FILTERS = {
  // quem termina um pedido some daqui: vale dizer para onde ele foi
  andamento: {
    label: "Em andamento",
    statuses: OPEN_ORDER_STATUSES,
    empty: "Nenhum pedido esperando você agora. Os que já foram entregues estão em Concluídos.",
  },
  concluidos: { label: "Concluídos", statuses: ["COMPLETED"] as OrderStatus[], empty: "Nenhum pedido concluído ainda." },
  cancelados: { label: "Cancelados", statuses: ["CANCELED"] as OrderStatus[], empty: "Nenhum pedido cancelado." },
  todos: { label: "Todos", statuses: null, empty: "Os pedidos feitos pelos clientes aparecem aqui." },
} as const;
type FilterKey = keyof typeof FILTERS;
const isFilter = (v: unknown): v is FilterKey => typeof v === "string" && v in FILTERS;

/** saiu do restaurante: o que falta é o entregador chegar */
const emRota = (o?: { status: OrderStatus }) => o?.status === "OUT_FOR_DELIVERY";

// Pedidos do restaurante: cada um abre como gaveta, com o próximo passo do
// atendimento à mão. A página se atualiza sozinha para mostrar pedido novo.
export default async function RestaurantOrdersPage({ params, searchParams }: PageProps<"/painel/[restaurantId]/pedidos">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  const sp = await searchParams;
  const filter: FilterKey = isFilter(sp.ver) ? sp.ver : "andamento";
  const page = Math.max(1, Number.parseInt(typeof sp.pagina === "string" ? sp.pagina : "1", 10) || 1);
  const statuses = FILTERS[filter].statuses;
  // O salão fica de fora desta tela.
  //
  // O pedido da mesa usa o mesmo Order e a mesma impressora -- é assim que
  // o salão não virou um segundo sistema --, mas ele não pertence a esta
  // lista: aqui se acompanha entrega, e "Mesa 7" no meio dos pedidos de
  // delivery faria o balcão procurar endereço onde não há. O salão tem a
  // tela dele, com o mapa das mesas.
  const where = { restaurantId: restaurant.id, origin: { not: "SALAO" as const }, ...(statuses ? { status: { in: [...statuses] } } : {}) };

  const [orders, total, byStatus, openOrders, printDevices, pagosSemPedido, recados] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: orderSummarySelect }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], where: { restaurantId: restaurant.id, origin: { not: "SALAO" } }, _count: { _all: true } }),
    // Pedidos esperando atendimento: são eles que a impressora tira sozinha
    // e que tocam o sino. O pedido do 100% Delivery que ainda está esperando
    // o Pix fica fora desta lista -- ele aparece na lista de baixo, para o
    // balcão saber que existe, mas não imprime nem apita.
    db.order.findMany({
      where: { restaurantId: restaurant.id, origin: { not: "SALAO" }, status: { in: [...OPEN_ORDER_STATUSES] }, ...EXCLUDE_UNPAID },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        number: true,
        code: true,
        createdAt: true,
        status: true,
        type: true,
        origin: true,
        paymentMethod: true,
        customerName: true,
        customerWhatsapp: true,
        // no 100% Delivery, a hora que conta para o sino é a do pagamento
        payment: { select: { confirmedAt: true } },
      },
    }),
    listDevices(restaurant.id),
    // dinheiro de cliente parado: o balcão vive nesta aba, então o aviso
    // nasce aqui mesmo, com o caminho para resolver
    restaurant.totemEnabled ? contarPagamentosSemPedido(restaurant.id) : Promise.resolve(0),
    // só no 100% Delivery existe conversa: nos outros o cliente fala pelo
    // WhatsApp, e o recado nunca passa por aqui
    restaurant.fullDeliveryEnabled ? recadosEsperando(restaurant.id) : Promise.resolve([]),
  ]);

  // uma consulta só para a página inteira, em vez de uma por linha
  const naoLidas = restaurant.fullDeliveryEnabled ? await naoLidasPorPedido(restaurant.id, orders.map((o) => o.id)) : new Map();

  const countOf = (key: FilterKey) => {
    const list = FILTERS[key].statuses;
    return byStatus.filter((g) => !list || (list as readonly OrderStatus[]).includes(g.status)).reduce((sum, g) => sum + g._count._all, 0);
  };
  const base = `/painel/${restaurant.id}/pedidos`;
  const href = (key: FilterKey, p = 1) => {
    const qs = new URLSearchParams();
    if (key !== "andamento") qs.set("ver", key);
    if (p > 1) qs.set("pagina", String(p));
    const s = qs.toString();
    return s ? `${base}?${s}` : base;
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Em andamento, quem já saiu com o entregador desce para o fim da lista.
  // Sem isto a divisória cairia no meio, com pedido do restaurante depois
  // dela. Nas outras abas a ordem é a de sempre: ali é histórico.
  const lista = filter === "andamento" ? [...orders].sort((a, b) => Number(emRota(a)) - Number(emRota(b))) : orders;
  const hidden = { restaurantId: restaurant.id };

  return (
    <div className="flex flex-col gap-6">
      <OrdersLive restaurantId={restaurant.id} />
      {/* rede de segurança: se o canal ao vivo cair, a tela ainda se atualiza */}
      <AutoRefresh seconds={45} background />
      <PageHeader title="Pedidos" description="Toque em um pedido para ver os detalhes e seguir o atendimento." />
      <AvisoDePagosSemPedido quantos={pagosSemPedido} href={`/painel/${restaurant.id}/totem`} />
      <PrintSettings
        base={base}
        panelUrl={`${appUrl()}/painel`}
        restaurantId={restaurant.id}
        acceptAction={stepRestaurantOrder}
        reprintAction={reprintOrder}
        markPrintedAction={markPrinted}
        pairAction={pairPrintDevice}
        unpairAction={unpairPrintDevice}
        recados={recados.length > 0 ? <AvisosDeMensagem mensagens={recados} base={base} /> : null}
        avisos={
          <PushAvisos
            restaurantId={restaurant.id}
            chavePublica={chavePublicaDePush()}
            ligarAction={ligarAvisos}
            desligarAction={desligarAvisos}
            testarAction={testarAvisos}
          />
        }
        devices={printDevices.map((d) => ({
          id: d.id,
          name: d.name,
          role: d.role,
          printerName: d.printerName,
          pairedAt: d.pairedAt?.toISOString() ?? null,
          lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
        }))}
        orders={openOrders.map((o) => {
          // o aviso da tela só traz o aceite; o resto do atendimento fica na lista
          const step = nextOrderStep(o.status, o.type, o.paymentMethod, o.origin);
          return {
            id: o.id,
            number: o.number,
            createdAt: o.createdAt.toISOString(),
            entrouEm: (o.origin === "FULL_DELIVERY" ? (o.payment?.confirmedAt ?? o.createdAt) : o.createdAt).toISOString(),
            status: o.status,
            accept: esperaAceite(o.status) ? step : null,
            notify: nextStatusNotice(o, restaurant),
          };
        })}
      />

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="Filtrar pedidos">
        {(Object.keys(FILTERS) as FilterKey[]).map((key) => (
          <Link
            key={key}
            href={href(key)}
            aria-current={key === filter ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold",
              key === filter ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
            )}
          >
            {FILTERS[key].label}
            <span className="tabular-nums opacity-80">{countOf(key)}</span>
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState icon={<ReceiptText />} title="Nada por aqui">
          {FILTERS[filter].empty}
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {lista.map((o, i) => (
              <li key={o.id}>
                {/* Uma linha fina separa o que ainda está aqui dentro do que
                    já está na rua: em cima o que a cozinha e o balcão têm de
                    fazer, embaixo o que só espera o entregador chegar. Sem
                    ela, quem olha a lista às 20h lê o selo de cada pedido
                    para saber qual é qual.

                    Discreta de propósito: é uma arrumação da lista, não um
                    aviso. Quem precisa chamar atenção aqui é o pedido parado. */}
                {emRota(o) && !emRota(lista[i - 1]) && (
                  <p className="mt-5 mb-2 flex items-center gap-3 text-xs font-bold tracking-widest text-faint uppercase">
                    <span className="h-px flex-1 bg-line" />
                    em rota
                    <span className="h-px flex-1 bg-line" />
                  </p>
                )}
                <OrderDrawer order={o} naoLidas={naoLidas.get(o.id) ?? 0}>
                  <OrderStepActions order={o} action={stepRestaurantOrder} hidden={hidden} notify={nextStatusNotice(o, restaurant)} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <OrderActions order={editableOrder(o)} updateAction={updateRestaurantOrder} hidden={hidden} />
                    <span className="flex flex-wrap items-center gap-2">
                      {/* no 100% Delivery o cliente fala por aqui, e não pelo
                          WhatsApp: sem um caminho na lista, a mensagem dele
                          só seria vista por quem abrisse o pedido por outro
                          motivo */}
                      {o.origin === "FULL_DELIVERY" && (
                        <Link
                          href={`${base}/${o.id}#conversa`}
                          className={buttonClasses((naoLidas.get(o.id) ?? 0) > 0 ? "primary" : "ghost", "sm")}
                        >
                          <MessagesSquare className="size-4" aria-hidden="true" />
                          {(naoLidas.get(o.id) ?? 0) > 0 ? `Responder (${naoLidas.get(o.id)})` : "Conversa"}
                        </Link>
                      )}
                      <a href={`${base}/${o.id}/via`} target="_blank" rel="noopener noreferrer" className={buttonClasses("ghost", "sm")}>
                        <Printer className="size-4" aria-hidden="true" />
                        Imprimir
                      </a>
                      <Link href={`${base}/${o.id}`} className={buttonClasses("ghost", "sm")}>
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Abrir pedido
                      </Link>
                    </span>
                  </div>
                </OrderDrawer>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav className="flex items-center justify-between gap-2" aria-label="Páginas">
              {page > 1 ? (
                <Link href={href(filter, page - 1)} className={buttonClasses("secondary", "sm")}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Anteriores
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-muted">
                Página {page} de {pages}
              </span>
              {page < pages ? (
                <Link href={href(filter, page + 1)} className={buttonClasses("secondary", "sm")}>
                  Próximos
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
