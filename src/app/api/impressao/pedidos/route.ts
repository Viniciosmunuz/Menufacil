import { DEFAULT_PAPER } from "@/lib/ticket";
import { deviceFromRequest, touchDevice } from "@/server/print/devices";
import { orderTicket, pendingOrders } from "@/server/print/queue";

// A fila: os pedidos deste restaurante que ainda não saíram no papel. O
// Print Fácil pergunta de poucos em poucos segundos. Não dá para usar
// WebSocket aqui: na Vercel o servidor acorda por requisição, não fica de
// pé esperando. Se um dia isso mudar, o programa troca esta consulta por
// um fluxo de eventos sem mexer no resto.

export async function GET(request: Request) {
  const device = await deviceFromRequest(request);
  if (!device) return Response.json({ erro: "não autorizado" }, { status: 401 });

  const printer = new URL(request.url).searchParams.get("impressora");
  await touchDevice(device.id, printer);

  if (!device.restaurantId) {
    return Response.json({ pareado: false, codigo_pareamento: device.pairingCode, pedidos: [] });
  }

  // cada impressora pede a sua fila: a da cozinha vê tudo, a do tablet só
  // o recibo de cliente que ainda não saiu -- e, quando o cardápio está
  // dividido entre impressoras, cada uma vê só os pedidos que têm algo
  // dela, com a própria trava de já impresso
  const orders = await pendingOrders(device.restaurantId, device.role, device.id, device.appKey !== null);

  // ?vias=1: a via de cada pedido já vem junto, numa ida só. O Menu Fácil
  // PC pede assim; o Print Fácil continua buscando uma por uma, como sempre.
  const restaurantIdDaFila = device.restaurantId;
  const comVias = new URL(request.url).searchParams.get("vias") === "1";
  const vias = comVias ? await Promise.all(orders.map((o) => orderTicket(restaurantIdDaFila, o.id, device.role, device.id))) : null;

  return Response.json({
    pareado: true,
    papel_mm: device.restaurant?.receiptWidth ?? DEFAULT_PAPER,
    // "tentativa" sobe quando o restaurante pede a via de novo: é assim que
    // o programa sabe que aquele pedido precisa sair outra vez
    pedidos: orders.map((o, i) => ({
      id: o.id,
      numero: o.number,
      criado_em: o.createdAt.toISOString(),
      tentativa: o.printRuns,
      ...(vias ? { via: vias[i] } : {}),
    })),
  });
}
