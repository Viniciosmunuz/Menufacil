"use server";

import { randomBytes } from "node:crypto";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { appUrl } from "@/lib/site";
import { requireAdmin } from "@/server/auth/dal";
import {
  KapsoError,
  criarClienteKapso,
  criarLinkDeConexao,
  kapsoConfigurado,
  numeroDoCliente,
  atualizarEventosDoWebhook,
  registrarWebhook,
} from "@/server/ia/kapso";

import type { AdminFormState } from "../actions";

// O Menu Fácil IA, do lado do admin da plataforma.
//
// Só a conexão do WhatsApp, que é o que o dono não tem como fazer: ela
// passa por uma conta da plataforma, a Kapso ou a Z-API. Ligar a IA,
// deixá-la anotar pedidos, responder no cardápio e apagar o que ela lembra
// são decisões do dia a dia do restaurante, e moram no painel do dono.
//
// A chave que libera tudo isso é a de Recursos (`iaEnabled`), ao lado das
// outras: desligada, o dono nem vê a seção.
//
// Pela Kapso são dois passos, porque o do meio é com o dono: o admin gera
// o link e manda; o dono abre, entra com o Facebook e conecta; o admin
// confere. Conferir pergunta à Kapso em vez de confiar no que o navegador
// do dono trouxe de volta.

function falha(erro: unknown): AdminFormState {
  if (erro instanceof KapsoError) return { error: erro.message };
  console.error("[ia] falha no admin:", erro);
  return { error: "Algo deu errado. Tente de novo em instantes." };
}

export async function gerarLinkDaIa(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const restaurantId = String(formData.get("restaurantId") ?? "");
  if (!kapsoConfigurado()) return { error: "Falta configurar a chave da Kapso (KAPSO_API_KEY) na Vercel." };

  const restaurante = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { name: true } });
  if (!restaurante) return { error: "Restaurante não encontrado." };

  try {
    const atual = await db.atendenteIa.upsert({
      where: { restaurantId },
      create: { restaurantId },
      update: {},
      select: { kapsoCustomerId: true },
    });

    const customerId =
      atual.kapsoCustomerId ?? (await criarClienteKapso({ nome: restaurante.name, restaurantId }));

    // o dono volta para uma página que só diz "pronto": ele não tem acesso
    // ao admin, e a conexão é conferida aqui, pela Kapso, não pelo retorno
    const link = await criarLinkDeConexao({ customerId, voltarPara: `${appUrl()}/whatsapp-conectado` });

    await db.atendenteIa.update({
      where: { restaurantId },
      data: { kapsoCustomerId: customerId, linkDeConexao: link.url },
    });
  } catch (erro) {
    return falha(erro);
  }

  refresh();
  return { ok: true, message: "Link gerado. Mande para o dono do restaurante." };
}

export async function conferirConexaoDaIa(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const restaurantId = String(formData.get("restaurantId") ?? "");

  const atendente = await db.atendenteIa.findUnique({
    where: { restaurantId },
    select: { kapsoCustomerId: true, kapsoWebhookId: true, segredoWebhook: true },
  });
  if (!atendente?.kapsoCustomerId) return { error: "Gere o link de conexão primeiro." };

  try {
    const numero = await numeroDoCliente(atendente.kapsoCustomerId);
    if (!numero) return { error: "O dono ainda não terminou de conectar o WhatsApp pelo link." };

    // Segredo novo só na primeira vez: trocar depois faria os avisos já
    // assinados com o antigo pararem de passar.
    const segredo = atendente.segredoWebhook ?? randomBytes(32).toString("hex");
    let webhookId = atendente.kapsoWebhookId;
    if (webhookId) {
      // Já conectado: só garante que ele assina os avisos de hoje. Um número
      // ligado antes de um aviso novo ficaria sem ele para sempre.
      await atualizarEventosDoWebhook({ phoneNumberId: numero.phone_number_id, webhookId });
    } else {
      webhookId = await registrarWebhook({
        phoneNumberId: numero.phone_number_id,
        url: `${appUrl()}/api/kapso/webhook`,
        segredo,
      });
    }

    await db.atendenteIa.update({
      where: { restaurantId },
      data: {
        phoneNumberId: numero.phone_number_id,
        numeroExibido: numero.display_phone_number,
        segredoWebhook: segredo,
        kapsoWebhookId: webhookId,
        conectadoEm: new Date(),
      },
    });
  } catch (erro) {
    return falha(erro);
  }

  refresh();
  return { ok: true, message: "WhatsApp conectado. A IA continua desligada até você ligar." };
}

/**
 * Liga este restaurante a um canal da Z-API (WhatsApp Web, por QR code).
 *
 * O canal é criado e pareado no painel da Z-API -- aquela plataforma não
 * deixa criar canal de QR code pela API, só os oficiais da Meta. Aqui o
 * admin só cola o ID do canal já conectado, e é por ele que o webhook
 * descobre de qual restaurante é a mensagem que chegou.
 *
 * Enquanto esse campo estiver vazio, o restaurante continua no caminho da
 * Kapso (que a Meta recusa, erro 130497). Preenchido, tanto o recebimento
 * quanto a resposta passam pela Z-API.
 */
export async function salvarCanalZapi(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const canal = String(formData.get("canal") ?? "").trim();

  if (canal && !/^[A-Za-z0-9-]{8,64}$/.test(canal)) {
    return { error: "O ID do canal não parece certo: use o valor copiado do painel da Z-API." };
  }

  // Dois restaurantes no mesmo canal responderiam um pelo outro: o banco
  // barra pelo índice único, e aqui a mensagem explica o porquê.
  if (canal) {
    const jaUsado = await db.atendenteIa.findFirst({
      where: { zapiChannelId: canal, NOT: { restaurantId } },
      select: { restaurant: { select: { name: true } } },
    });
    if (jaUsado) {
      return { error: `Esse canal já está em ${jaUsado.restaurant.name}. Cada restaurante precisa do próprio WhatsApp.` };
    }
  }

  await db.atendenteIa.upsert({
    where: { restaurantId },
    update: { zapiChannelId: canal || null },
    create: { restaurantId, zapiChannelId: canal || null, ignorados: [], semEspera: [] },
  });
  refresh();
  return {
    ok: true,
    message: canal
      ? "Canal da Z-API salvo. Aponte o webhook dele para /api/zapi/webhook no painel da Z-API."
      : "Canal da Z-API removido.",
  };
}

