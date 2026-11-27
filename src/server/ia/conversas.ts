import "server-only";

import { db } from "@/lib/db";
import { formatPhone } from "@/lib/format";

import { variantes } from "./telefone";

/**
 * As conversas que a IA teve, para o dono ver no painel.
 *
 * Até aqui o histórico só existia para a IA lembrar do contexto -- o dono
 * via as conversas no WhatsApp dele, e as do chat do cardápio não via em
 * lugar nenhum. Esta consulta é o que abre a gaveta: quem falou, o que foi
 * dito por último, e quantas mensagens.
 *
 * Serve para uma coisa prática além de ler: é desta lista que saem os
 * números das duas listas da IA. Em 11/11/2026 oito desconhecidos de
 * grupos de divulgação escreveram para o número do restaurante e foram
 * respondidos um por um; para calar cada um era preciso copiar o número do
 * WhatsApp e digitar no painel. Daqui é um toque.
 */

/** quanto tempo para trás a gaveta olha */
const DIAS = 30;
/** teto de conversas na lista: é uma gaveta, não um sistema de atendimento */
const CONVERSAS_MAX = 60;
/** teto de mensagens de uma conversa aberta */
const MENSAGENS_MAX = 200;

export type Papel = "CLIENTE" | "IA" | "HUMANO";

export type ResumoDeConversa = {
  /** a chave no histórico: o telefone, ou `web:<sessão>` no cardápio */
  contato: string;
  /** o telefone com DDI, só quando dá para pôr numa lista; vazio no cardápio */
  telefone: string;
  noCardapio: boolean;
  /** o nome do cadastro, quando este cliente já pediu alguma vez */
  nome: string | null;
  ultima: string;
  papel: Papel;
  quando: Date;
  total: number;
};

/**
 * A conversa veio do chat do cardápio?
 *
 * Lá não há telefone: o contato é a sessão do navegador, gravada com este
 * prefixo em `chat.ts`. É o que separa as duas origens -- e é por isso que
 * uma conversa do cardápio não pode ir para as listas: não há número para
 * pôr nelas.
 */
const doCardapio = (contato: string) => contato.startsWith("web:");

type Linha = { contato: string; texto: string; papel: Papel; createdAt: Date };

export async function conversasDaIa(restaurantId: string): Promise<ResumoDeConversa[]> {
  const desde = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000);

  // `DISTINCT ON` em vez de uma consulta por conversa: são até 60 contatos,
  // e 60 idas ao banco -- que está nos Estados Unidos -- seriam segundos de
  // espera numa gaveta que o dono abre de passagem.
  const [ultimas, contagens] = await Promise.all([
    db.$queryRaw<Linha[]>`
      SELECT DISTINCT ON (m."contato")
             m."contato", m."texto", m."papel"::text AS papel, m."createdAt"
      FROM "IaMensagem" m
      WHERE m."restaurantId" = ${restaurantId} AND m."createdAt" >= ${desde}
      ORDER BY m."contato", m."createdAt" DESC
    `,
    db.iaMensagem.groupBy({
      by: ["contato"],
      where: { restaurantId, createdAt: { gte: desde } },
      _count: { _all: true },
    }),
  ]);

  const quantas = new Map(contagens.map((c) => [c.contato, c._count._all]));

  /**
   * O nome de quem está do outro lado.
   *
   * A lista mostrava só "(92) 8545-6168", e número não diz com quem ele
   * falou -- para saber, ele tinha de abrir conversa por conversa. O nome
   * vem do cadastro do cliente, que nasce no primeiro pedido: quem já
   * pediu alguma vez tem nome, quem só perguntou o horário não tem, e
   * esse continua aparecendo pelo número.
   *
   * Busca pelas duas formas do número, com e sem o 9 do celular: o mesmo
   * cliente chega de um jeito pelo WhatsApp e está gravado de outro.
   */
  const telefones = ultimas.filter((l) => !doCardapio(l.contato)).map((l) => l.contato);
  const nomes = new Map<string, string>();
  if (telefones.length > 0) {
    const clientes = await db.customer.findMany({
      where: { whatsapp: { in: [...new Set(telefones.flatMap(variantes))] } },
      select: { whatsapp: true, name: true },
    });
    const porNumero = new Map(clientes.map((c) => [c.whatsapp, c.name]));
    for (const t of telefones) {
      const achado = variantes(t).map((v) => porNumero.get(v)).find(Boolean);
      if (achado) nomes.set(t, achado);
    }
  }

  return ultimas
    .map((l) => ({
      contato: l.contato,
      telefone: doCardapio(l.contato) ? "" : l.contato,
      noCardapio: doCardapio(l.contato),
      nome: nomes.get(l.contato) ?? null,
      ultima: l.texto,
      papel: l.papel,
      quando: l.createdAt,
      total: quantas.get(l.contato) ?? 1,
    }))
    .sort((a, b) => b.quando.getTime() - a.quando.getTime())
    .slice(0, CONVERSAS_MAX);
}

export type Fala = { id: string; papel: Papel; texto: string; quando: Date };

/** o que foi dito numa conversa, da primeira mensagem para a última */
export async function falasDaConversa(restaurantId: string, contato: string): Promise<Fala[]> {
  const falas = await db.iaMensagem.findMany({
    where: { restaurantId, contato },
    orderBy: { createdAt: "desc" },
    take: MENSAGENS_MAX,
    select: { id: true, papel: true, texto: true, createdAt: true },
  });
  // de trás para a frente no banco (para o corte pegar as mais recentes) e
  // invertida aqui, que é como se lê uma conversa
  return falas
    .reverse()
    .map((f) => ({ id: f.id, papel: f.papel, texto: f.texto, quando: f.createdAt }));
}

/** quanto tempo um chamado continua valendo como aviso na tela */
const CHAMADO_VALE_MS = 3 * 60 * 60 * 1000;

export type ChamadoEsperando = {
  /** o que identifica este chamado; dispensado no aparelho, não volta */
  chave: string;
  contato: string;
  quem: string;
  motivo: string;
  quando: Date;
};

/**
 * Quem pediu para falar com uma pessoa e ainda não foi atendido.
 *
 * Três horas de validade, e não "tudo o que existe": o aviso serve para
 * quem está no balcão agora. Abrir o painel de manhã e encontrar no
 * canto o cliente que chamou às onze da noite não ajuda ninguém -- ele
 * já desistiu ou já foi atendido pelo celular.
 *
 * Não há campo de atendido no banco de propósito; quem dispensa é o
 * aparelho que viu, como no recado do chat.
 */
export async function chamadosEsperando(restaurantId: string): Promise<ChamadoEsperando[]> {
  const chamados = await db.iaChamado.findMany({
    where: { restaurantId, createdAt: { gte: new Date(Date.now() - CHAMADO_VALE_MS) } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, contato: true, nome: true, motivo: true, createdAt: true },
  });

  return chamados.map((c) => ({
    chave: c.id,
    contato: c.contato,
    quem: c.nome?.trim() || formatPhone(c.contato),
    motivo: c.motivo,
    quando: c.createdAt,
  }));
}

/**
 * O dia da Lia, para a faixa do balcão.
 *
 * Duas coisas na mesma faixa, e a ordem é o que as separa: **o que
 * precisa de alguém** vem na frente, **o que ela já resolveu hoje** vem
 * atrás, discreto. Ele pediu as duas -- ver quem está esperando agora, e
 * ver o que ela deu conta sozinha no dia.
 *
 * O que nunca entra é a saudação. Quem mandou "oi" e recebeu o link é a
 * maioria das conversas, não é atendimento nenhum, e encheria a faixa de
 * gente que não pediu nada. Três mensagens é o corte: "oi", a saudação
 * dela, e mais alguma coisa -- com duas, foi só o cumprimento.
 *
 * Os cinco estados, na ordem em que aparecem:
 *
 * - **sem resposta** -- o cliente falou por último e ficou sem resposta.
 *   É o "cadê rapaz" de 24/11/2026, que só foi descoberto porque ele leu
 *   conversa por conversa. Fica em vermelho pelo tempo que for.
 * - **atendente assumiu** -- alguém do restaurante entrou no meio.
 * - **Lia atendendo** -- conversa viva, tocando agora.
 * - **virou pedido** -- fechou sozinha, com o número do pedido junto.
 * - **encerrada** -- acabou sem pedido: ela falou por último e o cliente
 *   não voltou. Fica discreto, só para a conta do dia fechar.
 */
const JANELA_DO_DIA_H = 12;
const PAROU_MIN = 15;
const MINIMO_DE_MENSAGENS = 3;

/**
 * O que o cliente diz quando a conversa acabou bem.
 *
 * A lista é curta de propósito, e não tem "sim", "isso", "pode" nem
 * "fechou": essas são respostas ao resumo do pedido, e se ficarem sem
 * resposta a conversa está mesmo travada. Aqui só entra o que não espera
 * nada de volta -- agradecimento e aviso de que chegou.
 */
const FECHOS = new Set([
  "ok", "okay", "blz", "beleza", "valeu", "vlw", "obrigado", "obrigada", "obg",
  "brigado", "brigada", "grato", "grata", "agradecido", "tmj", "show", "top",
  "perfeito", "otimo", "ótimo", "de nada", "por nada", "tá certo", "ta certo",
  "tudo certo", "recebi", "chegou", "já chegou", "ja chegou", "ciente",
]);

/** o texto sem emoji e sem pontuação, em minúsculas */
const semEnfeite = (texto: string) =>
  texto
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * A última fala do cliente foi um fecho?
 *
 * Um 👍 depois do pedido entregue não é um cliente esperando -- e era
 * assim que ele aparecia na faixa, em vermelho, entre os que precisam de
 * alguém. Quem só reagiu não perguntou nada.
 *
 * Duas forças diferentes, por um motivo: uma reação sem letra nenhuma
 * nunca é pergunta, então vale sempre. Uma palavra como "ok" é mais
 * ambígua -- pode ser o "ok" que confirma o resumo do pedido -- e por
 * isso só vale quando a conversa já virou pedido, que é quando um
 * agradecimento faz sentido.
 */
function ehFecho(texto: string, temPedido: boolean): boolean {
  const cru = texto.trim();
  if (cru === "") return false;
  const limpo = semEnfeite(cru);
  if (limpo === "") return true; // só emoji, reação ou pontuação
  if (!temPedido || limpo.length > 24) return false;
  return FECHOS.has(limpo) || limpo.split(" ").every((p) => FECHOS.has(p));
}

export type EstadoDaConversa =
  | "sem-resposta"
  | "atendida"
  | "atendente"
  | "atendendo"
  | "pedido"
  | "encerrada";

export type ConversaAtiva = {
  contato: string;
  telefone: string;
  nome: string | null;
  ultima: string;
  papel: Papel;
  quando: Date;
  estado: EstadoDaConversa;
  /** o número do pedido que saiu desta conversa, quando saiu */
  pedido: number | null;
  /** quem do restaurante assumiu esta conversa, quando alguém assumiu */
  quemAtendeu: string | null;
};

/**
 * A ordem da faixa: só uma coisa fura a fila do relógio.
 *
 * Antes era uma escada de cinco degraus -- quem esperava, quem foi
 * assumido, quem a Lia atendia, quem virou pedido, quem encerrou. O
 * efeito na tela foi o contrário do combinado: duas conversas de uma
 * hora atrás, já assumidas, ocupavam a frente da faixa, e a cliente que
 * tinha escrito há três minutos ficava em terceiro. A escada ordenava
 * pelo que já aconteceu, e a faixa serve para o que está acontecendo.
 *
 * Agora é o relógio que manda, com uma exceção: **quem está sem
 * resposta vem na frente**, porque é a razão de a faixa existir. O
 * resto -- inclusive o que alguém já assumiu -- entra pela hora, do
 * mais novo para o mais velho.
 */
const PRIMEIRO = (e: EstadoDaConversa) => (e === "sem-resposta" ? 0 : 1);

export async function conversasAtivas(restaurantId: string): Promise<ConversaAtiva[]> {
  const desde = new Date(Date.now() - JANELA_DO_DIA_H * 60 * 60_000);

  const [ultimas, contagens] = await Promise.all([
    db.$queryRaw<Linha[]>`
      SELECT DISTINCT ON (m."contato")
             m."contato", m."texto", m."papel"::text AS papel, m."createdAt"
      FROM "IaMensagem" m
      WHERE m."restaurantId" = ${restaurantId} AND m."createdAt" >= ${desde}
      ORDER BY m."contato", m."createdAt" DESC
    `,
    db.iaMensagem.groupBy({
      by: ["contato"],
      where: { restaurantId, createdAt: { gte: desde } },
      _count: { _all: true },
    }),
  ]);
  if (ultimas.length === 0) return [];

  const quantas = new Map(contagens.map((c) => [c.contato, c._count._all]));
  const candidatas = ultimas.filter(
    (l) => !doCardapio(l.contato) && (quantas.get(l.contato) ?? 0) >= MINIMO_DE_MENSAGENS,
  );
  if (candidatas.length === 0) return [];

  /**
   * O pedido que saiu de cada conversa, e o nome de quem está do outro
   * lado. Busca pelas duas formas do número, com e sem o 9 do celular: o
   * pedido guarda o telefone do jeito do site e a conversa chega do jeito
   * do WhatsApp.
   */
  const numeros = [...new Set(candidatas.flatMap((l) => variantes(l.contato)))];
  const [pedidos, clientes, atendidas] = await Promise.all([
    db.order.findMany({
      where: { restaurantId, customerWhatsapp: { in: numeros }, createdAt: { gte: desde } },
      orderBy: { createdAt: "desc" },
      select: { customerWhatsapp: true, number: true },
    }),
    db.customer.findMany({ where: { whatsapp: { in: numeros } }, select: { whatsapp: true, name: true } }),
    // Quem alguém do restaurante já assumiu. Vem do banco e não do
    // aparelho: o balcão e o celular do dono têm de concordar, senão os
    // dois respondem o mesmo cliente.
    db.iaConversaAtendida.findMany({
      where: { restaurantId, contato: { in: candidatas.map((l) => l.contato) } },
      select: { contato: true, quem: true, atendidaEm: true },
    }),
  ]);
  const marcaDe = new Map(atendidas.map((a) => [a.contato, a]));
  const porNumero = new Map(clientes.map((c) => [c.whatsapp, c.name]));
  // o mais recente de cada número, que é o que a conversa fechou
  const pedidoDe = new Map<string, number>();
  for (const p of pedidos) if (!pedidoDe.has(p.customerWhatsapp)) pedidoDe.set(p.customerWhatsapp, p.number);

  const agora = Date.now();

  return candidatas
    .map((l) => {
      const formas = variantes(l.contato);
      const numero = formas.map((v) => pedidoDe.get(v)).find((n) => n !== undefined) ?? null;
      const parada = agora - l.createdAt.getTime() > PAROU_MIN * 60_000;

      // A ordem destes testes é a regra inteira. O cliente esperando vem
      // antes de tudo, inclusive de já ter virado pedido: quem fez o
      // pedido e depois escreveu de novo continua esperando resposta --
      // a não ser que o que ele escreveu tenha sido um fecho.
      const esperando = l.papel === "CLIENTE" && !ehFecho(l.texto, numero !== null);

      // Alguém já assumiu esta conversa?
      //
      // A marca tem de ser mais nova que a última mensagem. Quem foi
      // atendido às oito e escreve de novo às nove está esperando outra
      // vez, e o vermelho tem de voltar -- marca velha não cala cliente
      // novo.
      const marca = marcaDe.get(l.contato);
      const assumida = marca !== undefined && marca.atendidaEm.getTime() >= l.createdAt.getTime();

      const estado: EstadoDaConversa =
        esperando
          ? assumida
            ? "atendida"
            : "sem-resposta"
          : l.papel === "HUMANO"
            ? "atendente"
            : numero !== null
              ? "pedido"
              : parada
                ? "encerrada"
                : "atendendo";

      return {
        contato: l.contato,
        telefone: l.contato,
        nome: formas.map((v) => porNumero.get(v)).find(Boolean) ?? null,
        ultima: l.texto,
        papel: l.papel,
        quando: l.createdAt,
        estado,
        pedido: numero,
        quemAtendeu: assumida ? (marca!.quem?.trim() || null) : null,
      };
    })
    .sort(
      (a, b) =>
        PRIMEIRO(a.estado) - PRIMEIRO(b.estado) || b.quando.getTime() - a.quando.getTime(),
    );
}
