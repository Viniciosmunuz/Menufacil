/**
 * As legendas, geradas dos tempos medidos na narração editada.
 *
 * **Elas existem porque metade do LinkedIn assiste sem som.** O resto da
 * tela fala com quem ouve; esta faixa fala com quem está numa reunião,
 * num ônibus, ou simplesmente não liga o áudio de ninguém.
 *
 * Cada linha é [começo, fim, texto], em segundos. Não foram escritas à
 * mão: saíram do silencedetect sobre o MP3 já editado, frase por frase.
 * Se o áudio mudar, este arquivo é gerado de novo -- legenda fora de
 * sincronia é pior que legenda nenhuma.
 */
export const LEGENDAS: ReadonlyArray<readonly [number, number, string]> = [
  [0.05, 2.985, "Como estou construindo um sistema de delivery do zero."],
  [3.265, 4.014, "Menu Fácil:"],
  [4.294, 6.537, "a engenharia por trás de um produto real."],
  [6.957, 10.31, "Hoje são 159 mil linhas de TypeScript,"],
  [10.59, 12.486, "45 modelos no Postgres,"],
  [12.766, 16.273, "60 migrations aplicadas e 20 rotas de API."],
  [16.693, 19.123, "O pedido chega no WhatsApp como texto livre."],
  [19.403, 21.045, "Precisa virar um registro válido:"],
  [21.325, 24.969, "produto, opção, taxa de entrega, total em centavos."],
  [25.389, 27.097, "A mensagem entra por um webhook,"],
  [27.377, 29.493, "passa pelo Claude com cinco ferramentas,"],
  [29.773, 31.488, "e vira pedido gravado no banco."],
  [31.768, 34.352, "O balcão acende e a comanda sai na impressora."],
  [34.772, 37.631, "E aqui está a decisão mais importante do projeto:"],
  [37.911, 39.846, "o modelo não define preço."],
  [40.126, 44.787, "Quem calcula o total é o servidor, contra o banco, aplicando as regras de negócio."],
  [45.067, 46.388, "A IA só confirma."],
  [46.808, 49.501, "Toda entrada é validada antes de encostar no banco."],
  [49.781, 52.538, "E dois sim seguidos não viram dois pedidos:"],
  [52.818, 54.787, "quem apaga o rascunho é quem grava."],
  [55.207, 59.948, "Pagamento no Pix, com a cobrança gerada na hora e o cliente avisado quando o dinheiro cai."],
  [60.368, 61.125, "Menu Fácil."],
  [61.405, 63.026, "Mais do que um cardápio digital:"],
  [63.306, 66.413, "um produto de tecnologia em constante evolução."],
] as const;
