import { NextResponse, type NextRequest } from "next/server";

import { atender, type MensagemKapso } from "@/server/ia/atender";

/**
 * O que a Z-API avisa quando chega mensagem no WhatsApp do restaurante.
 *
 * Esta rota é só um tradutor: ela pega o envelope `NEW_MESSAGE` da Z-API,
 * monta o formato que o `atender()` já entende e sai da frente. Todo o
 * resto -- as travas de silêncio, o teto por hora, o histórico, os
 * pedidos -- continua no mesmo lugar, sem saber que o provedor mudou.
 *
 * **Por que a Z-API e não a Kapso:** a conta de negócio está proibida
 * pela Meta de mandar mensagem para números brasileiros (erro 130497).
 * Receber passava, enviar não, e a recusa era calada. A Z-API conecta o
 * número por QR code, sem Meta no meio.
 *
 * O payload desta versão (Omni) é diferente do da Z-API clássica:
 *
 *     { messageEventType: "NEW_MESSAGE",
 *       message: { _id, channel_id, metadata: { from_me }, sender, recipient,
 *                  contents: [{ type: "TEXT", message }] } }
 *
 * Documentação: https://developer.omni.z-api.io/webhooks/payloads
 */

export const runtime = "nodejs";
export const maxDuration = 60;

type Conteudo = { type?: string; message?: string };
type AvisoOmni = {
  messageEventType?: string;
  message?: {
    _id?: string;
    channel_id?: string;
    metadata?: { from_me?: boolean; from_api?: boolean; middleware?: string };
    sender?: { identifier?: string; name?: string };
    recipient?: { identifier?: string; name?: string };
    contents?: Conteudo[];
  };
};

/** só dígitos: o identifier vem com DDI, mas às vezes com sinal ou espaço */
const soDigitos = (v: string) => v.replace(/\D/g, "");

export async function POST(request: NextRequest) {
  let aviso: AvisoOmni;
  try {
    aviso = (await request.json()) as AvisoOmni;
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const m = aviso.message;

  // Registra TUDO que chega, antes de qualquer filtro.
  //
  // A primeira versão saía calada quando o envelope não era o esperado, e
  // o resultado no log era idêntico a "a Z-API nunca chamou" -- o mesmo
  // buraco que escondeu o 130497 da Meta por dias. Aqui o que entra
  // aparece, mesmo (principalmente) quando não é o que eu previa.
  const chaves = Object.keys(aviso).join(",");
  console.info(
    `[zapi/webhook] evento=${aviso.messageEventType ?? "(sem messageEventType)"} chaves=${chaves}`,
  );

  if (aviso.messageEventType !== "NEW_MESSAGE" || !m?.channel_id) {
    // status de entrega, conexão e afins não interessam à IA -- mas o
    // corpo vai para o log, porque é a única forma de descobrir o formato
    // real de um evento que a documentação não mostra.
    console.info(`[zapi/webhook] ignorado. corpo: ${JSON.stringify(aviso).slice(0, 700)}`);
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const daCasa = Boolean(m.metadata?.from_me);

  // Quem é o cliente: numa mensagem recebida é quem enviou; numa enviada
  // pelo restaurante é quem recebeu. É o mesmo contato dos dois lados da
  // conversa, e é por ele que o histórico se organiza.
  //
  // A documentação não traz exemplo de mensagem recebida -- o payload de
  // exemplo é de uma saída. Por isso o registro cru abaixo: a primeira
  // mensagem de verdade confirma (ou desmente) esta leitura.
  const bruto = daCasa ? m.recipient?.identifier : m.sender?.identifier;
  const telefone = bruto ? soDigitos(bruto) : "";

  const texto = m.contents?.find((c) => c.type === "TEXT")?.message ?? "";
  const tipo = m.contents?.[0]?.type?.toLowerCase() ?? "text";

  console.info(
    `[zapi/webhook] ${daCasa ? "saiu" : "chegou"} em …${telefone.slice(-4)} (${tipo})` +
      (telefone ? "" : ` · sem telefone, payload: ${JSON.stringify(m).slice(0, 400)}`),
  );

  if (!telefone) return NextResponse.json({ ok: true, ignorado: true });

  // o formato que o atender() já fala; `zapi_channel_id` é o que diz a ele
  // para achar o restaurante pelo canal e responder pela Z-API
  const evento: MensagemKapso = {
    zapi_channel_id: m.channel_id,
    message: {
      id: m._id,
      // o atender distingue texto de mídia por este campo
      type: tipo === "text" ? "text" : tipo,
      from: telefone,
      text: { body: texto },
      kapso: {
        direction: daCasa ? "outbound" : "inbound",
        // Saiu do aparelho do restaurante e não foi a própria IA: é uma
        // pessoa respondendo, e é isso que faz a IA ficar quieta por 30
        // minutos naquela conversa.
        origin: daCasa && !m.metadata?.from_api ? "business_app" : "api",
      },
    },
    conversation: { phone_number: telefone },
  };

  try {
    await atender(evento);
  } catch (erro) {
    // 200 de propósito: a Z-API repete o aviso em caso de erro, e repetir
    // uma mensagem já respondida é pior do que perder o aviso.
    console.error("[zapi/webhook] falha ao atender:", erro);
  }

  return NextResponse.json({ ok: true });
}
