// Do que se trata o pedido de ajuda.
//
// Fica fora do arquivo de ações porque um módulo "use server" só pode
// exportar função: uma lista ali vira erro em tempo de execução, e só na
// hora em que a tela abre.
//
// Serve para a resposta já vir do lado certo -- impressora e cartão não se
// resolvem do mesmo jeito --, e não para classificar o problema de quem
// está no meio do movimento.
export const ASSUNTOS = ["Pedido", "Impressora", "Cardápio", "Pagamento", "Totem", "Outro"] as const;

export type Assunto = (typeof ASSUNTOS)[number];
