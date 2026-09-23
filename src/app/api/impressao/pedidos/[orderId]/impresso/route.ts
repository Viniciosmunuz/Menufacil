import { deviceFromRequest, touchDevice } from "@/server/print/devices";
import { markOrderPrinted } from "@/server/print/queue";

// O programa avisa que a via saiu. Daqui em diante o pedido não volta
// para a fila — é o que impede a mesma via de sair duas vezes, mesmo com
// dois computadores ligados no mesmo restaurante.

export async function POST(request: Request, { params }: RouteContext<"/api/impressao/pedidos/[orderId]/impresso">) {
  const device = await deviceFromRequest(request);
  if (!device?.restaurantId) return Response.json({ erro: "não autorizado" }, { status: 401 });

  const { orderId } = await params;
  const result = await markOrderPrinted(device.restaurantId, orderId);
  await touchDevice(device.id);
  return Response.json(result);
}
