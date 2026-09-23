// Restaurantes reais implantados pela equipe. O seed cria cada um uma única
// vez (pelo endereço/slug); depois disso, tudo se ajusta pelo painel. Uma
// versão nova do cardápio (menuVersion) só entra se ninguém mexeu no
// cardápio pelo painel.
// Fotos: do Instagram do próprio restaurante e do Unsplash e Pexels (licença
// livre), em public/implantacao; algumas reaproveitam as de public/demo.
// Fotos novas (imagesVersion) só preenchem produtos que estão sem foto.
// Limites do painel: categoria 50 e descrição 200; produto 80 e 400; grupo
// de opções 40; opção 60.

/** grupo de opções; o preço de cada opção (centavos) soma ao do produto */
export type LaunchOptionGroup = {
  name: string;
  min: number;
  max: number;
  options: { name: string; price: number }[];
  /** meio a meio (2 sabores, cobra o mais caro); from = nome da opção de outro grupo a partir da qual vale */
  half?: { from?: string };
};

export type LaunchProduct = {
  name: string;
  description?: string;
  price: number;
  image?: string;
  featured?: boolean;
  options?: LaunchOptionGroup[];
};

export type LaunchRestaurant = {
  slug: string;
  name: string;
  description: string;
  categories: string[];
  logo: string;
  /** logos que a equipe já usou: se o restaurante ainda está com uma delas, o seed troca pela atual */
  previousLogos?: string[];
  cover: string;
  whatsapp: string;
  instagram: string;
  address: { street: string; number: string; neighborhood: string; city: string; state: string; zipCode: string };
  hours: { opensAt: string; closesAt: string };
  delivery: { enabled: boolean; fee: number; timeMin: number | null; timeMax: number | null };
  pickup: boolean;
  pix: { key: string; type: "PHONE" | "EMAIL" | "CPF" | "CNPJ" | "RANDOM"; holder: string | null };
  menuVersion: number;
  imagesVersion: number;
  menu: { name: string; description?: string; products: LaunchProduct[] }[];
};

type LaunchMenu = LaunchRestaurant["menu"];

/** fotos ilustrativas pelo nome do produto, para os que não têm foto própria */
function withPhotos(menu: LaunchMenu, photos: Record<string, string>): LaunchMenu {
  return menu.map((c) => ({ ...c, products: c.products.map((p) => (p.image || !photos[p.name] ? p : { ...p, image: photos[p.name] })) }));
}

const pl = (path: string) => `/implantacao/papaleguas/${path}.webp`;
const demo = (path: string) => `/demo/${path}.webp`;
const cents = (reais: number) => Math.round(reais * 100);

type Extra = Omit<LaunchProduct, "name" | "price">;

const item = (name: string, reais: number, extra: Extra = {}): LaunchProduct => ({ name, price: cents(reais), ...extra });

/** escolha obrigatória de uma opção; o preço do produto é o da mais barata e as outras somam a diferença */
function choice(name: string, entries: [string, number][]): { group: LaunchOptionGroup; base: number } {
  const base = Math.min(...entries.map(([, reais]) => reais));
  return {
    base,
    group: { name, min: 1, max: 1, options: entries.map(([label, reais]) => ({ name: label, price: cents(reais) - cents(base) })) },
  };
}

/** opção que não muda o preço (sabor, tipo de massa) */
const pick = (name: string, labels: string[]): LaunchOptionGroup => ({ name, min: 1, max: 1, options: labels.map((label) => ({ name: label, price: 0 })) });

/** produto com preço que depende de uma escolha (porção, tamanho) e, antes dela, escolhas sem preço */
function priced(name: string, groupName: string, entries: [string, number][], extra: Extra = {}, before: LaunchOptionGroup[] = []): LaunchProduct {
  const { base, group } = choice(groupName, entries);
  return item(name, base, { ...extra, options: [...before, group, ...(extra.options ?? [])] });
}

/** meia ou inteira */
const halfWhole = (name: string, meia: number, inteira: number, extra: Extra = {}, before: LaunchOptionGroup[] = []) =>
  priced(name, "Porção", [["Meia", meia], ["Inteira", inteira]], extra, before);

const SABORES_TRADICIONAIS = ["Portuguesa", "Calabresa", "Atum", "Presunto", "Milho", "Vegetariana", "Cupuaçu", "Margarita", "Romeu e Julieta", "Mussarela"];
const SABORES_ESPECIAIS = ["À moda da casa", "3 queijos", "Carne de sol com catupiry", "Frango com catupiry", "Palmito", "Bacon", "Camarão"];
const PIZZA_TRADICIONAL =
  "Portuguesa (presunto, calabresa, cebola, tomate, pimentão, ovo, azeitona, ervilha), Calabresa (calabresa, cebola), Atum (atum, cebola, azeitona), Presunto (presunto, tomate, azeitona), Milho, Vegetariana (azeitona, cogumelo, ervilha, milho verde, palmito), Cupuaçu (geleia), Margarita (tomate, manjericão), Romeu e Julieta (goiabada), Mussarela.";
const PIZZA_ESPECIAL =
  "À moda da casa (filé, cogumelo, cebola, queijo, azeitona), 3 queijos (provolone, requeijão), Carne de sol com catupiry (carne de sol, cogumelo, requeijão, cebola, azeitona), Frango com catupiry (molho de frango, requeijão), Palmito, Bacon (bacon, tomate, cebola), Camarão (molho de camarão).";
const MASSA = pick("Massa", ["Espaguete", "Talharim"]);
const ACOMPANHAMENTO = pick("Acompanhamento", ["Macaxeira", "Batata"]);
const COM_ARROZ = "com porção de arroz";
// Sabores e marcas das bebidas: o cardápio em papel só dizia "sabores
// diversos". O restaurante ajusta a lista pelo painel quando quiser.
const SABORES_REFRI = ["Coca-Cola", "Coca-Cola zero", "Guaraná Antarctica", "Fanta laranja", "Fanta uva", "Sprite"];
const SABORES_SUCO = ["Laranja", "Acerola", "Cupuaçu", "Graviola", "Maracujá", "Abacaxi", "Taperebá", "Manga"];
const SABORES_SUCO_LATA = ["Uva", "Pêssego", "Laranja", "Maracujá"];
const CERVEJA_LATA = ["Skol", "Brahma", "Antarctica", "Itaipava"];
const CERVEJA_LONG_NECK = ["Heineken", "Budweiser", "Corona", "Stella Artois"];
const CERVEJA_600 = ["Skol", "Brahma", "Antarctica", "Original"];
const PIZZA_TAMANHOS = (brotinho: number, pequena: number, grande: number): [string, number][] => [
  ["Brotinho", brotinho],
  ["Pequena (4 fatias)", pequena],
  ["Grande (8 fatias)", grande],
];

export const launchRestaurants: LaunchRestaurant[] = [
  {
    slug: "papaleguas",
    name: "Papaléguas",
    description:
      "Lanchonete e restaurante na Praça da Cultura, no Centro de Presidente Figueiredo. Grelhados, sanduíches, pizzas, yakisoba, massas e petiscos. Algumas fotos são ilustrativas.",
    categories: ["lanches", "pizzas", "massas", "porcoes", "comida-regional", "bebidas"],
    // desenho da capa do cardápio; a foto de perfil do Instagram só vem em 150 px
    logo: pl("logo-cardapio"),
    previousLogos: [pl("logo")],
    cover: pl("capa"),
    whatsapp: "5592999130838",
    instagram: "papaleguas_lanchonete_pf",
    address: { street: "Praça da Cultura", number: "Box 1", neighborhood: "Centro", city: "Presidente Figueiredo", state: "AM", zipCode: "69735000" },
    hours: { opensAt: "17:30", closesAt: "00:00" },
    // entregam ("disque entrega"), mas a taxa ainda não foi informada
    delivery: { enabled: false, fee: 0, timeMin: null, timeMax: null },
    pickup: true,
    pix: { key: "+5592994750615", type: "PHONE", holder: null },
    // v2: tamanho, sabor e meia/inteira viraram opções do produto
    // v3: pizzas meio a meio a partir da pequena
    // v4: cada tamanho de refrigerante e de cerveja é um item, com os sabores dentro
    menuVersion: 4,
    // v1: foto ilustrativa para cada produto que estava sem
    imagesVersion: 1,
    menu: withPhotos([
      {
        name: "Grelhados",
        description: "Prato individual.",
        products: [
          item("Contra filé", 34, { description: "Arroz branco, batata frita e salada.", image: pl("capa"), featured: true }),
          item("Filé de carne", 36, { description: "Arroz branco, batata frita e salada.", image: pl("file-de-carne") }),
          item("Picanha", 38, { description: "Arroz branco, macaxeira frita e salada.", image: pl("picanha"), featured: true }),
          item("Carne de sol", 34, { description: "Arroz branco e macaxeira frita." }),
          item("Filé de frango", 29, { description: "Arroz branco, batata frita e salada." }),
          item("Filé de pirarucu", 28, { description: "Arroz branco e salada." }),
          item("Filé de pirarucu à milanesa", 35, { description: "Arroz branco e purê.", image: pl("pirarucu-milanesa") }),
          item("Tambaqui grelhado", 28, { description: "Arroz branco, vinagrete e farofa.", image: pl("tambaqui") }),
          item("Parmegiana de carne", 40, {
            description: "Filé de carne à milanesa, arroz branco, purê, molho vermelho, presunto e queijo.",
            featured: true,
          }),
          item("Parmegiana de frango", 39, { description: "Filé de frango à milanesa, arroz branco, purê, molho vermelho, presunto e queijo." }),
        ],
      },
      {
        name: "Sanduíches",
        products: [
          item("X-Papaléguas", 35, {
            description: "Carne, filé, frango, calabresa, salsicha, ovo, queijo, presunto, salada e batata frita.",
            image: demo("burger/smash-duplo"),
            featured: true,
          }),
          item("X-Tudo", 24, { description: "Pão bola, carne, bacon, calabresa, salsicha, ovo, queijo, presunto e salada.", image: demo("burger/smash-duplo") }),
          item("Big X-Salada", 22, { description: "Pão bola, 2 carnes, 2 ovos, 2 queijos, 2 presuntos e salada.", image: demo("burger/smash-duplo") }),
          item("X-Burguer", 8.5, { description: "Pão bola, carne, queijo e salada.", image: demo("burger/x-burger") }),
          item("X-Egg", 9, { description: "Pão bola, carne, ovo e salada.", image: demo("burger/x-burger") }),
          item("X-Salada", 13, { description: "Pão bola, carne, ovo, queijo, presunto e salada.", image: demo("burger/x-salada") }),
          item("X-Maionese", 10, { description: "Pão bola, carne, queijo, presunto e salada.", image: demo("burger/x-burger") }),
          item("X-Bacon", 12, { description: "Pão bola, bacon, queijo, carne e salada.", image: demo("burger/x-bacon") }),
          item("X-Salada Bacon", 19, { description: "Pão bola, bacon, carne, ovo, queijo, presunto e salada.", image: demo("burger/x-bacon") }),
          item("X-Calabresa", 12, { description: "Pão bola, calabresa, carne, queijo, presunto e salada.", image: demo("burger/x-burger") }),
          item("X-Salsicha", 10, { description: "Pão bola, salsicha, carne, queijo, presunto e salada.", image: demo("burger/x-burger") }),
          item("X-Frango", 14, { description: "Pão bola, filé de frango, queijo e salada.", image: demo("burger/x-salada") }),
          item("X-Filé", 17, { description: "Pão bola, filé, queijo e salada.", image: demo("burger/x-salada") }),
          item("X-Filé Especial", 22, { description: "Pão bola, filé, ovo, queijo, presunto e salada.", image: demo("burger/x-salada") }),
          item("X-Picanha", 18, { description: "Pão bola, picanha, queijo e salada.", image: demo("burger/x-salada") }),
          item("Bauru", 10, { description: "Pão bola, ovo, queijo, presunto e salada." }),
          item("Americano", 10, { description: "3 pães de forma, ovo, queijo, presunto e salada.", image: pl("misto") }),
          item("Misto", 6.5, { description: "Pão, queijo e presunto.", image: pl("misto") }),
          item("Misto duplo", 8, { description: "3 pães de forma, 2 queijos e 2 presuntos.", image: pl("misto") }),
          item("Queijo quente", 6.5, { description: "Pão de forma e queijo.", image: pl("misto") }),
          item("Sanduíche natural", 15, { description: "Pão de forma, queijo, tomate, pepino, palmito, milho, ervilha e alface." }),
          item("Kikão", 9, { description: "Pão de kikão, salsicha, molho de kikão e batata palha.", image: pl("kikao") }),
          item("Kikão especial", 10, { description: "Pão de kikão, salsicha, molho, batata palha, queijo e bacon.", image: pl("kikao") }),
        ],
      },
      {
        name: "Pizzas",
        description: "Todas com mussarela. Escolha o tamanho e o sabor.",
        products: [
          priced("Pizza tradicional", "Tamanho", PIZZA_TAMANHOS(22, 32, 52), {
            description: PIZZA_TRADICIONAL,
            image: pl("pizza-tradicional"),
            options: [{ ...pick("Sabor", SABORES_TRADICIONAIS), half: { from: "Pequena (4 fatias)" } }],
          }),
          priced("Pizza especial", "Tamanho", PIZZA_TAMANHOS(24, 35, 56), {
            description: PIZZA_ESPECIAL,
            image: pl("pizza-especial"),
            options: [{ ...pick("Sabor", SABORES_ESPECIAIS), half: { from: "Pequena (4 fatias)" } }],
          }),
        ],
      },
      {
        name: "Calzones",
        products: [
          priced("Calzone de filé", "Tamanho", [["Pequeno", 35], ["Grande", 58]], { image: pl("calzone") }),
          priced("Calzone de frango", "Tamanho", [["Pequeno", 36], ["Grande", 56]], { image: pl("calzone") }),
          priced("Calzone de queijo e presunto", "Tamanho", [["Pequeno", 35], ["Grande", 57]], { image: pl("calzone") }),
        ],
      },
      {
        name: "Yakisoba",
        products: [
          halfWhole("Big-Yakisoba", 37, 48, { description: "Carne, frango, calabresa, bacon e camarão.", image: demo("sushi/yakisoba"), featured: true }),
          halfWhole("Yakisoba de carne", 23, 34, { image: demo("sushi/yakisoba") }),
          halfWhole("Yakisoba de frango", 24, 34, { image: demo("sushi/yakisoba") }),
          halfWhole("Yakisoba misto", 27, 38, { description: "Carne e frango.", image: demo("sushi/yakisoba") }),
          halfWhole("Yakisoba de camarão", 33, 44, { image: demo("sushi/yakisoba") }),
          halfWhole("Yakisoba de peixe", 18, 29, { image: demo("sushi/yakisoba") }),
          halfWhole("Yakisoba de carne com bacon", 24, 36, { image: demo("sushi/yakisoba") }),
          halfWhole("Yakisoba de carne com calabresa", 23, 35, { image: demo("sushi/yakisoba") }),
          halfWhole("Yakisoba de frango com calabresa", 22, 33, { image: demo("sushi/yakisoba") }),
          halfWhole("Yakisoba de bacon", 23, 33, { image: demo("sushi/yakisoba") }),
          halfWhole("Yakisoba de calabresa", 22, 32, { image: demo("sushi/yakisoba") }),
          halfWhole("Yakisoba de legumes", 18, 25, { image: demo("sushi/yakisoba") }),
        ],
      },
      {
        name: "Massas",
        description: "Espaguete ou talharim.",
        products: [
          halfWhole("Massa à bolonhesa", 22, 36, { description: "Carne moída e molho vermelho.", image: pl("espaguete") }, [MASSA]),
          halfWhole("Massa ao molho de frango", 24, 39, { description: "Molho de frango e molho branco.", image: pl("espaguete") }, [MASSA]),
          halfWhole("Massa ao molho de camarão", 34, 44, { description: "Molho branco e camarão fresco.", image: pl("espaguete") }, [MASSA]),
          halfWhole("Massa ao molho à moda", 28, 39, { description: "Filé de carne e molho rosé.", image: pl("espaguete") }, [MASSA]),
          halfWhole("Massa ao molho de atum", 24, 35, { description: "Atum, molho de tomate e creme de leite.", image: pl("espaguete") }, [MASSA]),
          halfWhole("Massa ao molho de presunto", 18, 27, { description: "Molho branco e presunto.", image: pl("espaguete") }, [MASSA]),
          halfWhole("Massa ao sugo", 11, 17, { description: "Molho à base de tomate.", image: pl("espaguete") }, [MASSA]),
          halfWhole("Massa alho e óleo", 11, 18, { description: "Alho e óleo.", image: pl("espaguete") }, [MASSA]),
        ],
      },
      {
        name: "Lasanhas",
        description: "Sem acompanhamento.",
        products: [
          halfWhole("Lasanha à bolonhesa", 25, 39, { description: "Carne moída, queijo e presunto.", image: pl("lasanha") }),
          halfWhole("Lasanha de frango", 25, 40, { description: "Molho de frango, queijo e presunto.", image: pl("lasanha") }),
        ],
      },
      {
        name: "Panquecas e omelete",
        products: [
          item("Panqueca de carne", 20, { description: `Molho vermelho, ${COM_ARROZ}.`, image: pl("panqueca") }),
          item("Panqueca de frango", 21, { description: `Molho branco, ${COM_ARROZ}.`, image: pl("panqueca") }),
          item("Panqueca de filé mignon", 28, { description: `Molho misto, ${COM_ARROZ}.`, image: pl("panqueca") }),
          item("Panqueca de queijo e presunto", 20, { description: `Molho branco, ${COM_ARROZ}.`, image: pl("panqueca") }),
          item("Panqueca de legumes", 17, { description: `Molho branco, ${COM_ARROZ}.`, image: pl("panqueca") }),
          item("Panqueca de camarão", 28, { description: "Molho misto, sem porção de arroz.", image: pl("panqueca") }),
          item("Omelete", 19.5, { description: "Ovo, presunto, queijo, pimenta de cheiro, cebola, tomate e cheiro-verde." }),
        ],
      },
      {
        name: "Iscas e petiscos",
        products: [
          halfWhole("Batata frita", 16, 29, { image: demo("burger/batata-frita") }),
          halfWhole("Macaxeira frita", 18, 28),
          halfWhole("Frango à passarinho", 25, 35, { image: pl("frango-passarinho") }),
          halfWhole("Carne de sol acebolada", 22, 33, { image: pl("carne-acebolada") }),
          halfWhole("Carne de sol com macaxeira ou batata", 27, 36, {}, [ACOMPANHAMENTO]),
          halfWhole("Filé com macaxeira ou batata", 28, 38, {}, [ACOMPANHAMENTO]),
          halfWhole("Filé mignon", 27, 38),
          halfWhole("Calabresa", 18, 26),
          halfWhole("Mista 1", 29, 39, { description: "Filé, calabresa e batata." }),
          halfWhole("Mista 2", 29, 39, { description: "Carne de sol, calabresa e macaxeira." }),
          halfWhole("Pirarucu à milanesa", 28, 37, { image: pl("pirarucu-milanesa") }),
          item("Camarão alho e óleo", 33),
          item("Casquinha de caranguejo", 27),
          item("Queijo coalho", 19),
          item("Queijo à milanesa", 35),
          item("Azeitona", 25),
        ],
      },
      {
        name: "Acompanhamentos",
        products: [
          item("Arroz branco", 3),
          item("Feijão", 7.5),
          item("Farofa", 3.5),
          item("Purê", 8),
          item("Pão de alho", 3),
          item("Pão de forma", 2),
        ],
      },
      {
        name: "Caldos",
        products: [
          halfWhole("Canja de galinha", 10, 20, { image: pl("caldo") }),
          halfWhole("Caldo de carne com legumes", 11, 21, { image: pl("caldo") }),
          halfWhole("Caldo verde", 11, 21, { image: pl("caldo") }),
          halfWhole("Mocotó", 11, 21, { image: pl("caldo") }),
        ],
      },
      {
        name: "Saladas",
        products: [
          halfWhole("Salada Papaléguas", 18, 28, { description: "Alface, tomate, pepino, palmito, cogumelo e cenoura ralada.", image: pl("salada") }),
          halfWhole("Salada simples", 10, 18, { description: "Alface, tomate e pepino.", image: pl("salada") }),
          halfWhole("Salada quente", 17, 22, { description: "Repolho, couve-flor, brócolis, pimentão, cebola e cenoura." }),
        ],
      },
      {
        name: "Sobremesas",
        products: [priced("Salada de fruta", "Tamanho", [["250 ml", 10], ["500 ml", 17]], { image: pl("salada-de-fruta") })],
      },
      {
        name: "Bebidas",
        products: [
          // cada tamanho é um item: o cliente entra e escolhe o sabor dentro dele
          item("Refrigerante mini", 2, { image: demo("comum/refrigerante"), options: [pick("Sabor", SABORES_REFRI)] }),
          item("Refrigerante lata", 6, { image: demo("comum/refrigerante"), options: [pick("Sabor", SABORES_REFRI)] }),
          item("Refrigerante 1 litro", 9, { image: demo("comum/refrigerante"), options: [pick("Sabor", SABORES_REFRI)] }),
          item("Refrigerante 2 litros", 15, { image: demo("comum/refrigerante"), options: [pick("Sabor", SABORES_REFRI)] }),
          priced("Suco", "Tamanho", [["300 ml", 8], ["Jarra", 20]], {
            image: demo("pizzaria/suco-laranja"),
            options: [pick("Sabor", SABORES_SUCO)],
          }),
          priced("Suco com leite", "Tamanho", [["300 ml", 9], ["Jarra", 25]], {
            image: demo("pizzaria/suco-laranja"),
            options: [pick("Sabor", SABORES_SUCO)],
          }),
          item("Suco em lata", 5, { options: [pick("Sabor", SABORES_SUCO_LATA)] }),
          priced("Suco detox", "Tamanho", [["300 ml", 9.5], ["Jarra", 24]]),
          priced("Vitaminada", "Tamanho", [["300 ml", 9.5], ["Jarra", 25]]),
          priced("Água mineral", "Tamanho", [["350 ml", 2.5], ["500 ml", 4], ["2 litros", 7]], { image: demo("comum/agua") }),
          item("Água com gás 350 ml", 4, { image: demo("comum/agua") }),
          item("Água tônica lata", 6),
        ],
      },
      {
        name: "Drinks",
        description: "Venda proibida para menores de 18 anos.",
        products: [
          // cada formato é um item, com as marcas daquele formato dentro
          item("Cerveja lata", 6, { image: pl("cerveja"), options: [pick("Marca", CERVEJA_LATA)] }),
          item("Cerveja long neck", 12, { image: pl("cerveja"), options: [pick("Marca", CERVEJA_LONG_NECK)] }),
          item("Cerveja 600 ml", 19, { image: pl("cerveja"), options: [pick("Marca", CERVEJA_600)] }),
          priced("Caipirinha", "Tipo", [["Tradicional", 10], ["Verde (com couve)", 12]], {
            description: "Limão, açúcar, gelo e cachaça.",
            image: pl("caipirinha"),
          }),
          priced("Caipirosca", "Tipo", [["Tradicional", 11], ["Verde (com couve)", 13]], {
            description: "Limão, açúcar, gelo e vodka Skarloff.",
            image: pl("caipirinha"),
          }),
          priced("Whisky", "Tipo", [["8 anos", 20], ["12 anos", 25]]),
          item("Cuba livre", 13),
          item("Campari", 11),
          item("Montilla", 11),
          item("Martini", 10),
          item("Cachaça", 3),
          item("Vodka Skarloff", 3.5),
        ],
      },
    ], {
      "Carne de sol": pl("carne-de-sol"),
      "Filé de frango": pl("file-de-frango"),
      "Filé de pirarucu": pl("file-de-pirarucu"),
      "Parmegiana de carne": pl("parmegiana-carne"),
      "Parmegiana de frango": pl("parmegiana-frango"),
      "Bauru": pl("bauru"),
      "Sanduíche natural": pl("sanduiche-natural"),
      "Omelete": pl("omelete"),
      "Macaxeira frita": pl("macaxeira-frita"),
      "Carne de sol com macaxeira ou batata": pl("carne-de-sol-macaxeira"),
      "Filé com macaxeira ou batata": pl("file-com-fritas"),
      "Filé mignon": pl("file-mignon"),
      "Calabresa": pl("calabresa"),
      "Mista 1": pl("mista-1"),
      "Mista 2": pl("mista-2"),
      "Camarão alho e óleo": pl("camarao-alho-oleo"),
      "Casquinha de caranguejo": pl("casquinha-caranguejo"),
      "Queijo coalho": pl("queijo-coalho"),
      "Queijo à milanesa": pl("queijo-milanesa"),
      "Azeitona": pl("azeitona"),
      "Arroz branco": pl("arroz"),
      "Feijão": pl("feijao"),
      "Farofa": pl("farofa"),
      "Purê": pl("pure"),
      "Pão de alho": pl("pao-de-alho"),
      "Pão de forma": pl("pao-de-forma"),
      "Salada quente": pl("salada-quente"),
      "Suco em lata": pl("suco-lata"),
      "Suco detox": pl("suco-detox"),
      "Vitaminada": pl("vitaminada"),
      "Água tônica lata": pl("agua-tonica"),
      "Whisky": pl("whisky"),
      "Cuba livre": pl("cuba-livre"),
      "Campari": pl("campari"),
      "Montilla": pl("montilla"),
      "Martini": pl("martini"),
      "Cachaça": pl("cachaca"),
      "Vodka Skarloff": pl("vodka"),
    }),
  },
];
