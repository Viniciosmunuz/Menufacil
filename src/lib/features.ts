// Recursos que o admin da plataforma libera restaurante por restaurante.
//
// Cada um é uma coluna Boolean no restaurante. O que já está no ar nasce
// ligado; o que ainda está sendo construído nasce desligado e aparece
// marcado como tal, para ninguém achar que ligar a chave já faz alguma
// coisa. Quem confere de verdade é o servidor, não a tela.

export type FeatureKey = "printEnabled" | "totemEnabled" | "fullDeliveryEnabled" | "salaoEnabled";

export type Feature = {
  key: FeatureKey;
  label: string;
  hint: string;
  /** ainda em construção: a chave fica guardada, mas não muda nada hoje */
  soon?: boolean;
};

export const FEATURES: Feature[] = [
  {
    key: "printEnabled",
    label: "Menu Fácil para PC",
    hint: "O painel instalado no computador do balcão, com impressão automática da comanda.",
  },
  {
    key: "totemEnabled",
    label: "Totem de autoatendimento",
    hint: "Tela de toque no balcão, com a maquininha Point do próprio restaurante. Libera a seção Totem no painel dele, logo abaixo do Menu Fácil para PC.",
  },
  {
    key: "fullDeliveryEnabled",
    label: "100% Delivery",
    hint: "O pedido todo dentro do MenuFácil: Pix pela conta do próprio restaurante, acompanhamento e conversa com o cliente. Libera a seção Entrega no painel dele, onde ele escolhe entre continuar no WhatsApp ou passar para o 100% Delivery.",
  },
  {
    key: "salaoEnabled",
    label: "Salão",
    hint: "Atendimento na mesa: mapa do salão, comandas e garçons com login próprio, lançando pelo mesmo cardápio dos outros canais. Libera a seção Salão no painel dele, logo abaixo de Pedidos.",
  },
];

export type RestaurantFeatures = Record<FeatureKey, boolean>;
