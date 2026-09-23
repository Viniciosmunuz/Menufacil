import { registerDevice } from "@/server/print/devices";

// Primeira vez que o Print Fácil roda no computador: ele se registra e
// recebe o token (que fica só com ele) e o código de pareamento, que o
// dono digita no painel para ligar o computador ao restaurante dele.

export async function POST(request: Request) {
  let name = "Computador";
  try {
    const body = (await request.json()) as { nome?: unknown };
    if (typeof body?.nome === "string" && body.nome.trim()) name = body.nome.trim();
  } catch {
    // sem corpo: fica o nome padrão
  }

  const { deviceId, token, pairingCode } = await registerDevice(name);
  return Response.json({ dispositivo_id: deviceId, token, codigo_pareamento: pairingCode }, { status: 201 });
}
