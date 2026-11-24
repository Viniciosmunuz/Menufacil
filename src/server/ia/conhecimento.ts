import "server-only";

import { db } from "@/lib/db";
import { formatCents, TIME_ZONE } from "@/lib/format";
import {
  inicioDaOperacao,
  isOpenNow,
  soRetirada as entregaPausada,
  WEEKDAYS,
  type OpeningHourData,
} from "@/lib/opening-hours";
import { appUrl } from "@/lib/site";
import { maisPedidos } from "@/server/public/restaurants";

// O que a IA sabe sobre o restaurante.
//
// Só leitura: monta um texto a partir do cadastro, do horário e do
// cardápio, e não grava nada. É o que o cliente vê na página do
// restaurante pelo link -- endereço, Instagram, pagamento, horários, o selo
// "mais pedido", o cardápio com o que está esgotado --, mais o nome de quem
// é dono, para a IA saber quem chamar. A seção que é só do salão nem entra.
//
// Dividido em duas partes de propósito:
//
// - **o fixo** (cardápio, horários, regras) muda pouco e vai num bloco que
//   a Anthropic guarda em cache. A partir da segunda mensagem, essa parte
//   custa uma fração do preço.
// - **o agora** (que horas são, se está aberto) muda a cada minuto e vai
//   numa mensagem separada no fim. Se fosse junto do fixo, o cache nunca
//   seria aproveitado.
//
// Quando a IA anota pedidos, o cardápio vem com o código de cada produto e
// de cada opção: é por eles que ela monta o pedido, e o sistema confere e
// calcula o preço a partir deles -- nunca a partir do nome ou do valor que
// ela escreveu.

export type Conhecimento = {
  fixo: string;
  agora: string;
  link: string;
  nome: string;
  /** o primeiro nome do dono, quando há um só: "vou chamar o Lucivan" */
  dono: string | null;
  slug: string;
  /** aberto agora; fechado, a IA não responde */
  aberto: boolean;
  /**
   * Quando começou o expediente de agora.
   *
   * É daqui que a IA lê a conversa. Fechou e abriu de novo, é outro dia de
   * trabalho: quem volta no dia seguinte recomeça do zero, e ela não
   * arrasta o que ficou pela metade na véspera.
   */
  inicioDoTurno: Date;
  /** 100% Delivery: o Pix é o do Mercado Pago, e não a chave */
  cemPorCento: boolean;
};

type GrupoDeOpcoes = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  halfHalf: boolean;
  options: { id: string; name: string; priceCents: number; available: boolean }[];
};

/** "Tamanho (escolha 1): Pequena [id]; Grande [id] +R$ 5,00" */
function linhaDoGrupo(g: GrupoDeOpcoes) {
  const regra =
    g.minSelect === g.maxSelect
      ? `escolha ${g.minSelect}`
      : g.minSelect === 0
        ? `opcional, até ${g.maxSelect}`
        : `escolha de ${g.minSelect} a ${g.maxSelect}`;
  const meio = g.halfHalf ? ", aceita meio a meio com 2" : "";
  const opcoes = g.options
    .map((o) => `${o.name} [${o.id}]${o.priceCents > 0 ? ` +${formatCents(o.priceCents)}` : ""}${o.available ? "" : " [ESGOTADO]"}`)
    .join("; ");
  return `    ${g.name} (${regra}${meio}): ${opcoes}`;
}

export async function conhecimentoDoRestaurante(
  restaurantId: string,
  { comIds = false }: { comIds?: boolean } = {},
): Promise<Conhecimento | null> {
  const r = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      slug: true,
      status: true,
      description: true,
      neighborhood: true,
      city: true,
      street: true,
      number: true,
      complement: true,
      state: true,
      phone: true,
      instagram: true,
      paymentInstructions: true,
      ratingAverage: true,
      ratingCount: true,
      // quem é dono de verdade: o admin da plataforma e os garçons ficam de fora
      owners: {
        where: { role: "OWNER", user: { role: "RESTAURANT_OWNER", status: "ACTIVE" } },
        orderBy: { id: "asc" },
        select: { user: { select: { name: true } } },
      },
      openMode: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      pickupOnlyUntil: true,
      deliveryFeeCents: true,
      deliveryAreas: {
        where: { active: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        select: { name: true, apelidos: true, feeCents: true },
      },
      minOrderCents: true,
      deliveryTimeMin: true,
      deliveryTimeMax: true,
      acceptsCard: true,
      acceptsCash: true,
      fullDeliveryEnabled: true,
      deliveryMode: true,
      // o que o dono escreveu sobre a clientela e a cidade
      atendenteIa: { select: { notas: true } },
      // os lugares que a cidade conhece pelo nome, com o endereço pronto
      enderecosConhecidos: {
        orderBy: { nome: "asc" },
        select: { nome: true, apelidos: true, rua: true, numero: true, bairro: true, referencia: true, complemento: true },
      },
      openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
      menuCategories: {
        // a seção que só o garçom lança (couvert, embalagem) não existe para o cliente
        where: { active: true, somenteSalao: false },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          name: true,
          pizzaFlavors: true,
          addons: true,
          products: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              name: true,
              description: true,
              priceCents: true,
              promoPriceCents: true,
              available: true,
              pizzaFlavors: true,
              allowAddons: true,
              optionGroups: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  name: true,
                  minSelect: true,
                  maxSelect: true,
                  halfHalf: true,
                  options: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, priceCents: true, available: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!r) return null;

  const link = `${appUrl()}/restaurante/${r.slug}`;
  const destaques = new Set(await maisPedidos(restaurantId));
  const donos = r.owners.map((o) => o.user.name.trim()).filter(Boolean);
  const cemPorCento = r.fullDeliveryEnabled && r.deliveryMode === "FULL_DELIVERY";
  const linhas: string[] = [];

  linhas.push(`RESTAURANTE: ${r.name}`);
  if (r.description) linhas.push(`Sobre: ${r.description}`);
  const endereco = [
    r.street && `${r.street}${r.number ? `, ${r.number}` : ""}${r.complement ? ` (${r.complement})` : ""}`,
    r.neighborhood,
    r.city && `${r.city}${r.state ? `/${r.state}` : ""}`,
  ]
    .filter(Boolean)
    .join(" - ");
  if (endereco) linhas.push(`Endereço: ${endereco}`);
  linhas.push(`Link do cardápio para pedir: ${link}`);
  if (r.instagram) linhas.push(`Instagram: @${instagramDe(r.instagram)}`);
  if (r.phone) linhas.push(`Telefone: ${r.phone}`);
  if (r.ratingAverage && r.ratingCount > 0) {
    linhas.push(`Avaliação dos clientes: ${r.ratingAverage.toFixed(1).replace(".", ",")} de 5 (${r.ratingCount} avaliações)`);
  }
  if (donos.length) linhas.push(`Dono do restaurante: ${donos.join(", ")}`);
  linhas.push("");

  linhas.push("HORÁRIO DE FUNCIONAMENTO:");
  const horas = r.openingHours as OpeningHourData[];
  for (let dia = 0; dia < 7; dia++) {
    const h = horas.find((x) => x.weekday === dia);
    linhas.push(`- ${WEEKDAYS[dia]}: ${!h || h.closed ? "fechado" : `${h.opensAt} às ${h.closesAt}`}`);
  }
  linhas.push("");

  linhas.push("ENTREGA E RETIRADA:");
  linhas.push(`- Entrega: ${r.deliveryEnabled ? "sim" : "não"}`);
  linhas.push(`- Retirada no local: ${r.pickupEnabled ? "sim" : "não"}`);
  if (r.deliveryEnabled) {
    // Lista vazia quer dizer "entrega em qualquer endereço", que é como o
    // sistema sempre funcionou. Com bairros cadastrados, a taxa é a de cada
    // um -- e a lista vira o limite da entrega.
    const areas = r.deliveryAreas;
    const umaTaxaSo = areas.length > 0 && areas.every((a) => a.feeCents === areas[0].feeCents);
    if (areas.length === 0) {
      linhas.push(`- Taxa de entrega: ${r.deliveryFeeCents > 0 ? formatCents(r.deliveryFeeCents) : "grátis"}`);
    } else if (umaTaxaSo) {
      linhas.push(`- Taxa de entrega: ${areas[0].feeCents > 0 ? formatCents(areas[0].feeCents) : "grátis"}, em qualquer bairro atendido`);
    }
    if (r.deliveryTimeMin && r.deliveryTimeMax)
      linhas.push(
        `- Tempo cadastrado pelo restaurante: ${r.deliveryTimeMin} a ${r.deliveryTimeMax} minutos. Quando o cliente perguntar quanto tempo demora -- antes ou depois do pedido --, responda com ele: na entrega, "de ${r.deliveryTimeMin} a ${r.deliveryTimeMax} minutos"; na retirada, "fica pronto em até ${r.deliveryTimeMax} minutos". Nunca diga que não tem prazo, e nunca ofereça o prazo por conta própria, nem no meio de outra resposta.`,
      );
    if (areas.length > 0) {
      linhas.push(`- BAIRROS ATENDIDOS (a entrega só vai nestes; fora deles, só retirada):`);
      for (const a of areas) {
        // Os apelidos entram na mesma linha da área, e não como linhas
        // soltas: assim ela entende que são o mesmo lugar com a mesma
        // taxa, em vez de tratar "Hotel Calleb" e "BR-174 (km 107)"
        // como dois destinos diferentes.
        const outrosNomes = a.apelidos.length ? ` (também: ${a.apelidos.join(", ")})` : "";
        linhas.push(
          `  - ${a.name}${outrosNomes}${umaTaxaSo ? "" : `: ${a.feeCents > 0 ? formatCents(a.feeCents) : "grátis"}`}`,
        );
      }
      linhas.push("  - Se o cliente disser um bairro que não está nesta lista, não anote entrega: diga que ali ainda não há entrega e ofereça a retirada no local.");
      // Antes de recusar, uma pergunta. "Entrega aqui no Moura" não é um
      // bairro de fora da área: é o nome que a cidade dá a um lugar que
      // está dentro dela. Recusar na primeira mensagem perdia o cliente
      // por um nome que ninguém tinha cadastrado.
      linhas.push("  - ANTES DE RECUSAR, veja se é mesmo um bairro. O cliente diz o lugar do jeito que a cidade chama: \"aqui no Moura\", \"no posto do Zé\", \"lá na borracharia\". Isso não é bairro de fora da área -- é um ponto que pode estar dentro dela. Pergunte em qual bairro fica, citando os que você atende, e só depois decida. Recusar de cara perde um cliente que a moto atende toda semana.");
      linhas.push("  - Os nomes entre parênteses depois de \"também:\" são os LUGARES atendidos dentro daquela área, e pagam a taxa dela.");
      linhas.push("  - Numa área que tem lugares entre parênteses, só se entrega NELES -- não na área inteira. Então o bairro do pedido tem de ser um desses nomes, nunca o nome da área sozinho. Se o cliente disser só o nome da área (\"estou na BR-174\"), pergunte em qual dos lugares ele está antes de anotar.");
    }
  }
  if (r.minOrderCents > 0) linhas.push(`- Pedido mínimo: ${formatCents(r.minOrderCents)}`);
  const formas = ["Pix", r.acceptsCard && "cartão (na entrega ou na retirada)", r.acceptsCash && "dinheiro"].filter(Boolean).join(", ");
  linhas.push(`- Formas de pagamento: ${formas}`);
  if (r.paymentInstructions) linhas.push(`- Sobre o pagamento: ${r.paymentInstructions.slice(0, 300)}`);
  linhas.push("");

  // O que só quem é da cidade sabe, escrito pelo dono.
  //
  // Entra depois da entrega porque é ali que ele faz falta: o cliente
  // escreve "entrega aqui no Moura", e isso não é bairro cadastrado nem
  // nome de rua. Vem com as duas travas que o texto livre não garante
  // sozinho -- não inventar a partir dele, e não furar a lista de
  // bairros.
  // Os lugares com endereço pronto.
  //
  // Vem ANTES das notas livres de propósito: aqui o endereço está
  // completo e fecha o pedido sozinho, e lá embaixo é texto solto que
  // só ajuda a entender. Se os dois falarem do mesmo lugar, o daqui é o
  // que vale -- e a ordem é o que diz isso ao modelo.
  const conhecidos = r.enderecosConhecidos ?? [];
  if (conhecidos.length > 0) {
    linhas.push("ENDEREÇOS CONHECIDOS (o endereço já está pronto: dizer o nome basta):");
    for (const e of conhecidos) {
      const outros = e.apelidos.length ? ` (também: ${e.apelidos.join(", ")})` : "";
      const comp = e.complemento ? `, ${e.complemento}` : "";
      linhas.push(`  - ${e.nome}${outros} -> rua "${e.rua}", número "${e.numero}"${comp}, bairro "${e.bairro}", referência "${e.referencia}"`);
    }
    linhas.push("  - **Quando o cliente disser um destes nomes como endereço (\"entrega aqui no Moura\", \"é no Rocha\", \"lá no Moura mesmo\"), o endereço está COMPLETO.** Monte o pedido com a rua, o número, o bairro e a referência exatamente como estão escritos aí, letra por letra.");
    linhas.push("  - **NÃO pergunte mais nada do endereço:** nem a rua, nem o número, nem o bairro, nem o ponto de referência. Perguntar isso a quem disse o nome do lugar é o mesmo que não ter ouvido -- ele falou o endereço inteiro numa palavra.");
    linhas.push("  - Confirme pelo nome ao mostrar o resumo (\"entrega no Moura\"), e não pela rua: é assim que o cliente chama o lugar dele.");
    linhas.push("  - Se ele der o nome E mais detalhes (\"no Moura, casa dos fundos\"), use o endereço daqui e mande o que ele acrescentou no complemento.");
    linhas.push("  - A lista de bairros continua mandando na taxa: a taxa é a do bairro escrito aí.");
    linhas.push("");
  }
  const notas = r.atendenteIa?.notas?.trim();
  if (notas) {
    linhas.push("O QUE O RESTAURANTE ANOTOU PARA VOCÊ:");
    linhas.push("(escrito pelo dono, sobre a clientela e a cidade; vale como verdade)");
    linhas.push(notas.slice(0, 2000));
    linhas.push(
      "- Use isso para ENTENDER o que o cliente fala: um apelido de lugar, um cliente que todo mundo conhece, um combinado da casa.",
    );
    linhas.push(
      "- Não é cardápio nem lista de bairros. Não invente preço, prato nem taxa a partir daqui, e NUNCA entregue num lugar fora dos bairros atendidos -- nem que ele esteja citado aqui. Se o apelido cair num bairro que você não atende, trate como qualquer endereço fora da área.",
    );
    linhas.push(
      "- Se o apelido não disser em que bairro fica, pergunte o bairro antes de anotar a entrega, em vez de recusar: \"Moura é em qual bairro?\" resolve, \"ali não entregamos\" perde o cliente.",
    );
    linhas.push("");
  }

  if (!comIds) {
    linhas.push("CARDÁPIO (preços em reais):");
    for (const c of r.menuCategories) {
      if (c.products.length === 0) continue;
      linhas.push(`\n## ${c.name}`);
      for (const p of c.products) {
        const preco = p.promoPriceCents
          ? `${formatCents(p.promoPriceCents)} (promoção; de ${formatCents(p.priceCents)})`
          : formatCents(p.priceCents);
        const descricao = p.description ? ` — ${p.description.slice(0, 160)}` : "";
        linhas.push(`- ${p.name}: ${preco}${p.available ? "" : " [ESGOTADO HOJE]"}${destaques.has(p.id) ? " [MAIS PEDIDO]" : ""}${descricao}`);
      }
    }
  } else {
    linhas.push("CARDÁPIO PARA ANOTAR (o código entre colchetes é o que vai no pedido; preços em reais):");
    for (const c of r.menuCategories) {
      if (c.products.length === 0) continue;
      const marca = c.pizzaFlavors
        ? ' — sabores de pizza: entram no campo "sabores" de uma pizza montada'
        : c.addons
          ? ' — acompanhamentos: entram no campo "acompanhamentos" de um prato que aceita, ou sozinhos como item'
          : "";
      linhas.push(`\n## ${c.name}${marca}`);
      for (const p of c.products) {
        const preco = p.promoPriceCents
          ? `${formatCents(p.promoPriceCents)} (promoção; de ${formatCents(p.priceCents)})`
          : formatCents(p.priceCents);
        const extras = [
          p.pizzaFlavors ? `pizza montada: ${p.pizzaFlavors} sabor(es) e o tamanho; vale o preço do sabor mais caro` : null,
          p.allowAddons ? "aceita acompanhamentos" : null,
        ].filter(Boolean);
        const descricao = p.description ? ` — ${p.description.slice(0, 120)}` : "";
        linhas.push(
          `- ${p.name} [${p.id}]: ${preco}${p.available ? "" : " [ESGOTADO HOJE]"}${destaques.has(p.id) ? " [MAIS PEDIDO]" : ""}${extras.length ? ` (${extras.join("; ")})` : ""}${descricao}`,
        );
        for (const g of p.optionGroups) linhas.push(linhaDoGrupo(g));
      }
    }
  }

  // ─── o agora ───────────────────────────────────────────────────────
  const aberto = r.status === "ACTIVE" && isOpenNow(r.openMode, horas);
  // Fechar e abrir no botão também começa um expediente novo. Até
  // 15/11/2026 só o horário cadastrado (ou 4 horas de silêncio) recomeçava
  // a conversa: ele fechou e abriu a loja, mandou "oi", e a Lia continuou o
  // pedido de antes, com o nome e o bairro da conversa anterior. A troca no
  // botão fica no registro do painel; a mais recente vale como começo.
  const pelaAgenda = inicioDaOperacao(horas);
  const ultimaTroca = await db.auditLog.findFirst({
    where: { restaurantId, action: "restaurant.open_mode" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const inicioDoTurno = ultimaTroca && ultimaTroca.createdAt > pelaAgenda ? ultimaTroca.createdAt : pelaAgenda;
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const pausada = r.deliveryEnabled && entregaPausada(r.pickupOnlyUntil);
  const agora = [
    `Agora: ${hora}.`,
    aberto ? "O restaurante está ABERTO e recebendo pedidos." : "O restaurante está FECHADO agora.",
    pausada ? "A ENTREGA ESTÁ PAUSADA no momento: só retirada no local." : "",
  ]
    .filter(Boolean)
    .join(" ");

  // com mais de um dono, a IA não escolhe sozinha quem chamar
  const dono = donos.length === 1 ? donos[0].split(/\s+/)[0] : null;
  return { fixo: linhas.join("\n"), agora, link, nome: r.name, dono, slug: r.slug, aberto, inicioDoTurno, cemPorCento };
}

/** "@papaleguas", venha o cadastro como "@papaleguas" ou como o endereço inteiro */
function instagramDe(valor: string) {
  return valor
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "");
}
