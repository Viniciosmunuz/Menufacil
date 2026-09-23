import { deviceFromRequest, touchDevice } from "@/server/print/devices";

// Como está esta instalação: já pertence a algum restaurante ou ainda
// mostra o código de pareamento? O programa consulta ao ligar e enquanto
// espera o dono parear.

export async function GET(request: Request) {
  const device = await deviceFromRequest(request);
  if (!device) return Response.json({ erro: "não autorizado" }, { status: 401 });

  const printer = new URL(request.url).searchParams.get("impressora");
  await touchDevice(device.id, printer);

  return Response.json({
    pareado: !!device.restaurantId,
    codigo_pareamento: device.pairingCode,
    restaurante: device.restaurant ? { id: device.restaurant.id, nome: device.restaurant.name } : null,
    dispositivo: { id: device.id, nome: device.name },
  });
}
