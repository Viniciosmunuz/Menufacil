import { after, NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
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
export const maxDuration = 300;

type Conteudo = { type?: string; "@class"?: string; message?: string };
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
  // Nada daqui devolve erro para a Z-API.
  //
  // O 400 que estava aqui custou caro: ela conta falha seguida, manda
  // e-mail de "seu webhook continua falhando" e acaba suspendendo a
  // entrega -- e aí mensagem de cliente para de chegar, sem nada no nosso
  // log, porque a chamada nem acontece. Dez falhas seguidas em 10/11/2026.
  //
  // O que não dá para ler vira registro e 200. Entender o corpo é problema
  // nosso; para ela, recebemos.
  let aviso: AvisoOmni;
  const cru = await request.text();
  try {
    aviso = JSON.parse(cru) as AvisoOmni;
  } catch {
    console.warn(
      `[zapi/webhook] corpo que não é JSON (${request.headers.get("content-type") ?? "sem content-type"}, ${cru.length} letras): ${cru.slice(0, 500)}`,
    );
    return NextResponse.json({ ok: true, ignorado: "corpo ilegível" });
  }
  if (!aviso || typeof aviso !== "object") {
    console.warn(`[zapi/webhook] corpo JSON que não é objeto: ${cru.slice(0, 200)}`);
    return NextResponse.json({ ok: true, ignorado: "corpo inesperado" });
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

  // O que manda é ter uma mensagem com canal, e não o nome do evento.
  //
  // A documentação promete um envelope `messageEventType: "NEW_MESSAGE"`.
  // O que a Z-API envia de verdade não tem esse campo -- só `message` --,
  // e exigi-lo fazia o webhook descartar justamente as mensagens dos
  // clientes. Confirmado em 10/11/2026, com o payload no log.
  if (!m?.channel_id) {
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

  // O tipo do conteúdo vem de dois jeitos.
  //
  // A documentação mostra `type: "TEXT"`; o que chega de verdade traz
  // `"@class": ".TextContent"` (e `.ImageContent`, `.AudioContent` e por
  // aí). Ler só um dos dois deixava o texto vazio, e mensagem sem texto a
  // IA não responde -- o erro ficava parecendo "ela não quis responder".
  const conteudo = m.contents?.[0];
  const classe = conteudo?.["@class"]?.replace(/^\.|Content$/g, "").toLowerCase();
  const tipo = (conteudo?.type ?? classe ?? "text").toLowerCase();
  const texto =
    m.contents?.find((c) => typeof c.message === "string" && c.message.trim())?.message ?? "";

  // Recibo de entrega não é mensagem.
  //
  // A Z-API manda `.DeliveryCallback` e `.MessageStatusCallback` pelo
  // mesmo webhook das mensagens, e eles vêm com `from_me: true` -- quer
  // dizer "a sua mensagem foi entregue", não "alguém digitou algo". Sem
  // este filtro, cada resposta da IA gerava dois recibos, o atendimento
  // os lia como o dono respondendo pelo celular e acionava o silêncio de
  // 30 minutos. Resultado: a IA respondia a primeira mensagem e emudecia
  // pela meia hora seguinte.
  //
  // Sai antes do registro, e não depois: cada resposta da IA gera uma
  // dezena deles, e com o payload inteiro no log o que importa -- a
  // mensagem do cliente -- fica soterrado.
  if (tipo.includes("callback") || tipo.includes("status")) {
    return NextResponse.json({ ok: true, ignorado: "recibo" });
  }

  console.info(
    `[zapi/webhook] ${daCasa ? "saiu" : "chegou"} em …${telefone.slice(-4)} (${tipo})` +
      (telefone ? "" : ` · sem telefone, payload: ${JSON.stringify(m).slice(0, 400)}`),
  );

  if (!telefone) return NextResponse.json({ ok: true, ignorado: true });

  // Cada aviso é tratado uma vez só.
  //
  // A Z-API reenvia o que ela achar que não foi entregue, e sem isto a
  // mesma mensagem entraria duas vezes no histórico -- e seria respondida
  // duas vezes. A chave é o id da mensagem; sem ele, deixa passar, porque
  // perder uma mensagem é pior do que repetir uma.
  if (m._id) {
    try {
      const { count } = await db.iaEventoProcessado.createMany({
        data: [{ chave: `zapi:${m._id}` }],
        skipDuplicates: true,
      });
      if (count === 0) return NextResponse.json({ ok: true, repetido: true });
    } catch (erro) {
      // Banco fora do ar não pode virar falha de webhook: a Z-API conta e
      // suspende a entrega. Sem a trava, o risco é responder duas vezes à
      // mesma mensagem -- incômodo, e muito menos grave que emudecer.
      console.error("[zapi/webhook] falha ao marcar o evento como visto:", erro);
    }
  }

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

  // Responde 200 na hora e pensa depois, como o aviso da Kapso.
  //
  // A Z-API desiste de esperar e reenvia o aviso; a IA leva alguns
  // segundos -- e passou a levar mais desde que pensa antes de responder.
  // Segurar a conexão até ela terminar fazia a mesma mensagem chegar duas
  // vezes, ou a resposta não sair de jeito nenhum.
  after(async () => {
    const comecou = Date.now();
    try {
      await atender(evento);
    } catch (erro) {
      // nada daqui volta para a Z-API: o 200 já foi. Fica no log, e a
      // conversa fica com o dono, que a vê no celular.
      console.error("[zapi/webhook] falha ao atender:", erro);
    }
    // quanto a IA levou: é o número que diz se ela está perto do limite da
    // função, e esse limite some sem erro nenhum no log
    console.info(`[zapi/webhook] atendimento em ${Date.now() - comecou}ms`);
  });

  return NextResponse.json({ ok: true });
}

/**
 * A Z-API às vezes bate aqui só para ver se o endereço responde.
 *
 * Sem este handler o Next devolve 405, que para ela é falha igual às
 * outras: dez seguidas e a entrega é suspensa. Responder "estou aqui" não
 * custa nada e não conta nada.
 */
export async function GET() {
  return NextResponse.json({ ok: true, webhook: "zapi" });
}
