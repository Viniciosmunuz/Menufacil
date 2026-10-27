"use server";

import { randomBytes } from "node:crypto";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { appUrl } from "@/lib/site";
import { requireAdmin } from "@/server/auth/dal";
import { iaConfigurada } from "@/server/ia/responder";
import {
  KapsoError,
  criarClienteKapso,
  criarLinkDeConexao,
  kapsoConfigurado,
  numeroDoCliente,
  registrarWebhook,
} from "@/server/ia/kapso";

import type { AdminFormState } from "../actions";

// O Menu Fácil IA, do lado do admin da plataforma.
//
// Três passos, cada um com seu botão, porque cada um depende de alguém:
//
// 1. **Gerar o link** -- o MenuFácil cria o restaurante na Kapso e um link
//    de conexão. O admin manda o link ao dono.
// 2. **Conferir a conexão** -- o dono abriu o link e conectou o WhatsApp
//    dele; aqui o número é buscado na Kapso e o aviso de mensagens é
//    registrado. Pergunta à Kapso em vez de confiar no que o navegador do
//    dono trouxe de volta.
// 3. **Ligar a IA** -- só depois de conectado. Conectar não liga nada
//    sozinho.

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
    const webhookId =
      atendente.kapsoWebhookId ??
      (await registrarWebhook({
        phoneNumberId: numero.phone_number_id,
        url: `${appUrl()}/api/kapso/webhook`,
        segredo,
      }));

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

export async function ligarIa(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const ligar = formData.get("ligar") === "1";

  const atendente = await db.atendenteIa.findUnique({ where: { restaurantId }, select: { phoneNumberId: true } });
  if (!atendente?.phoneNumberId) return { error: "Conecte o WhatsApp antes de ligar a IA." };
  if (ligar && !iaConfigurada()) return { error: "Falta configurar a chave da Anthropic (ANTHROPIC_API_KEY) na Vercel." };

  await db.atendenteIa.update({ where: { restaurantId }, data: { ativo: ligar } });
  refresh();
  return { ok: true, message: ligar ? "IA ligada: ela já responde as próximas mensagens." : "IA desligada." };
}

/**
 * Deixa a IA anotar pedido e mandar o Pix na conversa. Desligado, ela só
 * tira dúvidas e manda o link. É o admin quem decide: é o passo em que a
 * IA passa a mexer em pedido de verdade.
 */
export async function iaFazPedidos(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const ligar = formData.get("ligar") === "1";

  const atendente = await db.atendenteIa.findUnique({ where: { restaurantId }, select: { phoneNumberId: true } });
  if (!atendente?.phoneNumberId) return { error: "Conecte o WhatsApp antes." };

  await db.atendenteIa.update({ where: { restaurantId }, data: { fazPedidos: ligar } });
  refresh();
  return {
    ok: true,
    message: ligar ? "A IA agora pode anotar pedidos e mandar o Pix." : "A IA voltou a só tirar dúvidas e mandar o link.",
  };
}
