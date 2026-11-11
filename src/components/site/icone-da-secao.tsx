import {
  Beef,
  Beer,
  CakeSlice,
  Coffee,
  Croissant,
  CupSoda,
  Drumstick,
  Fish,
  Hamburger,
  IceCreamCone,
  LeafyGreen,
  Pizza,
  Popcorn,
  Salad,
  Soup,
  Utensils,
  Wheat,
  Wine,
  type LucideIcon,
} from "lucide-react";

/**
 * O ícone de uma seção do cardápio, adivinhado pelo nome que o dono deu.
 *
 * Por que adivinhar em vez de cadastrar: ninguém ia preencher. O dono
 * cadastra o cardápio inteiro de madrugada, com o restaurante para abrir no
 * dia seguinte; um campo a mais por seção seria um campo vazio em todo
 * restaurante. Assim funciona sozinho, no dia seguinte, em todos eles --
 * inclusive nos que já estão no ar.
 *
 * **Sem palpite:** o que não casa fica sem ícone nenhum. Seção com nome
 * próprio ("Promoção da semana", "Combo do Zé") não ganha um ícone errado,
 * que seria pior do que não ter. Por isso a lista só tem o que é inequívoco.
 *
 * A ordem importa: ganha o primeiro que casar. "Salada de frango" é salada,
 * não frango, e por isso salada vem antes.
 */
const REGRAS: [termos: string[], icone: LucideIcon][] = [
  [["salada"], Salad],
  [["caldo", "sopa", "canja"], Soup],
  [["pizza", "calzone"], Pizza],
  [["massa", "macarrao", "lasanha", "espaguete", "nhoque", "talharim", "penne"], Wheat],
  [["lanche", "burger", "burguer", "hamburguer", "sanduiche", "cachorro quente", "hot dog", "misto"], Hamburger],
  [["isca", "frango", "drumet", "tulipa"], Drumstick],
  [["porcao", "fritas", "batata", "petisco", "aperitivo", "entrada"], Popcorn],
  [["churrasco", "carne", "espetinho", "picanha", "costela", "parrilla"], Beef],
  [["sushi", "temaki", "sashimi", "combinado", "japones", "peixe", "tilapia", "camarao"], Fish],
  [["acai", "sorvete", "milkshake", "milk shake", "shake", "picole"], IceCreamCone],
  [["sobremesa", "doce", "pudim", "bolo", "torta", "brownie", "mousse"], CakeSlice],
  [["esfiha", "esfirra", "salgado", "pastel", "empada", "coxinha", "pao", "padaria"], Croissant],
  [["cerveja", "chopp", "long neck", "gelada"], Beer],
  [["vinho", "drink", "caipirinha", "coquetel", "destilado", "dose"], Wine],
  [["cafe", "cappuccino", "expresso", "chá", "cha quente"], Coffee],
  [["bebida", "refrigerante", "refri", "suco", "agua", "lata"], CupSoda],
  [["vegetariano", "vegano", "natural", "fit", "light"], LeafyGreen],
  [["marmita", "prato feito", "executivo", "almoco", "refeicao", "self service"], Utensils],
];

/** minúsculas e sem acento: o dono escreve "Porções", "PORCOES" e "porcao" */
const limpar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function iconeDaSecao(nome: string): LucideIcon | null {
  const alvo = limpar(nome);
  for (const [termos, icone] of REGRAS) {
    if (termos.some((t) => alvo.includes(limpar(t)))) return icone;
  }
  return null;
}
