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

/** retrato do que importa: quantos pedidos abertos e quando mudaram */
async function retrato(restaurantId: string) {
  const r = await db.order.aggregate({
    where: { restaurantId, status: { in: [...OPEN_ORDER_STATUSES] } },
    _count: { _all: true },
    _max: { updatedAt: true, createdAt: true },
  });
  return `${r._count._all}:${r._max.createdAt?.getTime() ?? 0}:${r._max.updatedAt?.getTime() ?? 0}`;
}

export async function GET(request: Request, { params }: RouteContext<"/api/painel/[restaurantId]/eventos">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);

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

      let anterior = await retrato(restaurant.id);
      manda("pronto", anterior);

      timer = setInterval(async () => {
        if (!vivo) return;
        try {
          const agora = await retrato(restaurant.id);
          if (agora !== anterior) {
            anterior = agora;
            manda("pedidos", agora);
          }
        } catch {
          encerra();
        }
      }, OLHAR_MS);

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
