import type { NivelGarcom } from "@/generated/prisma/enums";

// O que cada garçom pode fazer na mesa, chave por chave.
//
// Antes eram dois níveis, e eles davam conta enquanto o salão fazia pouca
// coisa. Agora o garçom pode transferir mesa, mover item, dar desconto,
// cobrar taxa, desfazer recebimento e apagar a comanda inteira -- e no
// balcão de verdade essas confianças não andam juntas: há casa que deixa o
// garçom dar desconto mas não apagar comanda, e o contrário também.
//
// O nível continua existindo e continua mandando enquanto o dono não mexer
// em nada: quem nunca abrir esta tela segue com o comportamento de sempre.
// Ao ligar ou desligar a primeira chave, o conjunto passa a valer por cima
// do nível, e é ele que o servidor confere.

export type ChaveDaPermissao =
  | "renomearMesa"
  | "transferirMesa"
  | "transferirItens"
  | "apagarComanda"
  | "excluirItem"
  | "imprimirConta"
  | "desconto"
  | "acrescimo"
  | "desfazerPagamento"
  | "finalizarMesa";

export type PermissoesDoSalao = Record<ChaveDaPermissao, boolean>;

export const GRUPOS: { titulo: string; chaves: { chave: ChaveDaPermissao; nome: string; resumo: string }[] }[] = [
  {
    titulo: "Mesa",
    chaves: [
      { chave: "renomearMesa", nome: "Dar nome à mesa", resumo: "Trocar “Mesa 7” pelo nome de quem está sentado." },
      { chave: "imprimirConta", nome: "Imprimir a conta", resumo: "Mandar a conta parcial para a impressora do balcão." },
      { chave: "transferirMesa", nome: "Transferir a mesa", resumo: "Levar a comanda inteira para outra mesa." },
      { chave: "transferirItens", nome: "Transferir itens", resumo: "Mandar alguns itens desta mesa para outra." },
      { chave: "excluirItem", nome: "Apagar item da conta", resumo: "Tirar da conta um item que já foi para a cozinha." },
      { chave: "apagarComanda", nome: "Apagar a comanda", resumo: "Zerar a mesa inteira, com o que já foi recebido nela." },
    ],
  },
  {
    titulo: "Financeiro",
    chaves: [
      { chave: "desconto", nome: "Dar desconto", resumo: "Abater valor da conta da mesa." },
      { chave: "acrescimo", nome: "Cobrar taxa de serviço", resumo: "Acrescentar valor à conta da mesa." },
      { chave: "desfazerPagamento", nome: "Desfazer um recebimento", resumo: "Tirar da conta um pagamento lançado errado." },
      { chave: "finalizarMesa", nome: "Finalizar a mesa", resumo: "Fechar a conta e liberar a mesa para a próxima pessoa." },
    ],
  },
];

export const TODAS = GRUPOS.flatMap((g) => g.chaves.map((c) => c.chave));

export const NOME_DA_CHAVE: Record<ChaveDaPermissao, string> = Object.fromEntries(
  GRUPOS.flatMap((g) => g.chaves.map((c) => [c.chave, c.nome])),
) as Record<ChaveDaPermissao, string>;

/** o conjunto que cada nível sempre teve: é o que vale enquanto ninguém mexe */
export function doNivel(nivel: NivelGarcom): PermissoesDoSalao {
  // o Garçom II fazia na mesa o mesmo que o dono
  if (nivel === "GARCOM_II") return Object.fromEntries(TODAS.map((c) => [c, true])) as PermissoesDoSalao;
  // o Garçom lança e recebe; dar nome à mesa e tirar a conta no papel são
  // parte de atender, e sempre estiveram liberados
  return {
    renomearMesa: true,
    imprimirConta: true,
    transferirMesa: false,
    transferirItens: false,
    excluirItem: false,
    apagarComanda: false,
    desconto: false,
    acrescimo: false,
    desfazerPagamento: false,
    finalizarMesa: false,
  };
}

/** o dono pode tudo, e o Garçom II também: é o que o nível dele quer dizer */
export const TUDO: PermissoesDoSalao = Object.fromEntries(TODAS.map((c) => [c, true])) as PermissoesDoSalao;

/**
 * O que está gravado no vínculo, lido com cuidado.
 *
 * O campo é Json porque o conjunto de chaves ainda vai crescer, e uma
 * migration por chave seria custo sem retorno. Em troca, nada garante a
 * forma do que está lá dentro -- por isso a leitura passa toda por aqui, e
 * o que não for booleano cai no padrão do nível.
 */
export function permissoesDoVinculo(nivel: NivelGarcom, guardado: unknown): PermissoesDoSalao {
  const padrao = doNivel(nivel);
  if (!guardado || typeof guardado !== "object" || Array.isArray(guardado)) return padrao;

  const bruto = guardado as Record<string, unknown>;
  const fora = { ...padrao };
  for (const chave of TODAS) {
    if (typeof bruto[chave] === "boolean") fora[chave] = bruto[chave];
  }
  return fora;
}

/** o que vai para o banco: só as chaves conhecidas, só booleanos */
export function limparPermissoes(formData: FormData): PermissoesDoSalao {
  return Object.fromEntries(TODAS.map((c) => [c, formData.get(c) === "on"])) as PermissoesDoSalao;
}

/**
 * O que a tela da mesa precisa saber. É o conjunto de chaves mais a
 * pergunta derivada que o botão de transferir faz.
 */
export type PodeNaMesa = PermissoesDoSalao & { mexerNaMesa: boolean };
