"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { audit } from "@/server/audit";
import { requireDono } from "@/server/auth/dal";
import { iaConfigurada } from "@/server/ia/responder";

export type EstadoDaAcao = { error?: string; message?: string };

/**
 * Os números que a IA nunca responde.
 *
 * O WhatsApp do restaurante costuma ser o celular do dono, e ali chega a
 * família dele. A lista inteira é gravada de uma vez: são poucos números,
 * e casar linha a linha não pagaria o trabalho.
 */
export async function salvarListas(
  _prev: EstadoDaAcao,
  formData: FormData,
): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(
    String(formData.get("restaurantId") ?? ""),
  );

  /** os números de um campo, só dígitos e sem repetir */
  function numerosDe(campo: string) {
    const fora: string[] = [];
    for (const bruto of formData.getAll(campo)) {
      const texto = String(bruto).trim();
      if (!texto) continue; // linha em branco é linha que ele desistiu de preencher
      const limpo = normalizePhone(texto);
      if (!/^55\d{10,11}$/.test(limpo)) throw new NumeroRuim(texto);
      if (!fora.includes(limpo)) fora.push(limpo);
    }
    return fora;
  }

  let ignorados: string[];
  let semEspera: string[];
  try {
    ignorados = numerosDe("ignorado");
    semEspera = numerosDe("teste");
  } catch (e) {
    if (e instanceof NumeroRuim)
      return { error: `"${e.texto}" não parece um número com DDD.` };
    throw e;
  }

  await db.atendenteIa.update({
    where: { restaurantId: restaurant.id },
    data: { ignorados, semEspera },
  });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.listas",
    details: {
      ignorados: ignorados.length,
      semEspera: semEspera.length,
      viaAdmin,
    },
  });
  refresh();
  return { message: "Listas salvas." };
}

/** um número que não dá para usar; o nome dele volta na mensagem de erro */
class NumeroRuim extends Error {
  constructor(readonly texto: string) {
    super("número inválido");
  }
}

/**
 * O dono liga ou desliga a IA do restaurante dele.
 *
 * Só depois que o admin conectou o WhatsApp: antes disso não há o que
 * ligar. O que a IA pode fazer (só dúvidas ou também pedidos) continua com
 * o admin.
 */
export async function ligarIaDoRestaurante(
  _prev: EstadoDaAcao,
  formData: FormData,
): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(
    String(formData.get("restaurantId") ?? ""),
  );
  const ligar = formData.get("ligar") === "1";

  const atendente = await db.atendenteIa.findUnique({
    where: { restaurantId: restaurant.id },
    select: { phoneNumberId: true, zapiChannelId: true },
  });
  // Vale por qualquer um dos dois caminhos: o número da Kapso ou o canal da
  // Z-API. Exigir só o da Kapso travava quem está na Z-API, que é por onde
  // a IA responde hoje.
  if (!atendente?.phoneNumberId && !atendente?.zapiChannelId)
    return {
      error:
        "O WhatsApp ainda não foi conectado. Fale com o suporte do MenuFácil.",
    };
  if (ligar && !iaConfigurada())
    return {
      error: "A IA ainda não está liberada. Fale com o suporte do MenuFácil.",
    };

  await db.atendenteIa.update({
    where: { restaurantId: restaurant.id },
    data: { ativo: ligar },
  });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: ligar ? "restaurant.ia.on" : "restaurant.ia.off",
    details: { viaAdmin },
  });
  refresh();
  return { message: ligar ? "IA ligada." : "IA desligada." };
}

/**
 * O dono decide se a IA pode anotar pedido.
 *
 * É o passo em que ela deixa de só conversar e passa a mexer em pedido de
 * verdade: ela monta pelos códigos do cardápio, o sistema calcula o preço,
 * e o pedido só nasce depois que o cliente responde "sim" ao resumo. O
 * pagamento continua sendo confirmado pelo restaurante ou pelo Mercado
 * Pago -- nunca por ela.
 */
export async function iaAnotaPedidos(
  _prev: EstadoDaAcao,
  formData: FormData,
): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(
    String(formData.get("restaurantId") ?? ""),
  );
  const ligar = formData.get("ligar") === "1";

  await db.atendenteIa.update({
    where: { restaurantId: restaurant.id },
    data: { fazPedidos: ligar },
  });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.pedidos",
    details: { ligado: ligar, viaAdmin },
  });
  refresh();
  return {
    message: ligar
      ? "Agora ela também anota pedidos e ajuda com o Pix."
      : "Ela voltou a só tirar dúvidas e mandar o link.",
  };
}

/**
 * O atendente no chat do cardápio.
 *
 * Não depende de WhatsApp nenhum: responde quem abriu o link do
 * restaurante, ali mesmo. Por isso é uma chave separada -- dá para ter um
 * sem o outro.
 */
export async function iaNoChatDoCardapio(
  _prev: EstadoDaAcao,
  formData: FormData,
): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(
    String(formData.get("restaurantId") ?? ""),
  );
  const ligar = formData.get("ligar") === "1";

  if (ligar && !iaConfigurada())
    return {
      error: "A IA ainda não está liberada. Fale com o suporte do MenuFácil.",
    };

  // Quem nunca mexeu na IA pode não ter registro, e o chat não depende de
  // conexão nenhuma para funcionar.
  await db.atendenteIa.upsert({
    where: { restaurantId: restaurant.id },
    update: { noChat: ligar },
    create: { restaurantId: restaurant.id, noChat: ligar, ignorados: [], semEspera: [] },
  });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.cardapio",
    details: { ligado: ligar, viaAdmin },
  });
  refresh();
  return {
    message: ligar
      ? 'Ligado: quem abrir o cardápio vê o botão "Tirar dúvida".'
      : "Desligado no cardápio.",
  };
}

/**
 * Apaga o que a IA lembra das conversas.
 *
 * Só a memória dela. Os pedidos, os clientes e as mensagens no WhatsApp do
 * restaurante ficam onde estão.
 *
 * Serve para duas coisas que acontecem direto: ela imita o que já falou, e
 * uma conversa que saiu torta se repete a cada "oi" enquanto estiver no
 * histórico; e, depois que alguém do restaurante responde pelo celular,
 * ela fica quieta meia hora naquela conversa -- apagar destrava na hora.
 */
export async function esquecerConversas(
  _prev: EstadoDaAcao,
  formData: FormData,
): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(
    String(formData.get("restaurantId") ?? ""),
  );

  const { count } = await db.iaMensagem.deleteMany({
    where: { restaurantId: restaurant.id },
  });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.esquecer",
    details: { mensagens: count, viaAdmin },
  });
  refresh();
  return {
    message:
      count > 0
        ? "Pronto: a próxima mensagem do cliente começa uma conversa nova."
        : "Não havia nada guardado.",
  };
}
