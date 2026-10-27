import { WHATSAPP_MENUFACIL, linkWhatsappMenuFacil } from "@/lib/contato";

import {
  BadgePercent,
  Bot,
  BookOpen,
  Bike,
  ChefHat,
  ClipboardList,
  Headset,
  HandPlatter,
  LayoutDashboard,
  Link2,
  ListChecks,
  Monitor,
  Percent,
  Printer,
  Receipt,
  ShieldCheck,
  Smartphone,
  Split,
  Store,
  UtensilsCrossed,
  ToggleLeft,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// ============================================================
// O que você muda nesta página
//
// Tudo o que é texto comercial (preço, itens do plano, link da
// demonstração, WhatsApp, perguntas, depoimentos) está aqui. Mexa só neste
// arquivo: o desenho da página fica em sections.tsx.
// ============================================================

/** como o programa do balcão se chama para o restaurante */
export const NOME_DO_APP = "Menu Fácil para PC";

/** cardápio que abre no botão "Fazer um pedido de teste" */
// TODO: trocar por /restaurante/demonstracao quando o restaurante de demonstração existir
export const DEMO_URL = "/restaurante/papaleguas";

/** de onde o MenuFácil atende: aparece no rodapé */
export const PRACA = "Presidente Figueiredo · AM";

/**
 * WhatsApp da equipe MenuFácil. Aceita duas formas:
 *
 *  - **só os números**, com 55 e o DDD ("5592999990000"): é a melhor. A
 *    conversa abre já com a mensagem escrita e funciona também no computador.
 *  - **um link pronto** (o do QR code): só abre no celular de quem já tem o
 *    WhatsApp instalado, e sem a mensagem pronta.
 *
 * Vazio = o botão não aparece na página.
 */
export const WHATSAPP = WHATSAPP_MENUFACIL;
export const WHATSAPP_MSG = "Olá! Quero saber mais sobre o MenuFácil para o meu restaurante.";

/** endereço do botão "Prefiro falar no WhatsApp"; null quando não há contato */
export const linkDoWhatsapp = () => linkWhatsappMenuFacil(WHATSAPP_MSG);

/** as âncoras da página, usadas pelo menu do topo e pelos botões */
export const SECOES = {
  topo: "topo",
  recursos: "recursos",
  planos: "planos",
  adicionais: "adicionais",
  totem: "totem",
  depoimentos: "depoimentos",
  duvidas: "duvidas",
  comece: "comece",
} as const;

// ─── topo ─────────────────────────────────────────────────────────────

export const TOPO = {
  etiqueta: "Sistema de delivery e salão",
  titulo: "Seu restaurante organizado.",
  tituloDestaque: "Seus pedidos sob controle.",
  texto:
    "Receba pedidos, imprima comandas e gerencie delivery e salão em um só sistema, sem comissão por pedido.",
  botao: "Quero conhecer o sistema",
  secundario: "Ver como funciona",
  selo: "Pedidos chegando!",
};

/** os quatro "sem" e "com" que o dono quer ouvir logo de cara */
export const PROMESSAS: { icon: LucideIcon; title: string }[] = [
  { icon: Percent, title: "Sem comissão por pedido" },
  { icon: BadgePercent, title: "Sem taxa de adesão" },
  { icon: Headset, title: "Suporte incluso" },
  { icon: ChefHat, title: "Atendimento rápido e humanizado" },
];

// ─── como funciona ────────────────────────────────────────────────────

export const PASSOS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Smartphone, title: "Cliente faz o pedido", text: "Pelo link, pelo cardápio no WhatsApp ou no totem." },
  { icon: ClipboardList, title: "Pedido chega no restaurante", text: "Aparece no painel e apita, com som que se ouve no salão." },
  { icon: Printer, title: "Cozinha prepara", text: "A comanda sai impressa sozinha, com itens e observações." },
  { icon: Bike, title: "Entrega ou retirada", text: "O cliente acompanha e recebe. E pronto." },
];

// ─── tudo em um só lugar ──────────────────────────────────────────────

export const RECURSOS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Bike, title: "Delivery", text: "Pedidos pelo link do seu cardápio, com entrega e retirada." },
  { icon: HandPlatter, title: "Salão", text: "Mesas, comandas e garçons, no plano Completo." },
  { icon: Printer, title: "Impressão de comandas", text: "Sai sozinha no balcão e na cozinha, separada por setor." },
  { icon: Monitor, title: "Totem de autoatendimento", text: "O cliente pede e paga sozinho no balcão. Opcional." },
  { icon: LayoutDashboard, title: "Painel administrativo", text: "Vendas, pedidos, cardápio e relatórios no seu celular." },
];

/** a frase manuscrita ao lado das telas */
export const RECADO_RECURSOS = "Mais praticidade no seu dia a dia!";

// ─── o delivery, em detalhe ───────────────────────────────────────────

export const BENEFICIOS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Link2,
    title: "Link próprio",
    text: "Seu cardápio com sua logo, suas fotos e seus preços. Coloque no Instagram e no WhatsApp.",
  },
  {
    icon: Percent,
    title: "Sem comissão por pedido",
    text: "O cliente paga direto para você, por Pix, cartão ou dinheiro.",
  },
  {
    icon: Printer,
    title: "Imprime sozinho no balcão",
    text: `Com o ${NOME_DO_APP}, o pedido sai na impressora com itens, observações, endereço e troco calculado.`,
  },
  {
    icon: ListChecks,
    title: "Pedido completo, sem erro",
    text: "O cliente escolhe tamanho, sabor e adicionais, e confere tudo antes de enviar.",
  },
  {
    icon: ToggleLeft,
    title: "Um cardápio só",
    text: "Acabou um prato? Marque esgotado e ele some do delivery, do salão e do totem ao mesmo tempo.",
  },
  {
    icon: BookOpen,
    title: "A gente monta com você",
    text: "Você manda o cardápio como tiver, e nós cadastramos. Não precisa saber mexer em sistema.",
  },
];

// ─── o salão ──────────────────────────────────────────────────────────

export const SALAO: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: HandPlatter,
    title: "O garçom anota no celular",
    text: "Ele entra com CPF e senha, escolhe a mesa e lança do mesmo cardápio do delivery. Funciona no celular dele e na maquininha Android.",
  },
  {
    icon: Printer,
    title: "A cozinha recebe na hora",
    text: "A comanda sai impressa assim que ele confirma, e cada setor imprime só o que é dele: a chapa os lanches, a copa as bebidas.",
  },
  {
    icon: Split,
    title: "Conta dividida sem briga",
    text: "Divida por pessoa ou por item, aplique desconto ou taxa de serviço, e imprima a conta da mesa para o cliente conferir.",
  },
  {
    icon: Wallet,
    title: "Caixa fechado certo",
    text: "Abertura, sangria, reforço e o relatório do dia por forma de pagamento. No fim do expediente o sistema diz quanto tem que ter na gaveta.",
  },
  {
    icon: ShieldCheck,
    title: "Cada um com sua permissão",
    text: "Você escolhe quem pode apagar item, dar desconto, transferir mesa ou fechar a conta. O resto fica bloqueado.",
  },
  {
    icon: Receipt,
    title: "Histórico de tudo",
    text: "Toda mesa fechada fica guardada, com o que foi consumido, quem atendeu e como foi pago.",
  },
];

// ─── planos ───────────────────────────────────────────────────────────

export type Plano = {
  nome: string;
  preco: string;
  periodo: string;
  icone: LucideIcon;
  /** uma linha dizendo para quem é */
  resumo: string;
  /** o título da lista: "Inclui" no primeiro, "Tudo do X, mais" nos outros */
  tituloDosItens: string;
  itens: string[];
  /** o que aparece no botão */
  botao: string;
  /** a mensagem que abre no WhatsApp quando ele clica */
  mensagem: string;
  /** o cartão em evidência; só um deve ter */
  destaque?: boolean;
  /** selo acima do nome, quando há o que dizer */
  selo?: string;
};

export const PLANOS: Plano[] = [
  {
    nome: 'Essencial',
    preco: 'R$ 100',
    periodo: '/mês',
    icone: UtensilsCrossed,
    resumo: 'Para restaurantes que estão começando no delivery digital.',
    tituloDosItens: 'Inclui',
    itens: [
      'Cardápio digital com link próprio',
      'Pedidos direcionados ao WhatsApp',
      'Painel de pedidos com aviso sonoro',
      'Impressão de comandas',
      'Cadastro e montagem inicial do cardápio',
      'Suporte e atualizações',
    ],
    botao: 'Quero o Essencial',
    mensagem: 'Olá! Quero o plano Essencial (R$ 100/mês) do MenuFácil para o meu restaurante.',
  },
  {
    nome: 'Delivery Pro',
    preco: 'R$ 180',
    periodo: '/mês',
    icone: Bike,
    resumo: 'Para quem quer automatizar e profissionalizar o delivery.',
    tituloDosItens: 'Tudo do Essencial, mais',
    selo: 'Recomendado',
    itens: [
      'Checkout e gestão de pedidos pelo próprio sistema',
      'Pagamento por Pix integrado ao Mercado Pago',
      'Recebimento direto na conta do restaurante',
      'Acompanhamento do pedido pelo cliente',
      'Conversa com o cliente dentro do pedido',
      'Gestão das modalidades de entrega e retirada',
    ],
    botao: 'Quero o Delivery Pro',
    mensagem: 'Olá! Quero o plano Delivery Pro (R$ 180/mês) do MenuFácil para o meu restaurante.',
    destaque: true,
  },
  {
    nome: 'Completo',
    preco: 'R$ 280',
    periodo: '/mês',
    icone: Store,
    resumo: 'Para restaurantes que operam delivery e salão.',
    tituloDosItens: 'Tudo do Delivery Pro, mais',
    itens: [
      'Gestão de mesas e garçons',
      'Comandas da cozinha separadas por setor',
      'Fechamento de contas, descontos e divisão',
      'Caixa com abertura, sangria e relatórios',
      'Permissões por garçom',
    ],
    botao: 'Quero o Completo',
    mensagem: 'Olá! Quero o plano Completo (R$ 280/mês) do MenuFácil para o meu restaurante.',
  },
];

/** a frase manuscrita ao lado dos planos */
export const RECADO_PLANOS = "Temos o plano certo para cada momento do seu negócio!";

// ─── adicionais ───────────────────────────────────────────────────────
//
// Recurso que se contrata à parte, fora da mensalidade do plano.
//
//  é o que separa o que já existe do que ainda vai
// existir: o cartão continua na página, mas sem preço, com o selo "Em
// breve" e um botão de aviso em vez de um botão de compra. Vender o que
// não está pronto é o tipo de coisa que, descoberta uma vez, derruba a
// confiança no resto -- e quem vende sistema para o vizinho não tem como se
// dar a esse luxo.

export type Adicional = {
  nome: string;
  resumo: string;
  icone: LucideIcon;
  /** 'brand' | 'info': o tom do ícone, para os dois não se confundirem */
  tom: 'brand' | 'info';
  /** vazio quando ainda não há preço definido */
  preco: string;
  periodo: string;
  /** o que dizer no lugar do preço quando ele não existe */
  notaDePreco: string;
  itens: string[];
  botao: string;
  mensagem: string;
  /** false: ainda não está pronto, e a página diz isso */
  disponivel: boolean;
};

export const ADICIONAIS: Adicional[] = [
  {
    nome: 'Menu Fácil Totem',
    resumo: 'Autoatendimento presencial no restaurante.',
    icone: Monitor,
    tom: 'brand',
    preco: '',
    periodo: '',
    notaDePreco: 'Preço sob consulta',
    itens: [
      'Tela de autoatendimento no balcão',
      'Mesmo cardápio do delivery e do salão',
      'Senha impressa e chamada no telão',
      'Pagamento na maquininha ou por Pix na tela',
      'Impressora térmica e terminal compatíveis',
    ],
    botao: 'Quero o Totem',
    mensagem: 'Olá! Quero saber mais sobre o Menu Fácil Totem para o meu restaurante.',
    disponivel: true,
  },
  {
    nome: 'Menu Fácil IA',
    resumo: 'Atendimento inteligente pelo WhatsApp.',
    icone: Bot,
    tom: 'info',
    preco: '',
    periodo: '',
    notaDePreco: 'Ainda em desenvolvimento',
    itens: [
      'Atendimento automático inicial',
      'Envio do link do cardápio na conversa',
      'Respostas sobre cardápio e funcionamento',
      'Montagem do pedido pela conversa',
      'Transferência para atendimento humano',
    ],
    botao: 'Quero ser avisado',
    mensagem: 'Olá! Quero entrar na lista de espera do Menu Fácil IA.',
    disponivel: false,
  },
];

export const ADICIONAIS_TEXTO = {
  etiqueta: 'Adicionais',
  titulo: 'Potencialize ainda mais o seu restaurante.',
  texto: 'Contrate os adicionais que fazem sentido para o seu negócio.',
  nota: 'Os adicionais são contratados à parte da mensalidade e podem ser ligados a qualquer momento.',
};

export const PLANOS_TEXTO = {
  titulo: "Escolha o plano ideal para o seu restaurante.",
  texto: "Todos os planos incluem suporte, sistema estável e atualizações constantes.",
};

// ─── totem ────────────────────────────────────────────────────────────

export const TOTEM = {
  etiqueta: "Solução complementar",
  title: "Totem de autoatendimento",
  text: "O cliente faz o pedido direto no totem, paga ali mesmo e recebe o número da mesa ou da retirada. Mais agilidade e menos fila no seu restaurante.",
  itens: [
    "Pagamento no cartão pela maquininha ou por Pix na tela",
    "Senha impressa e chamada no telão do salão",
    "O mesmo cardápio do delivery e do salão, sem cadastro em dobro",
  ],
  botao: "Saiba mais sobre o totem",
  nota: "Disponível no plano Completo. Fale com a gente para montar junto com o seu balcão.",
};

// ─── depoimentos ──────────────────────────────────────────────────────

export type Depoimento = {
  /** o restaurante que falou */
  restaurante: string;
  /** cidade e estado, como ele quiser aparecer */
  praca: string;
  /** o que ele disse, nas palavras dele */
  texto: string;
  /** quem falou, se quiser assinar */
  quem?: string;
};

/**
 * Depoimento é palavra de cliente, e só entra aqui o que um cliente
 * realmente disse.
 *
 * A lista nasce vazia de propósito: sem depoimento de verdade, a seção
 * inteira não aparece na página, do mesmo jeito que a pergunta sem
 * resposta. Inventar elogio é o tipo de coisa que, descoberta uma vez,
 * derruba a confiança no resto -- e quem vende sistema para o vizinho não
 * tem como se dar a esse luxo.
 *
 * Para publicar: peça a frase ao dono, pergunte se pode usar o nome do
 * restaurante, e cole aqui do jeito que ele falou.
 */
export const DEPOIMENTOS: Depoimento[] = [];

// ─── como começar ─────────────────────────────────────────────────────

export const COMECAR = [
  { title: "Deixe seu contato", text: "Leva 1 minuto." },
  { title: "A gente te chama no WhatsApp", text: "E monta o cardápio junto com você." },
  { title: "Seu link fica pronto", text: "É só divulgar e receber pedidos." },
];

// ─── dúvidas ──────────────────────────────────────────────────────────

/** pergunta sem resposta não aparece na página */
export const DUVIDAS = [
  {
    q: "Preciso ter computador?",
    a: "Não. O painel funciona no celular. O computador só é necessário para a impressão automática.",
  },
  {
    q: "Preciso saber mexer em sistema?",
    a: "Não. A gente monta seu cardápio e te ensina.",
  },
  {
    q: "Posso usar só o salão, sem delivery?",
    a: "Pode. O plano Completo traz os dois, mas nada obriga você a ligar o delivery. Muita gente começa só com as mesas.",
  },
  {
    q: "O garçom precisa de celular da empresa?",
    a: "Não. Funciona no celular dele mesmo, pelo navegador, com o CPF e a senha que você cadastrar. Se o restaurante tiver maquininha Android, também roda nela.",
  },
  {
    q: "Dá para trocar de plano depois?",
    a: "Dá, a qualquer momento. Começa no Essencial e sobe quando precisar, sem perder nada do que já está cadastrado.",
  },
  // TODO: responder sobre fidelidade (enquanto estiver vazio, a pergunta não aparece)
  { q: "Tem fidelidade?", a: "" },
  {
    q: "E se eu tiver problema?",
    a: "O suporte está incluso: é só chamar no WhatsApp.",
  },
];

// ─── chamada final ────────────────────────────────────────────────────

export const FINAL = {
  recado: "Vamos conversar?",
  titulo: "Mais tempo para o que realmente importa: seus clientes.",
  texto: "Fale agora com a nossa equipe e tire suas dúvidas sobre o sistema.",
  botao: "Quero falar no WhatsApp",
};
