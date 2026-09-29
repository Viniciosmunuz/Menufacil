// Recursos que o admin da plataforma libera restaurante por restaurante.
//
// Cada um é uma coluna Boolean no restaurante. O que já está no ar nasce
// ligado; o que ainda está sendo construído nasce desligado e aparece
// marcado como tal, para ninguém achar que ligar a chave já faz alguma
// coisa. Quem confere de verdade é o servidor, não a tela.

export type FeatureKey = "printEnabled" | "fullDeliveryEnabled" | "chatEnabled" | "totemEnabled";

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
    key: "fullDeliveryEnabled",
    label: "Pedido completo / 100% Delivery",
    hint: "Pagamento pelo Mercado Pago dentro do Menu Fácil, sem passar pelo WhatsApp.",
    soon: true,
  },
  {
    key: "chatEnabled",
    label: "Chat do pedido",
    hint: "Conversa entre cliente e restaurante dentro da página do pedido.",
    soon: true,
  },
  {
    key: "totemEnabled",
    label: "Totem de autoatendimento",
    hint: "Tela de toque no balcão, com a maquininha Point do próprio restaurante. Libera a seção Totem no painel dele, logo abaixo do Menu Fácil para PC.",
  },
];

export type RestaurantFeatures = Record<FeatureKey, boolean>;
