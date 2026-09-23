import { deviceFromRequest } from "@/server/print/devices";
import { orderTicket } from "@/server/print/queue";

// A via de um pedido, já formatada. Só responde pedido do restaurante
// ao qual este computador está pareado.

export async function GET(request: Request, { params }: RouteContext<"/api/impressao/pedidos/[orderId]">) {
  const device = await deviceFromRequest(request);
  if (!device?.restaurantId) return Response.json({ erro: "não autorizado" }, { status: 401 });

  const { orderId } = await params;
  const ticket = await orderTicket(device.restaurantId, orderId);
  if (!ticket) return Response.json({ erro: "pedido não encontrado" }, { status: 404 });

  return Response.json(ticket);
}
