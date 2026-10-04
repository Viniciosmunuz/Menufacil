// Quais pratos precisam dizer, na comanda, de que seção vieram.
//
// O problema é real e veio da cozinha do Papaléguas: o cardápio tem
// "Pirarucu à milanesa" nas Iscas e petiscos e "Filé de pirarucu à
// milanesa" nos Grelhados. São dois pratos diferentes, de preços
// diferentes, e o cozinheiro lia o nome na comanda e fazia o outro. Mesma
// coisa com "Carne de sol" e "Carne de sol acebolada".
//
// A primeira versão imprimia a seção em todo item. Resolvia, mas punha
// "[BEBIDAS]" embaixo de uma Coca-Cola -- uma linha de papel por item para
// informar o que ninguém tinha dúvida.
//
// Então a seção sai só onde ela desfaz confusão: quando o cardápio tem
// outro prato de nome parecido em outra seção.
//
// A conta é contra o cardápio inteiro, não contra os itens daquele pedido.
// Isso é o ponto: o cozinheiro se perde mesmo quando só um dos dois está na
// comanda -- ele lê "Pirarucu à milanesa" sozinho e já não sabe qual é.
// Comparar só dentro do pedido deixaria passar justamente o caso comum.

/** sem acento, sem pontuação, minúsculo: "Filé de Pirarucu" -> "file de pirarucu" */
function normaliza(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** as palavras de `curto` aparecem juntas, na ordem, dentro de `longo`? */
function contemAsPalavras(longo: string[], curto: string[]) {
  if (curto.length === 0 || curto.length > longo.length) return false;
  for (let i = 0; i + curto.length <= longo.length; i++) {
    if (curto.every((p, j) => longo[i + j] === p)) return true;
  }
  return false;
}

/**
 * Quantas palavras o nome curto precisa ter para um nome caber dentro do
 * outro valer como confusão.
 *
 * Sem esse piso a regra marcava um quarto do cardápio do Papaléguas, e
 * quase tudo por ingrediente: a pizza "Calabresa" cabe dentro de
 * "X-Calabresa" e de "Yakisoba de calabresa", o petisco "Bacon" cabe dentro
 * de "X-Bacon", "Camarão" cabe dentro de "Massa ao molho de camarão". Nada
 * disso confunde ninguém -- é a mesma palavra em pratos que não se parecem.
 *
 * Com três palavras sobra o que é de fato parecido: "carne de sol" dentro
 * de "carne de sol acebolada", "pirarucu a milanesa" dentro de "file de
 * pirarucu a milanesa".
 */
const MIN_PALAVRAS = 3;

/**
 * Os nomes (normalizados) que pedem a seção na comanda.
 *
 * Dois pratos entram na lista em dois casos, sempre em seções diferentes:
 *
 * - **nome igual**, e esse é o pior de todos: "1x Calabresa" na comanda não
 *   diz se é o petisco ou a pizza. Vale por si, sem piso de palavras.
 * - **um nome cabe dentro do outro** como sequência de palavras, com pelo
 *   menos MIN_PALAVRAS no mais curto -- é assim que "carne de sol" encontra
 *   "carne de sol acebolada".
 *
 * Os dois ganham a seção, não só o de nome curto: na comanda o que vale é
 * poder diferenciar um do outro.
 */
export function nomesQuePedemSecao(produtos: { name: string; categoryName: string }[]) {
  const itens = produtos.map((p) => {
    const nome = normaliza(p.name);
    return { nome, palavras: nome.split(" ").filter(Boolean), secao: normaliza(p.categoryName) };
  });

  const pedem = new Set<string>();
  for (let a = 0; a < itens.length; a++) {
    for (let b = a + 1; b < itens.length; b++) {
      const x = itens[a];
      const y = itens[b];
      if (x.secao === y.secao) continue;
      const [curto, longo] = x.palavras.length <= y.palavras.length ? [x, y] : [y, x];
      const parecidos =
        x.nome === y.nome || (curto.palavras.length >= MIN_PALAVRAS && contemAsPalavras(longo.palavras, curto.palavras));
      if (parecidos) {
        pedem.add(x.nome);
        pedem.add(y.nome);
      }
    }
  }
  return pedem;
}

/** este prato precisa da seção? */
export function pedeSecao(nomes: Set<string> | undefined, productName: string) {
  return !!nomes && nomes.has(normaliza(productName));
}
