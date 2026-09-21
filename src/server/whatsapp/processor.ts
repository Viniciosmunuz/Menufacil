import "server-only";

import { db } from "@/lib/db";

import { ProviderError, clientFor } from "./providers";

// Processador da fila: pega as mensagens pendentes, envia pelo provedor e
// grava o resultado. Pode rodar em paralelo (cada mensagem é "reservada"
// com um update condicional antes de sair). Falha temporária volta para a
// fila com espera crescente: 1, 2, 4, 8 minutos; na 5ª tentativa desiste.

const MAX_ATTEMPTS = 5;
const STUCK_AFTER_MS = 5 * 60 * 1000;

export async function processWhatsAppQueue(options: { limit?: number; orderId?: string } = {}) {
  // mensagem presa em "enviando" (o processo caiu no meio): volta para a fila
  await db.whatsAppMessage.updateMany({
    where: { status: "SENDING", updatedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) } },
    data: { status: "QUEUED" },
  });

  const due = await db.whatsAppMessage.findMany({
    where: { status: "QUEUED", nextAttemptAt: { lte: new Date() }, ...(options.orderId ? { orderId: options.orderId } : {}) },
    orderBy: { createdAt: "asc" },
    take: options.limit ?? 25,
    select: { id: true },
  });

  let sent = 0;
  let failed = 0;
  for (const { id } of due) {
    const claimed = await db.whatsAppMessage.updateMany({
      where: { id, status: "QUEUED" },
      data: { status: "SENDING", attempts: { increment: 1 } },
    });
    if (!claimed.count) continue; // outro processo pegou

    const message = await db.whatsAppMessage.findUniqueOrThrow({
      where: { id },
      include: { restaurant: { select: { whatsappIntegration: true } } },
    });

    try {
      const client = clientFor(message.provider, message.restaurant.whatsappIntegration);
      const { providerMessageId } = await client.send({
        to: message.toPhone,
        body: message.body,
        templateName: message.templateName,
        templateParams: Array.isArray(message.templateParams) ? (message.templateParams as string[]) : null,
      });
      await db.whatsAppMessage.update({
        where: { id },
        data: { status: "SENT", providerMessageId, sentAt: new Date(), error: null },
      });
      sent++;
    } catch (error) {
      const retryable = error instanceof ProviderError ? error.retryable : true;
      const giveUp = !retryable || message.attempts >= MAX_ATTEMPTS;
      const waitMs = 2 ** (message.attempts - 1) * 60_000;
      await db.whatsAppMessage.update({
        where: { id },
        data: {
          status: giveUp ? "FAILED" : "QUEUED",
          error: (error as Error).message.slice(0, 500),
          nextAttemptAt: new Date(Date.now() + waitMs),
        },
      });
      failed++;
      console.error(`[whatsapp] mensagem ${id} falhou (tentativa ${message.attempts}):`, (error as Error).message);
    }
  }
  return { sent, failed };
}
