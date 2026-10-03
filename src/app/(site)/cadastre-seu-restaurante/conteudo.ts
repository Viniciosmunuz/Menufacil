import { BellRing, Link2, ListChecks, Percent, Printer, ToggleLeft, type LucideIcon } from "lucide-react";

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
export const WHATSAPP = "5592999130838"; // (92) 99913-0838
export const WHATSAPP_MSG = "Olá! Quero saber mais sobre o MenuFácil para o meu restaurante.";

/** endereço do botão "Prefiro falar no WhatsApp"; null quando não há contato */
export function linkDoWhatsapp() {
  const contato = WHATSAPP.trim();
  if (!contato) return null;
  if (contato.startsWith("http")) return contato;
  return `https://wa.me/${contato.replace(/\D/g, "")}?text=${encodeURIComponent(WHATSAPP_MSG)}`;
}

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
  /** frase curta acima da lista, quando o plano soma ao anterior */
  herda?: string;
};

export const PLANOS: Plano[] = [
  {
    nome: "Plano Essencial",
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
    botao: "Quero o plano Essencial",
  },
  {
    nome: "Plano 100% Delivery",
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
    title: "Cardápio na sua mão",
    text: "Acabou um prato? Marque como esgotado e ele some na hora.",
  },
];

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
  // TODO: responder sobre fidelidade (enquanto estiver vazio, a pergunta não aparece)
  { q: "Tem fidelidade?", a: "" },
  {
    q: "E se eu tiver problema?",
    a: "O suporte está incluso: é só chamar no WhatsApp.",
  },
];
