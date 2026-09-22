// Opções de produto (Tamanho, Sabor, Porção...). As mesmas regras valem na
// tela do cliente (para mostrar e travar o botão) e no servidor (que confere
// de novo e calcula o preço com os valores do banco).

export type OptionData = { id: string; name: string; priceCents: number; available: boolean };
export type OptionGroupData = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  /** meio a meio: aceita 2 opções (sabores), cobrando a mais cara */
  halfHalf: boolean;
  /** opção de outro grupo a partir da qual o meio a meio vale; null = sempre */
  halfFromOptionId: string | null;
  options: OptionData[];
};

/** a opção "a partir de" do meio a meio e o grupo dela (ex.: Tamanho / Pequena) */
function halfFrom(group: OptionGroupData, groups: OptionGroupData[]) {
  if (!group.halfFromOptionId) return null;
  for (const g of groups) {
    const index = g.options.findIndex((o) => o.id === group.halfFromOptionId);
    if (index >= 0) return { group: g, index, option: g.options[index] };
  }
  return null;
}

/** o meio a meio vale com a escolha atual? (ex.: escolheu Pequena ou maior) */
export function halfAllowed(group: OptionGroupData, groups: OptionGroupData[], selected: string[]) {
  if (!group.halfHalf) return false;
  const from = halfFrom(group, groups);
  if (!from) return true;
  return from.group.options.slice(from.index).some((o) => selected.includes(o.id));
}

/** "a partir de Pequena (4 fatias)": texto de onde o meio a meio começa a valer */
export function halfFromLabel(group: OptionGroupData, groups: OptionGroupData[]) {
  const from = halfFrom(group, groups);
  if (!from) return null;
  return from.index === 0 ? null : from.option.name;
}

/** quantas opções o grupo aceita agora */
export function effectiveMax(group: OptionGroupData, groups: OptionGroupData[], selected: string[]) {
  return halfAllowed(group, groups, selected) ? Math.max(group.maxSelect, 2) : group.maxSelect;
}

const chosenIn = (g: OptionGroupData, selected: string[]) => g.options.filter((o) => selected.includes(o.id));
const isHalf = (g: OptionGroupData, chosen: OptionData[]) => g.halfHalf && chosen.length > 1;

/** texto do que foi escolhido, na ordem dos grupos: "Tamanho: Grande · Sabor: ½ Calabresa + ½ Portuguesa" */
export function optionsText(groups: OptionGroupData[], selected: string[]) {
  const parts = groups
    .map((g) => {
      const chosen = chosenIn(g, selected);
      if (!chosen.length) return null;
      return isHalf(g, chosen) ? `${g.name}: ${chosen.map((o) => `½ ${o.name}`).join(" + ")}` : `${g.name}: ${chosen.map((o) => o.name).join(", ")}`;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** soma das opções escolhidas; no meio a meio, vale a opção mais cara */
export function optionsPrice(groups: OptionGroupData[], selected: string[]) {
  return groups.reduce((sum, g) => {
    const prices = chosenIn(g, selected).map((o) => o.priceCents);
    if (!prices.length) return sum;
    return sum + (g.halfHalf && prices.length > 1 ? Math.max(...prices) : prices.reduce((s, p) => s + p, 0));
  }, 0);
}

/** o que falta ou sobra em cada grupo; lista vazia = escolha válida */
export function selectionProblems(groups: OptionGroupData[], selected: string[]) {
  const known = new Set(groups.flatMap((g) => g.options.map((o) => o.id)));
  const problems: string[] = [];
  if (selected.some((id) => !known.has(id)) || new Set(selected).size !== selected.length) {
    problems.push("Uma opção escolhida não existe mais. Escolha de novo.");
  }
  for (const g of groups) {
    const chosen = chosenIn(g, selected);
    const max = effectiveMax(g, groups, selected);
    if (chosen.some((o) => !o.available)) problems.push(`${g.name}: uma opção escolhida acabou.`);
    if (chosen.length < g.minSelect) problems.push(g.minSelect === 1 ? `Escolha ${g.name.toLowerCase()}.` : `${g.name}: escolha pelo menos ${g.minSelect}.`);
    if (chosen.length > max) {
      const from = g.halfHalf ? halfFromLabel(g, groups) : null;
      problems.push(from ? `Meio a meio só a partir de ${from}.` : `${g.name}: escolha no máximo ${max}.`);
    }
  }
  return problems;
}

/** depois de trocar uma opção: cada grupo fica com no máximo o que aceita agora (mantém as primeiras) */
export function trimSelection(groups: OptionGroupData[], selected: string[]) {
  let result = selected;
  for (const g of groups) {
    const max = effectiveMax(g, groups, result);
    const mine = result.filter((id) => g.options.some((o) => o.id === id));
    if (mine.length > max) {
      const drop = new Set(mine.slice(max));
      result = result.filter((id) => !drop.has(id));
    }
  }
  return result;
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
