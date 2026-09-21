import { createHmac, timingSafeEqual } from "node:crypto";

import type { WhatsAppMessageStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

// Webhook da Meta (WhatsApp Cloud API): recebe o que aconteceu com cada
// mensagem (enviada, entregue, lida, falhou) e grava no registro.
//
// GET: verificação do endereço no painel da Meta (WHATSAPP_VERIFY_TOKEN).
// POST: eventos, assinados com o App Secret (X-Hub-Signature-256).

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("proibido", { status: 403 });
}

function validSignature(raw: string, header: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(raw, "utf8").digest("hex")}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// a ordem importa: um "entregue" atrasado não desfaz um "lida"
const rank: Record<WhatsAppMessageStatus, number> = { QUEUED: 0, SENDING: 1, SENT: 2, DELIVERED: 3, READ: 4, FAILED: 5 };
const fromMeta: Record<string, WhatsAppMessageStatus> = { sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" };

type StatusEvent = { id?: string; status?: string; errors?: { code?: number; title?: string; message?: string }[] };

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return new Response("assinatura inválida", { status: 401 });
  }

  let payload: { entry?: { changes?: { value?: { statuses?: StatusEvent[] } }[] }[] };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("ok", { status: 200 });
  }

  const events = (payload.entry ?? []).flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.statuses ?? []);
  for (const event of events) {
    const status = event.status ? fromMeta[event.status] : undefined;
    if (!event.id || !status) continue;
    const message = await db.whatsAppMessage.findUnique({ where: { providerMessageId: event.id }, select: { id: true, status: true } });
    if (!message || rank[status] <= rank[message.status]) continue;
    const error = event.errors?.[0];
    await db.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        status,
        ...(status === "FAILED" && error ? { error: `Meta ${error.code ?? ""}: ${error.title ?? error.message ?? "falhou"}`.slice(0, 500) } : {}),
      },
    });
  }
  // a Meta só precisa de um 200 rápido
  return new Response("ok", { status: 200 });
}
