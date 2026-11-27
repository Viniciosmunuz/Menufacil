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
  LIMITE_DE_INSTANCIAS,
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
 * "Eu assumi esta conversa", para todos os aparelhos do restaurante.
 *
 * Mora no banco e não no navegador de propósito, e foi ele quem pediu
 * assim: com a marca no aparelho, quem atende pelo computador do balcão
 * deixa o cartão vermelho no celular de quem está na rua, e os dois
 * respondem o mesmo cliente.
 *
 * Grava o nome de quem marcou junto. Numa casa onde a conta do painel é
 * a mesma para todo mundo isso não diz muita coisa; onde há login por
 * pessoa, diz quem já está cuidando -- que é a razão de existir disto.
 *
 * Um registro por conversa, atualizado no lugar: não é histórico, é o
 * estado de agora. E não precisa desfazer: a marca vale só até a
 * próxima mensagem do cliente, e aí o vermelho volta sozinho.
 */
export async function marcarAtendida(restaurantId: string, contato: string): Promise<void> {
  const { restaurant, user } = await requireDono(restaurantId);
  const quem = user.name.trim() || null;

  await db.iaConversaAtendida.upsert({
    where: { restaurantId_contato: { restaurantId: restaurant.id, contato } },
    update: { quem, atendidaEm: new Date() },
    create: { restaurantId: restaurant.id, contato, quem },
  });

  // A tela de Pedidos é que mostra a faixa; sem isto, o aparelho que
  // marcou só veria o verde na próxima volta do retrato.
  refresh();
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
    select: { id: true, semEspera: true },
  });
  if (!atendente) return { error: "A IA ainda não foi configurada." };

  let tinha: boolean;
  if (lista === "ignorado") {
    // Sem nome e sem aviso: daqui ele só diz "não responda esse". O nome
    // e a chave do aviso se põem na tela da lista, onde dá para ver o
    // cadastro inteiro -- marcar um fornecedor no meio de uma conversa
    // não é hora de decidir se o balcão deve ser alertado.
    const atual = await db.iaContatoIgnorado.findUnique({
      where: { atendenteIaId_numero: { atendenteIaId: atendente.id, numero } },
      select: { id: true },
    });
    tinha = !!atual;
    if (atual) await db.iaContatoIgnorado.delete({ where: { id: atual.id } });
    else await db.iaContatoIgnorado.create({ data: { atendenteIaId: atendente.id, numero } });
  } else {
    const atual = atendente.semEspera;
    tinha = atual.includes(numero);
    await db.atendenteIa.update({
      where: { restaurantId: restaurant.id },
      data: { semEspera: tinha ? atual.filter((n) => n !== numero) : [...atual, numero] },
    });
  }

  const salvo = await db.atendenteIa.findUniqueOrThrow({
    where: { restaurantId: restaurant.id },
    select: { semEspera: true, contatosIgnorados: { select: { numero: true } } },
  });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.listas",
    details: { lista, tirou: tinha, daConversa: true, viaAdmin },
  });
  refresh();

  const nome = lista === "ignorado" ? "quem a IA não responde" : "números de teste";
  return {
    message: tinha ? `Tirado de ${nome}.` : `Na lista de ${nome}.`,
    ignorados: salvo.contatosIgnorados.map((c) => c.numero),
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

  /**
   * As linhas da lista: número, nome e a chave do aviso.
   *
   * Os três campos vêm como listas paralelas, e por isso a linha em
   * branco não pode ser pulada antes do alinhamento: pular o número sem
   * pular o nome ao lado dele embaralharia todos os de baixo -- a
   * "Padaria" acabaria colada no telefone da mãe dele. Primeiro junta,
   * depois descarta.
   */
  function linhasDe(campo: string) {
    const numeros = formData.getAll(campo).map((x) => String(x).trim());
    const nomes = formData.getAll(`${campo}-nome`).map((x) => String(x).trim());
    const avisos = formData.getAll(`${campo}-avisar`).map((x) => String(x) === "1");

    const fora: { numero: string; nome: string | null; avisar: boolean }[] = [];
    for (const [i, texto] of numeros.entries()) {
      if (!texto) continue; // linha em branco é linha que ele desistiu de preencher
      const limpo = normalizePhone(texto);
      if (!/^55\d{10,11}$/.test(limpo)) throw new NumeroRuim(texto);
      if (fora.some((x) => x.numero === limpo)) continue;
      fora.push({ numero: limpo, nome: nomes[i]?.slice(0, 60) || null, avisar: avisos[i] ?? false });
    }
    return fora;
  }

  // Só a lista de ignorados.
  //
  // A de "números de teste" saiu da tela em 24/11/2026 e a coluna ficou,
  // com o que já estava lá. Ler o formulário atrás dela gravaria uma
  // lista vazia no primeiro salvamento -- apagando, sem avisar, números
  // que ninguém pediu para tirar.
  let ignorados: { numero: string; nome: string | null; avisar: boolean }[];
  try {
    ignorados = linhasDe("ignorado");
  } catch (e) {
    if (e instanceof NumeroRuim)
      return { error: `"${e.texto}" não parece um número com DDD.` };
    throw e;
  }

  /**
   * Grava a lista inteira de uma vez: apaga quem saiu, grava quem ficou.
   *
   * Numa transação porque o meio do caminho é uma lista sem ninguém --
   * e a lista vazia é justamente a que faz a IA responder a família toda
   * de uma vez. Meio segundo disso já é mensagem enviada.
   */
  const atendente = await db.atendenteIa.findUnique({
    where: { restaurantId: restaurant.id },
    select: { id: true },
  });
  if (!atendente) return { error: "A IA ainda não está montada para este restaurante." };

  await db.$transaction([
    db.iaContatoIgnorado.deleteMany({
      where: { atendenteIaId: atendente.id, numero: { notIn: ignorados.map((x) => x.numero) } },
    }),
    ...ignorados.map((x) =>
      db.iaContatoIgnorado.upsert({
        where: { atendenteIaId_numero: { atendenteIaId: atendente.id, numero: x.numero } },
        update: { nome: x.nome, avisar: x.avisar },
        create: { atendenteIaId: atendente.id, numero: x.numero, nome: x.nome, avisar: x.avisar },
      }),
    ),
  ]);
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.listas",
    details: {
      ignorados: ignorados.length,
      avisam: ignorados.filter((x) => x.avisar).length,
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
 * O dono decide se a IA pode oferecer alguma coisa antes de fechar o
 * pedido.
 *
 * Uma oferta por pedido, no máximo: o acompanhamento que falta, o que
 * falta para o pedido mínimo, uma bebida ou uma sobremesa -- nessa ordem,
 * e só a primeira que couber. Recusa vale para o pedido inteiro.
 *
 * É chave do dono, e não decisão da plataforma, porque quem conhece a
 * clientela é ele. Numa casa isso é o garçom perguntando "e para beber?";
 * noutra é insistência. Nasce desligada.
 */
export async function iaOferece(
  _prev: EstadoDaAcao,
  formData: FormData,
): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(
    String(formData.get("restaurantId") ?? ""),
  );
  const ligar = formData.get("ligar") === "1";

  await db.atendenteIa.update({
    where: { restaurantId: restaurant.id },
    data: { ofertas: ligar },
  });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.ofertas",
    details: { ligado: ligar, viaAdmin },
  });
  refresh();
  return {
    message: ligar
      ? "Ela vai oferecer uma coisa por pedido, no máximo."
      : "Ela não oferece mais nada: só anota o que o cliente pedir.",
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
  // O pacote cheio não é falha passageira: tentar de novo não resolve, e
  // mandar o dono tentar é o que custou um sábado em 21/11/2026.
  if (pareamento === LIMITE_DE_INSTANCIAS) {
    return {
      ...vazio,
      error:
        "O pacote de números do MenuFácil está cheio, então não dá para conectar mais um agora." +
        " Isso não se resolve tentando de novo: fale com o suporte do MenuFácil para liberar uma vaga.",
    };
  }
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

/**
 * O que só quem é da cidade sabe.
 *
 * O cardápio e a lista de bairros não contam tudo. No Papaléguas o
 * cliente escreve "entrega aqui no Moura": não é bairro cadastrado nem
 * nome de rua, é como a cidade chama aquele lugar -- e a Lia recusava
 * uma entrega que a moto faz toda semana, porque o nome não batia com
 * nada que ela conhecia.
 *
 * Texto livre, e não uma lista de campos, porque o caso seguinte nunca é
 * igual ao anterior: às vezes é o apelido de um lugar, às vezes um
 * cliente antigo que todo mundo conhece pelo sobrenome, às vezes um
 * combinado com o vizinho. Quem conhece a clientela é o dono.
 *
 * O teto de 2.000 caracteres não é arbitrário: isso entra em toda
 * conversa que a IA atende, e texto no contexto se paga por token. Dois
 * mil cabem umas trinta anotações e não pesam na conta.
 */
export async function salvarNotasDaIa(
  _prev: EstadoDaAcao,
  formData: FormData,
): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(
    String(formData.get("restaurantId") ?? ""),
  );
  const texto = String(formData.get("notas") ?? "").trim();
  if (texto.length > 2000) {
    return { error: "O texto é longo demais: no máximo 2.000 caracteres." };
  }

  await db.atendenteIa.update({
    where: { restaurantId: restaurant.id },
    data: { notas: texto || null },
  });
  // O conteúdo não vai para o registro: é texto do restaurante sobre
  // clientes dele, e o que importa auditar é que mudou e quanto tem.
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.notas",
    details: { caracteres: texto.length, viaAdmin },
  });
  refresh();
  return {
    message: texto
      ? "Pronto: ela já sabe disso na próxima conversa."
      : "Apaguei as anotações.",
  };
}

/**
 * Um lugar que a cidade conhece pelo nome, com o endereço pronto.
 *
 * O que as notas em texto livre não davam: elas ajudavam a IA a ENTENDER
 * "aqui no Moura", mas o pedido ainda parava, porque faltavam rua,
 * número, bairro e referência -- e ela perguntava tudo de novo a quem
 * acabara de dizer onde estava. Com o endereço cadastrado, dizer o nome
 * basta.
 *
 * O bairro é conferido contra as áreas de entrega: é dele que sai a
 * taxa, e um lugar conhecido não é licença para entregar fora da área.
 * Sem área cadastrada, qualquer bairro passa -- é o restaurante que
 * cobra uma taxa só.
 */
export async function salvarEnderecoConhecido(
  _prev: EstadoDaAcao,
  formData: FormData,
): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(
    String(formData.get("restaurantId") ?? ""),
  );
  const campo = (nome: string) => String(formData.get(nome) ?? "").trim();

  const nome = campo("nome");
  const rua = campo("rua");
  const bairro = campo("bairro");
  const referencia = campo("referencia");
  if (!nome) return { error: "Dê um nome ao lugar, do jeito que o cliente fala." };
  if (!rua) return { error: "Informe a rua." };
  if (!bairro) return { error: "Informe o bairro." };
  if (!referencia) return { error: "Informe o ponto de referência: é o que o entregador lê." };

  const areas = await db.deliveryArea.findMany({
    where: { restaurantId: restaurant.id },
    select: { name: true, apelidos: true },
  });
  if (areas.length > 0) {
    const igual = (a: string, b: string) =>
      a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");
    const existe = areas.some(
      (a) => igual(a.name, bairro) || a.apelidos.some((ap) => igual(ap, bairro)),
    );
    if (!existe) {
      return {
        error:
          `"${bairro}" não está nos seus bairros de entrega, então a taxa não sairia.` +
          " Use um dos bairros cadastrados em Entrega, ou cadastre esse antes.",
      };
    }
  }

  const apelidos = campo("apelidos")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .slice(0, 10);

  // Renomear é apagar e criar: a chave é o nome, então mudar o nome sem
  // isto deixaria o antigo vivo na lista, e a IA veria o mesmo lugar duas
  // vezes com endereços diferentes.
  const antes = String(formData.get("nomeOriginal") ?? "").trim();
  if (antes && antes !== nome) {
    await db.enderecoConhecido.deleteMany({ where: { restaurantId: restaurant.id, nome: antes } });
  }

  await db.enderecoConhecido.upsert({
    where: { restaurantId_nome: { restaurantId: restaurant.id, nome } },
    update: { apelidos, rua, numero: campo("numero") || "s/n", bairro, referencia, complemento: campo("complemento") || null },
    create: {
      restaurantId: restaurant.id,
      nome,
      apelidos,
      rua,
      numero: campo("numero") || "s/n",
      bairro,
      referencia,
      complemento: campo("complemento") || null,
    },
  });
  // o nome do lugar vai para o registro, o endereço não: endereço é dado
  // de cliente, e o que importa auditar é que a lista mudou
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.endereco",
    details: { nome, viaAdmin },
  });
  refresh();
  return { message: `Pronto: ela já sabe onde fica o ${nome}.` };
}

/** tira um lugar da lista; o pedido já feito com ele não muda */
export async function apagarEnderecoConhecido(
  _prev: EstadoDaAcao,
  formData: FormData,
): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(
    String(formData.get("restaurantId") ?? ""),
  );
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { error: "Não achei qual lugar apagar." };

  await db.enderecoConhecido.deleteMany({ where: { restaurantId: restaurant.id, nome } });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.endereco",
    details: { nome, apagado: true, viaAdmin },
  });
  refresh();
  return { message: `Tirei o ${nome} da lista.` };
}
