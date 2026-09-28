// Pizza de vários sabores. As mesmas regras valem na tela do cliente (para
// mostrar e travar o botão) e no servidor (que confere de novo e calcula o
// preço com os valores do banco).
//
// O desenho: os sabores são produtos comuns, nas categorias que o
// restaurante marcou como catálogo de sabores (Especiais, Tradicionais).
// Eles têm nome, descrição, preço e disponibilidade como qualquer produto,
// e é isso que o dono já sabe editar. A "Pizza de 2 sabores" é um montador
// que lista esses sabores e pede duas escolhas.
//
// Tamanho: cada sabor pode ter preço por tamanho (Pequena, Média, Grande),
// nas opções do próprio sabor. O montador mostra os tamanhos e, escolhido
// um, cada sabor vale o preço dele naquele tamanho.
//
// O preço de uma pizza com mais de um sabor é o do sabor MAIS CARO, nunca a
// soma nem a média: é assim que a pizzaria cobra.

export type FlavorSize = { name: string; priceCents: number; available: boolean };

export type PizzaFlavor = {
  id: string;
  name: string;
  description: string | null;
  /** preço quando o sabor não tem tamanhos */
  priceCents: number;
  available: boolean;
  /** preços por tamanho, quando o sabor trabalha com tamanhos */
  sizes: FlavorSize[];
  /** a categoria do sabor, que vira o título do bloco: "Pizzas especiais" */
  categoryId: string;
  categoryName: string;
};

/** quantos sabores esta pizza pede; null quando o produto não é pizza montada */
export const flavorSlots = (product: { pizzaFlavors?: number | null }) =>
  product.pizzaFlavors && product.pizzaFlavors > 0 ? product.pizzaFlavors : null;

/** os tamanhos do cardápio de pizza, na ordem em que os sabores os trazem */
export function pizzaSizes(flavors: PizzaFlavor[]) {
  const nomes: string[] = [];
  for (const flavor of flavors) {
    for (const size of flavor.sizes) if (!nomes.includes(size.name)) nomes.push(size.name);
  }
  return nomes;
}

/** quanto custa este sabor no tamanho escolhido; null = não sai neste tamanho */
export function flavorPrice(flavor: PizzaFlavor, sizeName: string | null): number | null {
  if (flavor.sizes.length === 0) return flavor.priceCents;
  const size = flavor.sizes.find((s) => s.name === sizeName);
  if (!size || !size.available) return null;
  return flavor.priceCents + size.priceCents;
}

/** preço da pizza: o do sabor mais caro entre os escolhidos, no tamanho escolhido */
export function pizzaPrice(flavors: PizzaFlavor[], chosenIds: string[], sizeName: string | null = null) {
  const prices = flavors
    .filter((f) => chosenIds.includes(f.id))
    .map((f) => flavorPrice(f, sizeName))
    .filter((p): p is number => p !== null);
  return prices.length ? Math.max(...prices) : 0;
}

/** o sabor mais barato disponível: é o "a partir de" do cardápio */
export function cheapestFlavor(flavors: PizzaFlavor[], sizeName: string | null = null) {
  const sizes = pizzaSizes(flavors);
  const tamanho = sizeName ?? sizes[0] ?? null;
  const prices = flavors
    .filter((f) => f.available)
    .map((f) => flavorPrice(f, tamanho))
    .filter((p): p is number => p !== null);
  return prices.length ? Math.min(...prices) : 0;
}

/**
 * Como os sabores escolhidos aparecem no carrinho, na comanda e no
 * WhatsApp: "1/2 Portuguesa · 1/2 Calabresa". Com um sabor só, o nome
 * seco; com três, "1/3" em cada.
 */
export function flavorsText(flavors: PizzaFlavor[], chosenIds: string[], slots: number) {
  const chosen = chosenIds.map((id) => flavors.find((f) => f.id === id)).filter((f): f is PizzaFlavor => !!f);
  if (chosen.length === 0) return null;
  if (slots <= 1) return chosen.map((f) => f.name).join(", ");
  return chosen.map((f) => `1/${slots} ${f.name}`).join(" · ");
}

/** os sabores agrupados pela categoria, na ordem em que vieram */
export function flavorsByCategory(flavors: PizzaFlavor[]) {
  const grupos: { id: string; name: string; flavors: PizzaFlavor[] }[] = [];
  for (const flavor of flavors) {
    const grupo = grupos.find((g) => g.id === flavor.categoryId);
    if (grupo) grupo.flavors.push(flavor);
    else grupos.push({ id: flavor.categoryId, name: flavor.categoryName, flavors: [flavor] });
  }
  return grupos;
}

/** o que falta ou sobra na escolha dos sabores; lista vazia = pode fechar */
export function pizzaProblems(flavors: PizzaFlavor[], chosenIds: string[], slots: number, sizeName: string | null = null) {
  const problems: string[] = [];
  const known = new Set(flavors.map((f) => f.id));
  if (chosenIds.some((id) => !known.has(id)) || new Set(chosenIds).size !== chosenIds.length) {
    problems.push("Um sabor escolhido saiu do cardápio. Escolha de novo.");
    return problems;
  }
  const chosen = flavors.filter((f) => chosenIds.includes(f.id));
  if (chosen.some((f) => !f.available)) problems.push("Um sabor escolhido acabou. Escolha outro.");
  if (chosen.some((f) => flavorPrice(f, sizeName) === null)) {
    problems.push("Um sabor escolhido não sai neste tamanho. Escolha outro sabor ou outro tamanho.");
  }
  if (chosenIds.length < slots) {
    const faltam = slots - chosenIds.length;
    problems.push(slots === 1 ? "Escolha o sabor da pizza." : `Escolha ${faltam === 1 ? "mais 1 sabor" : `mais ${faltam} sabores`}.`);
  }
  if (chosenIds.length > slots) problems.push(`Esta pizza é de ${slots} ${slots === 1 ? "sabor" : "sabores"}.`);
  return problems;
}

/** o nome que o montador recebe quando o sistema cria as opções de pizza */
export const pizzaProductName = (slots: number) => (slots === 1 ? "Pizza 1 sabor" : `Pizza ${slots} sabores`);

/** a explicação que vai embaixo do nome, no cardápio */
export const pizzaProductDescription = (slots: number) =>
  slots === 1
    ? "Escolha o sabor da sua pizza."
    : `Escolha ${slots} sabores. O preço é o do sabor mais caro — sem somar nem dividir.`;

/** o nome da categoria onde as pizzas montadas ficam */
export const PIZZA_CATEGORY = "Pizza";
/** o grupo de opções do montador que guarda os tamanhos */
export const PIZZA_SIZE_GROUP = "Tamanho";
