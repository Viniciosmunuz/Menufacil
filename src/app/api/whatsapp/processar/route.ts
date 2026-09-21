import { timingSafeEqual } from "node:crypto";

import { processWhatsAppQueue } from "@/server/whatsapp/processor";

// Cron do envio de WhatsApp: pega mensagens que ficaram na fila (novas
// tentativas, envio que caiu). Protegido por CRON_SECRET no cabeçalho
// Authorization: Bearer <segredo> (a Vercel Cron manda assim sozinha).

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function run(request: Request) {
  if (!authorized(request)) return Response.json({ error: "não autorizado" }, { status: 401 });
  const result = await processWhatsAppQueue({ limit: 50 });
  return Response.json(result);
}

export const GET = run;
export const POST = run;
