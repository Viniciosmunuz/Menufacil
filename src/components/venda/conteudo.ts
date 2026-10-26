import { WHATSAPP_MENUFACIL, linkWhatsappMenuFacil } from "@/lib/contato";

import {
  BellRing,
  ClipboardList,
  HandPlatter,
  Link2,
  ListChecks,
  Percent,
  Printer,
  Receipt,
  ShieldCheck,
  Split,
  ToggleLeft,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// ============================================================
// O que você muda nesta página
//
// Tudo o que é texto comercial (preço, itens do plano, link da
// demonstração, WhatsApp, perguntas) está aqui. Mexa só neste arquivo:
// o desenho da página fica em sections.tsx e não precisa ser tocado.
// ============================================================

/** como o programa do balcão se chama para o restaurante */
export const NOME_DO_APP = "Menu Fácil para PC";

/** cardápio que abre no botão "Fazer um pedido de teste" */
// TODO: trocar por /restaurante/demonstracao quando o restaurante de demonstração existir
export const DEMO_URL = "/restaurante/papaleguas";

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

export type Plano = {
  nome: string;
  preco: string;
  periodo: string;
  /** uma linha dizendo para quem é */
  resumo: string;
  itens: string[];
  /** o que aparece no botão */
  botao: string;
  /** o cartão em evidência; só um deve ter */
  destaque?: boolean;
  /** selo acima do nome, quando há o que dizer */
  selo?: string;
  /** frase curta acima da lista, quando o plano soma ao anterior */
  herda?: string;
};

export const PLANOS: Plano[] = [
  {
    nome: "Essencial",
    preco: "R$ 100",
    periodo: "/mês",
    resumo: "O cardápio no link e o pedido chegando no seu WhatsApp.",
    itens: [
      "Cardápio digital com link próprio",
      "Pedido pronto no seu WhatsApp",
      "Painel de pedidos com aviso sonoro",
      `Impressão automática com o ${NOME_DO_APP}`,
      "Montagem do cardápio feita por nós",
      "Suporte incluso: chamou, a gente atende",
      "Sem comissão por pedido",
    ],
    botao: "Quero o Essencial",
  },
  {
    nome: "100% Delivery",
    preco: "R$ 180",
    periodo: "/mês",
    resumo: "O pedido inteiro dentro do sistema, já pago, sem sair para conversa nenhuma.",
    herda: "Tudo do Essencial, e mais:",
    itens: [
      "Cliente paga por Pix na hora, na própria tela",
      "O dinheiro cai direto na sua conta do Mercado Pago",
      "O pedido só vira comanda depois de pago",
      "Cliente acompanha cada passo sem precisar perguntar",
      "Conversa com o cliente dentro do pedido",
      "Continua sem comissão: nem um centavo da venda",
    ],
    botao: "Quero o 100% Delivery",
  },
  {
    nome: "Completo",
    preco: "R$ 280",
    periodo: "/mês",
    resumo: "O delivery e o salão no mesmo sistema, com o mesmo cardápio.",
    selo: "Delivery + salão",
    herda: "Tudo do 100% Delivery, e mais:",
    itens: [
      "Mapa de mesas: quem está ocupado, há quanto tempo e quanto já consumiu",
      "Garçom lança o pedido pelo celular, com CPF e senha dele",
      "Comanda sai na cozinha na hora, separada por setor",
      "Conta da mesa impressa, com desconto, taxa e divisão por pessoa",
      "Caixa com abertura, sangria e relatório do dia",
      "Cada garçom com a permissão que você der",
      "Totem de autoatendimento disponível (consulte)",
    ],
    botao: "Quero o Completo",
    destaque: true,
  },
];

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
    icon: BellRing,
    title: "Aviso na hora, com som",
    text: "Pedido novo apita no celular, no tablet ou no computador.",
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
];

/** o módulo de salão, que é o que o plano Completo acrescenta */
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

/** o totem entra como recurso do plano de cima, sem preço fechado */
export const TOTEM = {
  title: "Totem de autoatendimento",
  text: "O cliente monta o pedido sozinho num tablet no balcão, paga no cartão ou no Pix ali mesmo, e a senha dele aparece no telão. O cardápio é o mesmo: o que você esgota no painel some do totem na hora.",
  itens: [
    "Pagamento no cartão pela maquininha ou por Pix na tela",
    "Senha impressa e chamada no telão do salão",
    "Funciona junto com o delivery e o salão, sem cadastro em dobro",
  ],
  nota: "Disponível no plano Completo. Fale com a gente para montar junto com o seu balcão.",
};

export const PASSOS = [
  { title: "Deixe seu contato", text: "Leva 1 minuto." },
  { title: "A gente te chama no WhatsApp", text: "E monta o cardápio junto com você." },
  { title: "Seu link fica pronto", text: "É só divulgar e receber pedidos." },
];

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

/** os três "não" que o dono de restaurante quer ouvir, no alto da página */
export const PROMESSAS = [
  { icon: Percent, text: "Sem comissão por pedido" },
  { icon: ClipboardList, text: "Sem taxa de adesão" },
  { icon: BellRing, text: "Suporte incluso" },
];
