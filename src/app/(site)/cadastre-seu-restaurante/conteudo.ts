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

/** WhatsApp da equipe MenuFácil: só números, com 55 e o DDD. Vazio = o botão não aparece. */
// TODO: preencher, ex.: "5592999990000"
export const WHATSAPP = "";
export const WHATSAPP_MSG = "Olá! Quero saber mais sobre o MenuFácil para o meu restaurante.";

export const PLANO = {
  nome: "Plano Essencial",
  preco: "R$ 120",
  periodo: "/mês",
  /** linha curta que aparece embaixo do botão do topo */
  resumo: "Plano Essencial · R$ 120/mês · suporte incluso",
  itens: [
    "Cardápio digital com link próprio",
    "Painel de pedidos com aviso sonoro",
    `Impressão automática com o ${NOME_DO_APP}`,
    "Montagem do cardápio feita por nós",
    "Suporte incluso: chamou, a gente atende",
    "Sem comissão por pedido",
  ],
};

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
