// A regra de busca do site: o que o cliente digita contra o nome do prato,
// da seção ou do restaurante.
//
// Quem busca no celular digita rápido e do jeito que fala, e a busca de
// antes exigia o texto exato. O que ela deixava passar, e esta resolve:
//
// - acento: "hamburguer" acha "Hambúrguer";
// - hífen e pontuação: "x salada" e "xsalada" acham "X-Salada";
// - ordem e palavras do meio: "pizza calabresa" acha "Pizza de Calabresa"
//   (cada palavra digitada tem que aparecer, em qualquer ordem);
// - plural: "pizzas" acha "Pizza".

/** sem acento, minúsculo, pontuação virando espaço, espaços juntos */
export function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** as palavras da busca, já normalizadas; vazio quando não há o que buscar */
export function palavrasDaBusca(consulta: string) {
  return normalizar(consulta).split(" ").filter(Boolean);
}

/**
 * O texto (já normalizado) tem todas as palavras da busca?
 *
 * Cada palavra vale se aparecer no texto, se aparecer no texto sem os
 * espaços ("xsalada" em "x salada") ou, terminando em "s", se o singular
 * aparecer ("pizzas" em "pizza").
 */
export function combina(textoNormalizado: string, palavras: string[]) {
  if (palavras.length === 0) return true;
  const junto = textoNormalizado.replaceAll(" ", "");
  return palavras.every((p) => {
    if (textoNormalizado.includes(p) || junto.includes(p)) return true;
    if (p.length > 3 && p.endsWith("s")) {
      const singular = p.slice(0, -1);
      return textoNormalizado.includes(singular) || junto.includes(singular);
    }
    return false;
  });
}
