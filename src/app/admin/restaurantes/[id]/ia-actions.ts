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
import { apontarWebhook, estadoDaInstancia } from "@/server/ia/uazapi";

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

/**
 * Liga este restaurante a uma instância da uazapi.
 *
 * O terceiro caminho, e o mais barato por número: a Z-API cobra por
 * canal (cerca de R$ 100, o preço do plano Essencial inteiro) e a uazapi
 * cobra por servidor -- até 100 números por R$ 138. Para um sistema que
 * é vendido a restaurantes, é a diferença entre poder oferecer a Lia a
 * todo cliente e não poder.
 *
 * **O token faz dois trabalhos.** É a credencial de envio e é o que o
 * webhook usa para descobrir de qual restaurante é a mensagem: a uazapi
 * manda esse mesmo token no corpo de cada aviso. Achar o restaurante por
 * ele é, ao mesmo tempo, provar que o aviso é legítimo -- quem não sabe
 * o token não consegue se passar por ninguém numa rota que é pública.
 *
 * Diferente da Z-API, aqui o webhook é apontado **daqui mesmo**, junto
 * com os filtros que descartam mensagem de grupo antes de ela sair do
 * servidor deles. Ninguém precisa abrir o painel da uazapi para
 * configurar nada, e por isso ninguém esquece.
 */
export async function salvarContaUazapi(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const baseUrl = String(formData.get("baseUrl") ?? "").trim().replace(/\/+$/, "");
  const token = String(formData.get("token") ?? "").trim();
  const instancia = String(formData.get("instancia") ?? "").trim();

  // Apagar os dois campos é como desligar: o restaurante volta para o
  // canal que tiver sobrado (Z-API ou Kapso).
  if (!baseUrl && !token) {
    await db.atendenteIa.update({
      where: { restaurantId },
      data: { uazapiBaseUrl: null, uazapiToken: null, uazapiInstancia: null },
    }).catch(() => null);
    refresh();
    return { ok: true, message: "Conta da uazapi removida." };
  }

  if (!baseUrl || !token) {
    return { error: "Preencha os dois: o servidor e o token da instância." };
  }
  // Endereço errado aqui vira mensagem que não sai e webhook que nunca
  // chega, sem nada no log explicando. Melhor barrar na hora de colar.
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(baseUrl)) {
    return { error: "O servidor deve ser o endereço https da sua instância, como https://abc.uazapi.com." };
  }

  // Dois restaurantes na mesma instância responderiam um pelo outro: o
  // banco barra pelo índice único, e aqui a mensagem explica o porquê.
  const jaUsado = await db.atendenteIa.findFirst({
    where: { uazapiToken: token, NOT: { restaurantId } },
    select: { restaurant: { select: { name: true } } },
  });
  if (jaUsado) {
    return { error: `Essa instância já está em ${jaUsado.restaurant.name}. Cada restaurante precisa do próprio WhatsApp.` };
  }

  // Fala com a uazapi **antes** de gravar.
  //
  // Token errado guardado é o pior dos mundos: a tela diz "salvo", o
  // dono liga a IA, e as mensagens somem sem erro nenhum à vista. Uma
  // chamada de verdade agora troca isso por uma mensagem clara aqui.
  const conta = { baseUrl, token };
  let estado: string | null = null;
  try {
    estado = await estadoDaInstancia(conta);
  } catch (erro) {
    console.error("[admin] uazapi não respondeu:", erro);
    return { error: "Não consegui falar com a uazapi: confira o servidor e o token." };
  }
  if (estado === null) {
    return { error: "A uazapi recusou essas credenciais: confira o servidor e o token." };
  }

  try {
    await apontarWebhook({ conta, url: `${appUrl()}/api/uazapi/webhook` });
  } catch (erro) {
    console.error("[admin] falha ao apontar o webhook da uazapi:", erro);
    return { error: "As credenciais valem, mas não consegui apontar o webhook. Tente de novo." };
  }

  await db.atendenteIa.upsert({
    where: { restaurantId },
    update: { uazapiBaseUrl: baseUrl, uazapiToken: token, uazapiInstancia: instancia || null },
    create: {
      restaurantId,
      uazapiBaseUrl: baseUrl,
      uazapiToken: token,
      uazapiInstancia: instancia || null,
      ignorados: [],
      semEspera: [],
    },
  });
  refresh();

  const conectada = estado === "connected";
  return {
    ok: true,
    message: conectada
      ? "Conta da uazapi salva e webhook apontado. O WhatsApp está conectado."
      : `Conta salva e webhook apontado. O WhatsApp está "${estado}": leia o QR code no painel da uazapi.`,
  };
}

/**
 * Solta este restaurante do número da Kapso.
 *
 * **Não desconecta nada lá.** O número continua vivo na conta da Kapso;
 * o que isto apaga é o vínculo com este restaurante, para ele poder ser
 * conectado por outro caminho. Para voltar, é só gerar outro link de
 * conexão aqui mesmo.
 *
 * Existe porque o caminho da Kapso virou um beco: a Meta recusa o envio
 * desta conta para números brasileiros (erro 130497), então um
 * restaurante preso nela recebe mensagem e não consegue responder. Pior,
 * para o sistema ele conta como conectado -- e por isso a tela de
 * conectar pelo QR code não aparecia para o dono.
 */
export async function desconectarKapso(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const restaurantId = String(formData.get("restaurantId") ?? "");

  await db.atendenteIa.update({
    where: { restaurantId },
    data: {
      phoneNumberId: null,
      linkDeConexao: null,
      numeroExibido: null,
      // o webhook registrado lá não vale mais para este restaurante; se
      // ele voltar para a Kapso, é registrado de novo
      kapsoWebhookId: null,
    },
  });
  refresh();
  return {
    ok: true,
    message: "Número da Kapso solto. O dono já pode conectar o WhatsApp pelo QR code no painel dele.",
  };
}
