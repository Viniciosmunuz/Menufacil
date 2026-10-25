import type { CardType, OrderOrigin, OrderType, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";

import { formatCents, formatPhone, TIME_ZONE } from "./format";
import { isFullDelivery } from "./order-flow";
import { pedeSecao } from "./nomes-parecidos";
import { paymentText } from "./payment";

// Via do pedido para a impressora térmica. Só texto, na largura da bobina
// que o restaurante usa: 48 colunas na de 80 mm (o padrão) e 32 na de 58
// mm. A mesma via vai para a impressão pelo computador (a página /via),
// para o celular (RawBT) e para o Print Fácil.
//
// O desenho é pensado para quem lê correndo, de pé, no balcão: blocos
// separados por linhas, título de cada bloco em maiúsculas, valores
// alinhados à direita e cada escolha do produto em sua própria linha.

/** bobinas que as térmicas do mercado usam, em milímetros */
export const PAPER_WIDTHS = [80, 58] as const;
export type PaperWidth = (typeof PAPER_WIDTHS)[number];
export const DEFAULT_PAPER = 80;

/** quantas letras cabem na linha, na fonte normal da térmica */
export const columnsFor = (paper: number) => (paper === 58 ? 32 : 48);

export type TicketOrder = {
  number: number;
  createdAt: Date | string;
  type: OrderType;
  /** de onde veio; sem isto, a via sai como sempre saiu (pedido pelo link) */
  origin?: OrderOrigin | null;
  /** totem: comer no local (true) ou levar (false) */
  dineIn?: boolean | null;
  customerName: string;
  customerWhatsapp: string;
  deliveryStreet: string | null;
  deliveryNumber: string | null;
  deliveryComplement: string | null;
  deliveryNeighborhood: string | null;
  deliveryReference: string | null;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  payment: { cardType: CardType | null; changeForCents: number | null; status?: PaymentStatus | null } | null;
  /** a mesa e o garçom, quando o pedido veio do salão */
  comanda?: { mesa: { numero: number; tipo: string; nome: string | null }; garcom: { name: string | null } | null } | null;
  items: {
    productName: string;
    optionsText: string | null;
    quantity: number;
    totalCents: number;
    notes: string | null;
    /**
     * De que parte do cardápio o item veio.
     *
     * Vai na via porque nome de prato se repete entre seções: no Papaléguas
     * há "Pirarucu à milanesa" nas iscas e "Filé de pirarucu à milanesa"
     * nos grelhados, "Carne de sol" nos dois. São pratos diferentes, preços
     * diferentes, e a cozinha estava trocando um pelo outro lendo só o nome.
     */
    product?: { category: { name: string } | null } | null;
  }[];
};

const clock = (date: Date | string) =>
  new Date(date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * As ferramentas de desenho na largura da bobina.
 *
 * Ficam juntas aqui porque a comanda do balcão e o recibo do cliente usam
 * exatamente as mesmas: o que muda entre os dois é o que entra em cada
 * bloco, não como a linha é montada.
 */
/** "25/10/2026 - 14:55:32", o carimbo do rodapé da comanda */
function dataEHora(d: Date | string) {
  const data = new Date(d);
  const dia = data.toLocaleDateString("pt-BR", { timeZone: TIME_ZONE });
  const hora = data.toLocaleTimeString("pt-BR", { timeZone: TIME_ZONE, hour12: false });
  return `${dia} - ${hora}`;
}

function pincel(paper: number) {
  const width = columnsFor(paper);
  const forte = "=".repeat(width);
  const fraco = "-".repeat(width);
  const margem = " "; // um respiro nas bordas do papel

  const meio = (texto: string) => {
    const sobra = Math.max(0, width - texto.length);
    return " ".repeat(Math.floor(sobra / 2)) + texto;
  };

  /** rótulo à esquerda, valor à direita, com margem nos dois lados */
  const entre = (esquerda: string, direita: string) => {
    const sobra = Math.max(1, width - esquerda.length - direita.length - margem.length * 2);
    return margem + esquerda + " ".repeat(sobra) + direita + margem;
  };

  /**
   * Quebra o texto sem cortar palavra. O recuo entra em todas as linhas e a
   * continuação ganha um degrau a mais, para se ver onde a frase continua.
   */
  const texto = (conteudo: string, recuo = 0, degrau = 0) => {
    const primeira = margem + " ".repeat(recuo);
    const seguinte = margem + " ".repeat(recuo + degrau);
    const saida: string[] = [];
    let atual = "";
    for (const palavra of conteudo.split(/\s+/).filter(Boolean)) {
      const prefixo = saida.length === 0 ? primeira : seguinte;
      if (atual && (prefixo + atual + " " + palavra).length > width - margem.length) {
        saida.push(prefixo + atual);
        atual = palavra;
      } else {
        atual = atual ? `${atual} ${palavra}` : palavra;
      }
    }
    if (atual) saida.push((saida.length === 0 ? primeira : seguinte) + atual);
    return saida;
  };

  const titulo = (nome: string) => [fraco, `${margem}${nome}`];

  return { width, forte, fraco, margem, meio, entre, texto, titulo };
}

/**
 * Cada item com a quantidade na frente e o preço à direita.
 *
 * `secoes` é o conjunto de nomes que precisam dizer de que parte do
 * cardápio vieram -- ver `nomes-parecidos.ts`. Sem ele nenhuma seção sai,
 * que é o certo para o recibo do cliente: a seção é informação de cozinha.
 */
function itemLines(o: TicketOrder, p: ReturnType<typeof pincel>, secoes?: Set<string>) {
  const { width, entre, texto } = p;
  const lines: string[] = [];
  for (const item of o.items) {
    const quantidade = `${item.quantity}x`;
    const nome = `${quantidade.padEnd(4)}${item.productName}`;
    const valor = formatCents(item.totalCents);
    // só na mesma linha quando sobram dois espaços entre o nome e o preço
    if (nome.length + valor.length + 4 <= width) {
      lines.push(entre(nome, valor));
    } else {
      lines.push(...texto(nome, 0, 4), entre("", valor));
    }
    // a seção do cardápio, em destaque, antes das escolhas: é ela que
    // separa a isca do grelhado de nome parecido. Só sai onde desfaz
    // confusão -- "[BEBIDAS]" embaixo de uma Coca-Cola é linha de papel
    // gasta para dizer o que ninguém tinha dúvida.
    const secao = item.product?.category?.name;
    if (secao && pedeSecao(secoes, item.productName)) lines.push(...texto(`[${secao.toUpperCase()}]`, 4, 2));
    // cada escolha em uma linha: "Tamanho: Grande", "Sabor: Calabresa"
    for (const escolha of (item.optionsText ?? "").split(" · ").filter(Boolean)) {
      lines.push(...texto(escolha, 4, 2));
    }
    if (item.notes) lines.push(...texto(`Obs.: ${item.notes}`, 4, 2));
  }
  return lines;
}

/**
 * A comanda de uma mesa, para a cozinha.
 *
 * O que o fogão precisa saber de um pedido de salão é para qual mesa ele
 * vai, quem anotou e o que fazer. Nome de cliente, telefone, endereço e
 * forma de pagamento são perguntas de quem pede pelo link, e no salão não
 * têm resposta: a pessoa está sentada ali, e como ela vai pagar ninguém
 * sabe ainda -- se sabe, é assunto do caixa, não do fogão.
 *
 * Preço também não entra. Esta via é a ordem de produção; o dinheiro
 * aparece na conta da mesa, que é outro papel.
 *
 * O número da mesa vai sozinho e entre asteriscos no topo, porque é por
 * ele que o prato encontra a pessoa atravessando o salão.
 */
function salaoLines(o: TicketOrder, restaurantName: string, p: ReturnType<typeof pincel>, secoes?: Set<string>): string[] {
  const { width, forte, fraco, meio, texto, margem } = p;
  const lines: string[] = [];
  const mesa = o.comanda?.mesa;
  const rotulo = mesa ? (mesa.tipo === "BALCAO" ? "BALCÃO" : "MESA") + " " + mesa.numero : "SALÃO";

  lines.push(meio(restaurantName.toUpperCase()));
  lines.push("", meio(`* ${rotulo} *`), "");
  if (mesa?.nome) lines.push(meio(mesa.nome.toUpperCase()));
  if (o.comanda?.garcom?.name) lines.push(meio(`Garçom: ${o.comanda.garcom.name}`));

  // Uma linha só, separando o cabeçalho da lista.
  //
  // A via tinha um traço entre cada parte, e numa comanda de três itens o
  // papel saía mais pontilhado que escrito. O que separa aqui é o espaço:
  // quem está no fogão lê a lista, não as divisórias.
  lines.push(fraco, margem + "QTD  DESCRIÇÃO");

  for (const item of o.items) {
    const quantidade = `${item.quantity}`.padEnd(5);
    const nome = item.productName.toUpperCase();
    // nome comprido desce de linha, e a coluna da quantidade continua valendo
    if (margem.length + quantidade.length + nome.length <= width) {
      lines.push(margem + quantidade + nome);
    } else {
      const quebrado = texto(nome, 5, 0);
      lines.push(margem + quantidade + quebrado[0].trim(), ...quebrado.slice(1));
    }

    // a seção do cardápio, em destaque, antes das escolhas: é ela que
    // separa a isca do grelhado de nome parecido
    const secao = item.product?.category?.name;
    if (secao && pedeSecao(secoes, item.productName)) lines.push(...texto(`[${secao.toUpperCase()}]`, 5, 2));
    for (const escolha of (item.optionsText ?? "").split(" · ").filter(Boolean)) {
      lines.push(...texto(escolha, 5, 2));
    }
    if (item.notes) lines.push(...texto(`Obs.: ${item.notes}`, 5, 2));
  }

  if (o.notes) lines.push("", ...texto(`OBSERVAÇÃO: ${o.notes}`));

  // a barra cheia fecha a ordem de produção, e embaixo dela o carimbo
  lines.push(forte, "", meio(`DATA E HORA: ${dataEHora(o.createdAt)}`));
  return lines;
}

export function ticketLines(o: TicketOrder, restaurantName: string, paper: number = DEFAULT_PAPER, secoes?: Set<string>): string[] {
  const p = pincel(paper);
  const { forte, fraco, margem, meio, entre, texto, titulo } = p;
  const delivery = o.type === "DELIVERY";
  const lines: string[] = [];

  if (o.origin === "SALAO") return salaoLines(o, restaurantName, p, secoes);

  // cabeçalho: o restaurante, o número e como o cliente recebe
  const noTotem = o.origin === "TOTEM";
  lines.push(forte, meio(restaurantName.toUpperCase()), forte);
  // No totem, esse número é a senha que o cliente está segurando na mão. A
  // cozinha precisa ler "senha" para saber que é por ele que vai chamar.
  lines.push(entre(noTotem ? `SENHA #${o.number}` : `PEDIDO #${o.number}`, clock(o.createdAt)));
  lines.push(`${margem}${delivery ? "ENTREGA" : noTotem ? (o.dineIn ? "COMER NO LOCAL" : "PARA VIAGEM") : "RETIRADA NO LOCAL"}`);
  // quem está no balcão precisa ver de longe que ninguém anotou este:
  // saiu do totem, já pago, e o cliente está esperando ali mesmo
  if (noTotem) lines.push(`${margem}TOTEM - AUTOATENDIMENTO (JA PAGO)`);
  lines.push(forte);

  // itens: quantidade destacada, preço à direita, escolhas embaixo
  lines.push(...itemLines(o, p, secoes));

  // contas
  lines.push(fraco, entre("Subtotal", formatCents(o.subtotalCents)));
  if (delivery) lines.push(entre("Entrega", o.deliveryFeeCents > 0 ? formatCents(o.deliveryFeeCents) : "Grátis"));
  lines.push(entre("TOTAL", formatCents(o.totalCents)), forte);

  // pagamento
  const troco = o.paymentMethod === "CASH" ? (o.payment?.changeForCents ?? null) : null;
  lines.push(`${margem}PAGAMENTO`);
  lines.push(...texto(paymentText({ method: o.paymentMethod, cardType: o.payment?.cardType, changeForCents: troco })));
  if (troco) lines.push(entre("Levar de troco", formatCents(troco - o.totalCents)));
  // no totem o cartão já passou: dizer "pagar no balcão" faria o balcão cobrar de novo
  if (o.paymentMethod === "CARD") {
    lines.push(...texto(o.origin === "TOTEM" ? "Pago na maquininha do totem" : delivery ? "Levar a maquininha" : "Pagar no balcão"));
  }
  // Pix já pago não tem comprovante para ninguém conferir, e dizer que tem
  // faz o balcão procurar no WhatsApp uma mensagem que nunca vai chegar.
  //
  // - totem: passou na máquina do balcão, ali na frente.
  // - 100% Delivery: o Mercado Pago cobrou e avisou; a comanda só sai
  //   depois disso (ver EXCLUDE_UNPAID), então o Pix que chega aqui está
  //   pago -- menos quando alguém manda imprimir à mão um pedido que ainda
  //   não foi pago, e aí o papel precisa dizer isso.
  // - WhatsApp: é o único em que o cliente paga por fora e manda o
  //   comprovante na conversa.
  if (o.paymentMethod === "PIX") {
    lines.push(
      ...texto(
        o.origin === "TOTEM"
          ? "Pago por Pix no totem"
          : isFullDelivery(o.origin)
            ? o.payment?.status === "CONFIRMED"
              ? "Pago por Pix, confirmado pelo Mercado Pago"
              : "PIX NAO PAGO - NAO ENTREGAR SEM CONFERIR"
            : "Conferir o comprovante no WhatsApp",
      ),
    );
  }

  // cliente
  lines.push(...titulo("CLIENTE"));
  lines.push(...texto(o.customerName));
  // o pedido do totem não tem telefone: ninguém digita WhatsApp no balcão
  if (o.customerWhatsapp) lines.push(...texto(formatPhone(o.customerWhatsapp)));

  // para onde vai
  if (delivery) {
    lines.push(...titulo("ENTREGAR EM"));
    lines.push(...texto(`${o.deliveryStreet ?? ""}, ${o.deliveryNumber ?? ""}`.trim()));
    if (o.deliveryNeighborhood) lines.push(...texto(o.deliveryNeighborhood));
    if (o.deliveryComplement) lines.push(...texto(o.deliveryComplement));
    if (o.deliveryReference) lines.push(...texto(`Ref.: ${o.deliveryReference}`));
  }

  // o que o cliente pediu por escrito
  if (o.notes) {
    lines.push(...titulo("OBSERVAÇÃO DO PEDIDO"));
    lines.push(...texto(o.notes));
  }

  lines.push(forte);
  return lines;
}

/** a via em texto puro, do jeito que a impressora recebe */
export const ticketText = (o: TicketOrder, restaurantName: string, paper: number = DEFAULT_PAPER, secoes?: Set<string>) =>
  `${ticketLines(o, restaurantName, paper, secoes).join("\n")}\n\n\n`;

/**
 * O recibo do cliente: o papel que sai na impressora do próprio totem, na
 * mão de quem acabou de pagar.
 *
 * Só pedido de totem tem este papel, e ele é curto de propósito. O cliente
 * vai segurá-lo até ser chamado, então o que importa é a senha bem à vista,
 * o que ele pediu, quanto pagou e como pagou.
 *
 * O que é assunto da cozinha -- observação do pedido, endereço, telefone --
 * fica de fora: isso sai na comanda do balcão.
 */
export function receiptLines(o: TicketOrder, restaurantName: string, paper: number = DEFAULT_PAPER): string[] {
  const p = pincel(paper);
  const { forte, fraco, margem, meio, entre, texto } = p;
  const lines: string[] = [];

  lines.push(forte, meio(restaurantName.toUpperCase()), forte);

  // a senha sozinha no meio: é o único número que o cliente procura aqui
  lines.push("", meio("SENHA"), meio(`#${o.number}`), "", forte);

  lines.push(...itemLines(o, p));

  lines.push(fraco, entre("TOTAL PAGO", formatCents(o.totalCents)), forte);

  // como pagou, escrito por extenso: o cliente confere sem abrir o app do
  // banco, e o balcão não cobra de novo por engano
  lines.push(`${margem}PAGO`);
  lines.push(...texto(o.paymentMethod === "PIX" ? "Por Pix, no totem" : "No cartão, na maquininha do totem"));

  lines.push(fraco);
  lines.push(`${margem}${o.dineIn === false ? "PARA VIAGEM" : "COMER NO LOCAL"}`);
  lines.push(`${margem}${clock(o.createdAt)}`);

  lines.push(forte, meio("Guarde este papel."), meio("Chamamos pela senha."), forte);
  return lines;
}

/** o recibo em texto puro */
export const receiptText = (o: TicketOrder, restaurantName: string, paper: number = DEFAULT_PAPER) =>
  `${receiptLines(o, restaurantName, paper).join("\n")}\n\n\n`;

/** a conta da mesa, do jeito que ela vai para a mão do cliente */
export type ContaDaMesa = {
  rotulo: string;
  nomeDaMesa: string | null;
  abertaAt: Date | string;
  garcom: string | null;
  pessoas: number;
  itens: { nome: string; opcoes: string | null; observacao: string | null; quantidade: number; centavos: number }[];
  subtotalCents: number;
  servicoCents: number;
  descontoCents: number;
  totalCents: number;
  pagamentos: { forma: string; centavos: number }[];
  pagoCents: number;
  faltaCents: number;
};

/**
 * A conta da mesa, em papel.
 *
 * É o que o cliente pede antes de pagar, e não a comanda da cozinha: aqui
 * tem preço em toda linha, porque é por ele que a pessoa confere. O que já
 * foi recebido aparece embaixo, e o que falta em destaque -- numa mesa que
 * dividiu a conta, é a única pergunta que importa.
 *
 * Sai sempre na impressora principal, a do balcão: é lá que o garçom busca
 * o papel para levar à mesa.
 */
export function contaLines(c: ContaDaMesa, restaurantName: string, paper: number = DEFAULT_PAPER): string[] {
  const { forte, margem, meio, entre, texto, titulo } = pincel(paper);
  const lines: string[] = [];

  // O cabeçalho sem moldura: o nome da casa, o aviso e o número da mesa,
  // separados por espaço. A via tinha um traço entre cada parte, e numa
  // conta de três itens saía mais pontilhado que escrito.
  lines.push(meio(restaurantName.toUpperCase()), meio("CONTA · NÃO É DOCUMENTO FISCAL"));
  lines.push("", meio(c.rotulo.toUpperCase()), "");
  if (c.nomeDaMesa) lines.push(meio(c.nomeDaMesa.toUpperCase()), "");
  if (c.garcom) lines.push(meio(`Garçom: ${c.garcom}`), "");

  // uma linha só, abrindo a lista do que foi consumido
  lines.push(...titulo("CONSUMO"));
  for (const i of c.itens) {
    lines.push(entre(`${i.quantidade}x ${i.nome}`, formatCents(i.centavos)));
    if (i.opcoes) lines.push(...texto(i.opcoes, 4, 2));
    if (i.observacao) lines.push(...texto(`Obs.: ${i.observacao}`, 4, 2));
  }

  lines.push("");
  lines.push(entre("Subtotal", formatCents(c.subtotalCents)));
  if (c.servicoCents > 0) lines.push(entre("Serviço", formatCents(c.servicoCents)));
  if (c.descontoCents > 0) lines.push(entre("Desconto", "-" + formatCents(c.descontoCents)));
  lines.push(forte, entre("TOTAL", formatCents(c.totalCents)), forte);

  if (c.pagamentos.length > 0) {
    lines.push(margem + "JÁ RECEBIDO");
    for (const p of c.pagamentos) lines.push(entre(p.forma, formatCents(p.centavos)));
    lines.push("", entre(c.faltaCents === 0 ? "CONTA PAGA" : "FALTA", c.faltaCents === 0 ? "" : formatCents(c.faltaCents)), forte);
  }

  // a hora em que a mesa abriu fecha o papel, miúda: quem confere a conta
  // olha o total, e a hora é a resposta de "estamos aqui desde quando?"
  lines.push("", meio(`Mesa aberta em ${dataEHora(c.abertaAt)}`));

  return lines;
}


export const contaText = (c: ContaDaMesa, restaurantName: string, paper: number = DEFAULT_PAPER) =>
  `${contaLines(c, restaurantName, paper).join("\n")}\n\n\n`;
