import type { NivelGarcom } from "@/generated/prisma/enums";

// Os níveis do garçom, em palavras.
//
// Fica aqui, e não no servidor, porque a tela do cadastro e a do garçom
// são do lado do cliente: o que o servidor guarda é a letra do enum, e o
// que a pessoa lê é isto.

export const NIVEIS: { chave: NivelGarcom; nome: string; resumo: string }[] = [
  {
    chave: "GARCOM",
    nome: "Garçom",
    resumo: "Lança pedido e recebe pagamento. A mesa fica aberta com o que ele recebeu; quem fecha é o balcão.",
  },
  {
    chave: "GARCOM_II",
    nome: "Garçom II",
    resumo:
      "Faz na mesa o mesmo que você: apaga item já impresso, dá desconto, acrescenta valor, troca a mesa de lugar, move item de uma mesa para outra, finaliza e apaga a comanda.",
  },
];

export const NOME_DO_NIVEL: Record<NivelGarcom, string> = { GARCOM: "Garçom", GARCOM_II: "Garçom II" };
