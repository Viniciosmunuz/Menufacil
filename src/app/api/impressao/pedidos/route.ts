import { deviceFromRequest, touchDevice } from "@/server/print/devices";
import { pendingOrders } from "@/server/print/queue";

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

  const orders = await pendingOrders(device.restaurantId);
  return Response.json({
    pareado: true,
    pedidos: orders.map((o) => ({ id: o.id, numero: o.number, criado_em: o.createdAt.toISOString() })),
  });
}
