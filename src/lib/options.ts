// Opções de produto (Tamanho, Sabor, Porção...). As mesmas regras valem na
// tela do cliente (para mostrar e travar o botão) e no servidor (que confere
// de novo e calcula o preço com os valores do banco).

export type OptionData = { id: string; name: string; priceCents: number; available: boolean };
export type OptionGroupData = { id: string; name: string; minSelect: number; maxSelect: number; options: OptionData[] };

/** texto do que foi escolhido, na ordem dos grupos: "Tamanho: Grande · Sabor: Calabresa" */
export function optionsText(groups: OptionGroupData[], selected: string[]) {
  const parts = groups
    .map((g) => {
      const names = g.options.filter((o) => selected.includes(o.id)).map((o) => o.name);
      return names.length ? `${g.name}: ${names.join(", ")}` : null;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** soma das opções escolhidas */
export function optionsPrice(groups: OptionGroupData[], selected: string[]) {
  return groups.flatMap((g) => g.options).reduce((sum, o) => sum + (selected.includes(o.id) ? o.priceCents : 0), 0);
}

/** o que falta ou sobra em cada grupo; lista vazia = escolha válida */
export function selectionProblems(groups: OptionGroupData[], selected: string[]) {
  const known = new Set(groups.flatMap((g) => g.options.map((o) => o.id)));
  const problems: string[] = [];
  if (selected.some((id) => !known.has(id)) || new Set(selected).size !== selected.length) {
    problems.push("Uma opção escolhida não existe mais. Escolha de novo.");
  }
  for (const g of groups) {
    const chosen = g.options.filter((o) => selected.includes(o.id));
    if (chosen.some((o) => !o.available)) problems.push(`${g.name}: uma opção escolhida acabou.`);
    if (chosen.length < g.minSelect) problems.push(g.minSelect === 1 ? `Escolha ${g.name.toLowerCase()}.` : `${g.name}: escolha pelo menos ${g.minSelect}.`);
    if (chosen.length > g.maxSelect) problems.push(`${g.name}: escolha no máximo ${g.maxSelect}.`);
  }
  return problems;
}

/** menor preço possível: produto + a opção mais barata de cada grupo obrigatório */
export function startingPrice(basePriceCents: number, groups: OptionGroupData[]) {
  const extra = groups
    .filter((g) => g.minSelect > 0)
    .reduce((sum, g) => {
      const prices = g.options
        .filter((o) => o.available)
        .map((o) => o.priceCents)
        .sort((a, b) => a - b);
      return sum + prices.slice(0, g.minSelect).reduce((s, p) => s + p, 0);
    }, 0);
  return basePriceCents + extra;
}

/** alguma opção muda o preço: o cardápio mostra "a partir de" */
export const hasPricedOptions = (groups: OptionGroupData[]) => groups.some((g) => g.options.some((o) => o.priceCents > 0));

/** "Carne de sol (Porção: Inteira)" para mensagens e resumos */
export const itemLabel = (i: { productName: string; optionsText?: string | null }) =>
  i.optionsText ? `${i.productName} (${i.optionsText})` : i.productName;
