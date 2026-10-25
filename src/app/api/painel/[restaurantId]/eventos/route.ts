import { db } from "@/lib/db";
import { OPEN_ORDER_STATUSES } from "@/lib/labels";
import { requireRestaurantAccess } from "@/server/auth/dal";

// Canal de eventos do painel (SSE): em vez de a tela recarregar de tempos
// em tempos, o servidor avisa quando alguma coisa muda nos pedidos e a tela
// se atualiza na hora.
//
// A Vercel derruba a conexão quando a função passa do tempo dela, então o
// canal se encerra sozinho antes disso e o navegador reconecta — o
// EventSource faz isso por conta própria, sem perder nada: ao reconectar,
// a primeira mensagem já traz o estado atual.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** de quanto em quanto tempo o servidor olha se mudou algo */
const OLHAR_MS = 2000;
/** encerra antes do limite da Vercel, para o navegador reconectar limpo */
const VIDA_MS = 50_000;
/** sinal de vida, para nenhum intermediário fechar a conexão por silêncio */
const PING_MS = 15_000;

/**
 * Retrato do que importa: quantos pedidos abertos, quando mudaram, e o que
 * está esperando resposta na conversa.
 *
 * A conversa entra aqui porque no 100% Delivery ela faz o papel que o
 * WhatsApp fazia: o cliente escreve "estou na portaria" e isso tem de
 * aparecer no balcão sem ninguém recarregar a tela. Sem a conversa no
 * retrato, a mensagem só surgiria no próximo pedido que mudasse de status.
 *
 * O pedido de mesa fica de fora. Ele nasce em preparo -- um status aberto
 * --, e sem este filtro cada lançamento de garçom tocava o sino do balcão e
 * entrava na conta de "pedidos esperando", como se alguém tivesse pedido
 * pelo link. Quem lançou foi o próprio restaurante, e a comanda já saiu na
 * cozinha: não há nada para avisar.
 */
async function retrato(restaurantId: string) {
  const [pedidos, conversas] = await Promise.all([
    db.order.aggregate({
      where: { restaurantId, origin: { not: "SALAO" }, status: { in: [...OPEN_ORDER_STATUSES] } },
      _count: { _all: true },
      _max: { updatedAt: true, createdAt: true },
    }),
    db.chatConversation.aggregate({
      where: { restaurantId, order: { origin: { not: "SALAO" }, status: { in: [...OPEN_ORDER_STATUSES] } } },
      _sum: { restaurantUnread: true },
      _max: { lastMessageAt: true },
    }),
  ]);
  return [
    pedidos._count._all,
    pedidos._max.createdAt?.getTime() ?? 0,
    pedidos._max.updatedAt?.getTime() ?? 0,
    conversas._sum.restaurantUnread ?? 0,
    conversas._max.lastMessageAt?.getTime() ?? 0,
  ].join(":");
}

/**
 * O retrato da fila de impressão do salão, para o Menu Fácil PC.
 *
 * Muda quando entra pedido de mesa, quando alguém pede a via de novo ou
 * quando o garçom pede a conta: é o sinal para o programa buscar a fila na
 * hora, em vez de esperar a próxima volta. É o que faz a comanda sair em um
 * ou dois segundos depois do Salvar no celular do garçom.
 */
async function retratoDaImpressao(restaurantId: string) {
  const desde = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const [pedidos, contas] = await Promise.all([
    db.order.aggregate({
      where: { restaurantId, origin: "SALAO", createdAt: { gte: desde } },
      _count: { _all: true },
      _max: { createdAt: true },
      _sum: { printRuns: true },
    }),
    db.comanda.aggregate({ where: { restaurantId, contaPedidaAt: { gte: desde } }, _max: { contaPedidaAt: true } }),
  ]);
  return [
    pedidos._count._all,
    pedidos._max.createdAt?.getTime() ?? 0,
    pedidos._sum.printRuns ?? 0,
    contas._max.contaPedidaAt?.getTime() ?? 0,
  ].join(":");
}

export async function GET(request: Request, { params }: RouteContext<"/api/painel/[restaurantId]/eventos">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);

  // ?salao=1: o canal da impressão do salão, e não o dos pedidos. Olha mais
  // amiúde porque é papel que alguém está esperando na boca da impressora.
  const doSalao = new URL(request.url).searchParams.get("salao") === "1";
  const olhar = doSalao ? retratoDaImpressao : retrato;
  const evento = doSalao ? "impressao" : "pedidos";
  const intervalo = doSalao ? 1000 : OLHAR_MS;

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  let fim: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      let vivo = true;
      const manda = (evento: string, dado: string) => {
        if (!vivo) return;
        try {
          controller.enqueue(encoder.encode(`event: ${evento}\ndata: ${dado}\n\n`));
        } catch {
          vivo = false;
        }
      };
      const encerra = () => {
        if (!vivo) return;
        vivo = false;
        if (timer) clearInterval(timer);
        if (ping) clearInterval(ping);
        if (fim) clearTimeout(fim);
        try {
          controller.close();
        } catch {
          // já fechado do outro lado
        }
      };

      request.signal.addEventListener("abort", encerra);

      let anterior = await olhar(restaurant.id);
      manda("pronto", anterior);

      timer = setInterval(async () => {
        if (!vivo) return;
        try {
          const agora = await olhar(restaurant.id);
          if (agora !== anterior) {
            anterior = agora;
            manda(evento, agora);
          }
        } catch {
          encerra();
        }
      }, intervalo);

      ping = setInterval(() => manda("ping", String(Date.now())), PING_MS);
      fim = setTimeout(encerra, VIDA_MS);
    },
    cancel() {
      if (timer) clearInterval(timer);
      if (ping) clearInterval(ping);
      if (fim) clearTimeout(fim);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // alguns proxies só param de bufferizar com isto
      "x-accel-buffering": "no",
    },
  });
}
