"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { audit } from "@/server/audit";
import { requireDono } from "@/server/auth/dal";
import { falasDaConversa, type Fala } from "@/server/ia/conversas";
import { iaConfigurada } from "@/server/ia/responder";
import {
  apontarWebhook,
  conferirPareamento,
  criarInstancia,
  pedirQrCode,
  servidorDaConta,
  type Pareamento,
} from "@/server/ia/uazapi";
import { appUrl } from "@/lib/site";

export type EstadoDaAcao = { error?: string; message?: string };

/**
 * O que foi dito numa conversa, quando o dono abre a gaveta.
 *
 * Carregada só ao tocar, e não junto com a página: a lista traz até 60
 * conversas, e trazer as mensagens de todas elas de uma vez seria pagar
 * caro por um texto que quase sempre não vai ser lido.
 */
export async function verConversa(
  restaurantId: string,
  contato: string,
): Promise<{ falas: Fala[]; error?: string }> {
  // `requireDono` é o que impede alguém de ler a conversa de outro
  // restaurante trocando o id na chamada -- esta ação recebe argumentos
  // soltos, e não um formulário que a página montou.
  const { restaurant } = await requireDono(restaurantId);
  return { falas: await falasDaConversa(restaurant.id, contato) };
}

/**
 * Põe ou tira um número de uma das listas, direto da conversa.
 *
 * O mesmo que o dono faria digitando lá em cima; a diferença é que aqui
 * ele está vendo o que a pessoa escreveu quando decide. Alterna: tocar de
 * novo no que já está marcado tira da lista.
 */
export async function marcarNaLista(
  restaurantId: string,
  telefone: string,
  lista: "ignorado" | "teste",
): Promise<EstadoDaAcao & { ignorados?: string[]; semEspera?: string[] }> {
  const { restaurant, user, viaAdmin } = await requireDono(restaurantId);

  const numero = normalizePhone(telefone);
  if (!/^55\d{10,11}$/.test(numero))
    return { error: "Essa conversa não tem um número de telefone." };

  const atendente = await db.atendenteIa.findUnique({
    where: { restaurantId: restaurant.id },
    select: { ignorados: true, semEspera: true },
  });
  if (!atendente) return { error: "A IA ainda não foi configurada." };

  const campo = lista === "ignorado" ? "ignorados" : "semEspera";
  const atual = atendente[campo];
  const tinha = atual.includes(numero);
  const nova = tinha ? atual.filter((n) => n !== numero) : [...atual, numero];

  const salvo = await db.atendenteIa.update({
    where: { restaurantId: restaurant.id },
    data: { [campo]: nova },
    select: { ignorados: true, semEspera: true },
  });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.listas",
    details: { lista: campo, tirou: tinha, daConversa: true, viaAdmin },
  });
  refresh();

  const nome = lista === "ignorado" ? "quem a IA não responde" : "números de teste";
  return {
    message: tinha ? `Tirado de ${nome}.` : `Na lista de ${nome}.`,
    ignorados: salvo.ignorados,
    semEspera: salvo.semEspera,
  };
}

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
    select: { phoneNumberId: true, zapiChannelId: true, uazapiToken: true },
  });
  // Vale por qualquer um dos três caminhos: o número da Kapso, o canal
  // da Z-API ou a instância da uazapi. Exigir só o da Kapso travava quem
  // está nos outros -- que é por onde a IA responde hoje.
  if (!atendente?.phoneNumberId && !atendente?.zapiChannelId && !atendente?.uazapiToken)
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

/** o que a tela de conexão recebe de volta */
export type EstadoDaConexao = Pareamento & { error?: string };

/**
 * O WhatsApp do restaurante, conectado pelo próprio dono.
 *
 * Até aqui conectar um número era uma conversa com o suporte: alguém do
 * MenuFácil criava o canal no painel do provedor, lia o QR e colava o
 * identificador no admin. Para dois restaurantes isso vai; para vender,
 * não -- é uma pessoa por cliente novo, e o cliente espera.
 *
 * Agora o sistema cria a instância na uazapi, aponta o webhook e
 * devolve o QR code para o dono ler ali mesmo. A Kapso e a Z-API
 * continuam sendo conectadas pelo admin: naquelas o canal é criado à
 * mão no painel do provedor, e não há API de QR code para automatizar.
 *
 * **Só cria uma vez.** Cada instância ocupa um lugar no plano da
 * uazapi: se o restaurante já tem a sua, esta ação reusa o token e só
 * pede um QR novo. Sem isso, cada toque no botão gastaria um número do
 * pacote e deixaria uma instância órfã que ninguém lembra de apagar.
 */
export async function conectarWhatsapp(restaurantId: string): Promise<EstadoDaConexao> {
  const vazio = { qrcode: null, paircode: null, conectado: false, status: null };
  // recebe o id solto, e não um formulário: é o `requireDono` que impede
  // alguém de conectar um WhatsApp no restaurante de outro
  const { restaurant, user } = await requireDono(restaurantId);

  if (!restaurant.iaEnabled) {
    return { ...vazio, error: "O Menu Fácil IA não está liberado para este restaurante." };
  }
  if (!servidorDaConta()) {
    console.error("[ia] conectar pedido sem UAZAPI_SERVER/UAZAPI_ADMIN_TOKEN no ambiente");
    return { ...vazio, error: "A conexão por aqui ainda não está disponível. Fale com o suporte do MenuFácil." };
  }

  const atendente = await db.atendenteIa.findUnique({
    where: { restaurantId: restaurant.id },
    select: { uazapiBaseUrl: true, uazapiToken: true, phoneNumberId: true, zapiChannelId: true },
  });

  // Já está em outro caminho: não oferece este. Dois provedores no mesmo
  // restaurante não se somam -- o segundo roubaria as mensagens do
  // primeiro, e o dono acharia que a IA ficou maluca.
  if (atendente?.phoneNumberId || atendente?.zapiChannelId) {
    return { ...vazio, error: "Este restaurante já está conectado por outro caminho. Fale com o suporte." };
  }

  let conta = atendente?.uazapiBaseUrl && atendente?.uazapiToken
    ? { baseUrl: atendente.uazapiBaseUrl, token: atendente.uazapiToken }
    : null;

  if (!conta) {
    const criada = await criarInstancia({
      // o nome é o que aparece no painel da uazapi: sem o id, duas
      // hamburguerias com o mesmo nome viram um palpite
      nome: `${restaurant.name} (${restaurant.id.slice(-6)})`,
      sistema: "MenuFácil",
    });
    if (!criada) {
      return { ...vazio, error: "Não consegui criar a conexão agora. Tente de novo em alguns minutos." };
    }
    conta = criada.conta;

    // Grava **antes** de pedir o QR.
    //
    // A instância já existe e já custa um lugar no plano: se a gravação
    // ficasse para depois e o pedido do QR falhasse, ela viraria órfã --
    // viva no servidor da uazapi e desconhecida aqui, e o próximo toque
    // no botão criaria outra.
    await db.atendenteIa.upsert({
      where: { restaurantId: restaurant.id },
      update: { uazapiBaseUrl: conta.baseUrl, uazapiToken: conta.token, uazapiInstancia: criada.nome },
      create: {
        restaurantId: restaurant.id,
        uazapiBaseUrl: conta.baseUrl,
        uazapiToken: conta.token,
        uazapiInstancia: criada.nome,
        ignorados: [],
        semEspera: [],
      },
    });

    // O webhook e os filtros de grupo, apontados por nós. Se falhar, a
    // conexão até acontece, mas nada chega -- então é erro, e não aviso.
    try {
      await apontarWebhook({ conta, url: `${appUrl()}/api/uazapi/webhook` });
    } catch (erro) {
      console.error("[ia] falha ao apontar o webhook da uazapi:", erro);
      return { ...vazio, error: "A conexão foi criada, mas algo falhou. Tente de novo." };
    }

    await audit({
      actorUserId: user.id,
      restaurantId: restaurant.id,
      action: "restaurant.ia.whatsapp",
      details: { instancia: criada.nome, provedor: "uazapi" },
    }).catch(() => null);
  }

  const pareamento = await pedirQrCode(conta);
  if (!pareamento) {
    return { ...vazio, error: "Não consegui gerar o QR Code agora. Tente de novo." };
  }
  if (pareamento.conectado) refresh();
  return pareamento;
}

/**
 * O QR já foi lido?
 *
 * A tela pergunta de poucos em poucos segundos enquanto o dono está com
 * o celular na mão. O QR da uazapi morre em menos de um minuto, então a
 * resposta traz o código novo junto quando ele troca -- senão o dono
 * leria um código morto e acharia que o sistema está quebrado.
 */
export async function conferirWhatsapp(restaurantId: string): Promise<EstadoDaConexao> {
  const vazio = { qrcode: null, paircode: null, conectado: false, status: null };
  const { restaurant } = await requireDono(restaurantId);

  const atendente = await db.atendenteIa.findUnique({
    where: { restaurantId: restaurant.id },
    select: { uazapiBaseUrl: true, uazapiToken: true },
  });
  if (!atendente?.uazapiBaseUrl || !atendente.uazapiToken) return vazio;

  const pareamento = await conferirPareamento({
    baseUrl: atendente.uazapiBaseUrl,
    token: atendente.uazapiToken,
  });
  if (!pareamento) return vazio;

  // Conectou: a página precisa ser montada de novo, porque com WhatsApp
  // aparecem a chave de ligar a IA e a de anotar pedidos.
  if (pareamento.conectado) refresh();
  return pareamento;
}
