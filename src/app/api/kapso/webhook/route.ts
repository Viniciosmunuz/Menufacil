import { createHmac, timingSafeEqual } from "node:crypto";

import { after, NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { atender, type MensagemKapso } from "@/server/ia/atender";

// Os avisos da Kapso: uma mensagem chegou no WhatsApp de um restaurante, ou
// saiu dele.
//
// Mesmo desenho do aviso do Mercado Pago:
//
// - **A assinatura é conferida antes de tudo.** Cada número tem o próprio
//   segredo, guardado só no servidor; um aviso forjado não passa daqui.
// - **Responde 200 na hora e pensa depois** (`after`). A Kapso desiste em 10
//   segundos e reenvia; a IA pode levar alguns segundos para responder, e
//   esperar por ela aqui faria cada mensagem chegar em dobro.
// - **Cada aviso é tratado uma vez só.** A chave de idempotência da Kapso
//   fica registrada; o reenvio de um aviso já tratado é respondido com 200 e
//   ignorado.

export const maxDuration = 60;

function assinaturaConfere(corpo: string, recebida: string | null, segredo: string) {
  if (!recebida) return false;
  const esperada = createHmac("sha256", segredo).update(corpo).digest("hex");
  const a = Buffer.from(esperada, "utf8");
  const b = Buffer.from(recebida.trim(), "utf8");
  // timingSafeEqual exige o mesmo tamanho; tamanho diferente já é falso
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  // a assinatura é sobre o corpo bruto: ler como texto antes de interpretar
  const corpo = await request.text();

  let dados: unknown;
  try {
    dados = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  // Com agrupamento ligado o aviso vem em lista; registramos sem
  // agrupamento, mas aceitar os dois formatos não custa nada.
  const eventos = (Array.isArray(dados) ? dados : [dados]) as MensagemKapso[];
  const phoneNumberId = eventos[0]?.phone_number_id;
  if (!phoneNumberId) return NextResponse.json({ ok: true });

  const atendente = await db.atendenteIa.findUnique({
    where: { phoneNumberId },
    select: { segredoWebhook: true },
  });
  // número que não é de nenhum restaurante nosso: não há o que conferir
  if (!atendente?.segredoWebhook) return NextResponse.json({ error: "número desconhecido" }, { status: 404 });

  if (!assinaturaConfere(corpo, request.headers.get("x-webhook-signature"), atendente.segredoWebhook)) {
    console.warn("[kapso] aviso com assinatura que não confere; ignorado");
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  const evento = request.headers.get("x-webhook-event");
  if (evento !== "whatsapp.message.received" && evento !== "whatsapp.message.sent") {
    return NextResponse.json({ ok: true });
  }

  // a chave da Kapso, ou o id da mensagem quando ela não vier
  const chave = request.headers.get("x-idempotency-key") ?? eventos.map((e) => e.message?.id).join(",");
  if (chave) {
    // nenhuma linha criada = a chave já estava lá = aviso repetido
    const { count } = await db.iaEventoProcessado.createMany({ data: [{ chave }], skipDuplicates: true });
    if (count === 0) return NextResponse.json({ ok: true, repetido: true });
  }

  after(async () => {
    for (const e of eventos) {
      try {
        await atender(e);
      } catch (erro) {
        // nada daqui volta para a Kapso: o 200 já foi. Fica no log, e a
        // conversa fica com o dono, que a vê no celular.
        console.error("[ia] falha ao atender uma mensagem:", erro);
      }
    }

    // De vez em quando, esquece os avisos antigos: a Kapso só reenvia por
    // alguns segundos, então guardar mais que uns dias não serve a nada.
    if (Math.random() < 0.02) {
      await db.iaEventoProcessado
        .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60_000) } } })
        .catch(() => {});
    }
  });

  return NextResponse.json({ ok: true });
}
