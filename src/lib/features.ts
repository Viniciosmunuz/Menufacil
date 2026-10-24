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
  /**
   * Pronto, mas fora do ar por decisão de negócio.
   *
   * Some do painel do admin e o servidor responde como se a tela não
   * existisse, em qualquer restaurante -- inclusive nos que estão com a
   * coluna ligada no banco. O código inteiro fica onde está, e voltar é
   * apagar esta marca: nenhuma migration, nenhum dado perdido.
   */
  foraDoAr?: boolean;
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
    // O MenuFácil está focado em delivery e totem: o salão sai do ar até
    // voltar a ser prioridade. Está pronto e testado -- é só tirar esta
    // linha para ele reaparecer, com os dados de quem já usou intactos.
    foraDoAr: true,
  },
];

/** os recursos que o admin pode mexer hoje */
export const FEATURES_NO_AR = FEATURES.filter((f) => !f.foraDoAr);

/** este recurso está no ar? a pergunta que o servidor faz antes de abrir a tela */
export const noAr = (key: FeatureKey) => !FEATURES.find((f) => f.key === key)?.foraDoAr;

export type RestaurantFeatures = Record<FeatureKey, boolean>;
