// Acompanhamento dentro do prato.
//
// No balcão do Papaléguas quase ninguém pede lasanha sozinha: pede lasanha
// e dois arroz, parmegiana e um purê. O cardápio já tem a seção
// Acompanhamentos, com arroz, feijão, farofa, purê e os pães -- só que o
// cliente tinha de montar isso em linhas separadas, e a cozinha recebia um
// pedido de lasanha e outro de arroz sem saber que eram a mesma pessoa.
//
// Aqui o acompanhamento vira parte da linha do prato, com quantidade por
// item: "2x Arroz branco, 1x Purê". Sai no mesmo preço que ele tem na
// seção -- é o mesmo arroz, da mesma cozinha.
//
// O que marca quem é o quê são duas chaves no cardápio, as duas desligadas
// por padrão:
//
// - `MenuCategory.addons`: esta seção é o catálogo de acompanhamentos. Os
//   produtos dela continuam à venda sozinhos, como sempre.
// - `Product.allowAddons`: este prato oferece esses acompanhamentos.
//
// Desenhado em cima de `pizza.ts`, que já resolve o mesmo problema para os
// sabores: um catálogo de produtos referenciado por id dentro de outro
// produto.

/** um acompanhamento do catálogo, do jeito que a tela e o servidor usam */
export type Addon = {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
};

/** o que o cliente escolheu: o id e quantos */
export type AddonPick = { productId: string; quantity: number };

/** no máximo isto de cada acompanhamento, para ninguém digitar 99 arroz */
export const MAX_POR_ADDON = 10;

export const acceptsAddons = (product: { allowAddons?: boolean | null }) => product.allowAddons === true;

/** só o que vale somar: existe no catálogo, está disponível e tem quantidade */
function valid(addons: Addon[], picks: AddonPick[]) {
  return picks
    .map((p) => ({ addon: addons.find((a) => a.id === p.productId), quantity: Math.trunc(p.quantity) }))
    .filter((x): x is { addon: Addon; quantity: number } => !!x.addon && x.addon.available && x.quantity > 0);
}

/** quanto os acompanhamentos somam ao prato, em centavos */
export function addonsPrice(addons: Addon[], picks: AddonPick[]) {
  return valid(addons, picks).reduce((soma, { addon, quantity }) => soma + addon.priceCents * quantity, 0);
}

/** "2x Arroz branco, 1x Purê" -- o que a cozinha lê na comanda */
export function addonsText(addons: Addon[], picks: AddonPick[]) {
  const escolhidos = valid(addons, picks);
  if (escolhidos.length === 0) return null;
  return escolhidos.map(({ addon, quantity }) => `${quantity}x ${addon.name}`).join(", ");
}

/**
 * O que impede o pedido de seguir.
 *
 * Nenhum acompanhamento é obrigatório: quem não quiser nenhum segue o
 * caminho de sempre. O que o servidor precisa barrar é escolha que não
 * existe mais, item que esgotou entre o carrinho e o envio, e quantidade
 * fora do que a tela deixa pedir.
 */
export function addonProblems(addons: Addon[], picks: AddonPick[]) {
  const problems: string[] = [];
  for (const pick of picks) {
    const quantidade = Math.trunc(pick.quantity);
    if (quantidade <= 0) continue;
    const addon = addons.find((a) => a.id === pick.productId);
    if (!addon) {
      problems.push("um acompanhamento saiu do cardápio");
      continue;
    }
    if (!addon.available) problems.push(`"${addon.name}" esgotou`);
    if (quantidade > MAX_POR_ADDON) problems.push(`no máximo ${MAX_POR_ADDON} de "${addon.name}"`);
  }
  return problems;
}

/** tira o que não vale mais, mantendo a ordem em que a pessoa escolheu */
export function trimAddons(addons: Addon[], picks: AddonPick[]): AddonPick[] {
  return valid(addons, picks).map(({ addon, quantity }) => ({
    productId: addon.id,
    quantity: Math.min(quantity, MAX_POR_ADDON),
  }));
}
