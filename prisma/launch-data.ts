// Restaurantes reais implantados pela equipe. O seed cria cada um uma única
// vez (pelo endereço/slug); depois disso, tudo se ajusta pelo painel.
// Fotos: do Instagram do próprio restaurante e do Unsplash (licença livre),
// em public/implantacao; algumas reaproveitam as de public/demo.
// Limites do painel: nome da categoria 50, descrição 200; produto 80 e 400.

export type LaunchProduct = { name: string; description?: string; price: number; image?: string; featured?: boolean };

export type LaunchRestaurant = {
  slug: string;
  name: string;
  description: string;
  categories: string[];
  logo: string;
  cover: string;
  whatsapp: string;
  instagram: string;
  address: { street: string; number: string; neighborhood: string; city: string; state: string; zipCode: string };
  hours: { opensAt: string; closesAt: string };
  delivery: { enabled: boolean; fee: number; timeMin: number | null; timeMax: number | null };
  pickup: boolean;
  pix: { key: string; type: "PHONE" | "EMAIL" | "CPF" | "CNPJ" | "RANDOM"; holder: string | null };
  menu: { name: string; description?: string; products: LaunchProduct[] }[];
};

const pl = (path: string) => `/implantacao/papaleguas/${path}.webp`;
const demo = (path: string) => `/demo/${path}.webp`;
const cents = (reais: number) => Math.round(reais * 100);

type Extra = Omit<LaunchProduct, "name" | "price">;

const item = (name: string, reais: number, extra: Extra = {}): LaunchProduct => ({ name, price: cents(reais), ...extra });

/** meia e inteira viram dois produtos, cada um com o seu preço */
const halfWhole = (name: string, meia: number, inteira: number, extra: Extra = {}): LaunchProduct[] => [
  item(`${name} (meia)`, meia, extra),
  item(`${name} (inteira)`, inteira, extra),
];

/** calzone: pequeno e grande */
const smallLarge = (name: string, pequeno: number, grande: number, extra: Extra = {}): LaunchProduct[] => [
  item(`${name} (pequeno)`, pequeno, extra),
  item(`${name} (grande)`, grande, extra),
];

const PIZZA_TRADICIONAL =
  "Sabor na observação: Portuguesa (presunto, calabresa, cebola, tomate, pimentão, ovo, azeitona, ervilha), Calabresa (calabresa, cebola), Atum (atum, cebola, azeitona), Presunto (presunto, tomate, azeitona), Milho, Vegetariana (azeitona, cogumelo, ervilha, milho verde, palmito), Cupuaçu (geleia), Margarita (tomate, manjericão), Romeu e Julieta (goiabada), Mussarela.";
const PIZZA_ESPECIAL =
  "Sabor na observação: À moda da casa (filé, cogumelo, cebola, queijo, azeitona), 3 queijos (provolone, requeijão), Carne de sol com catupiry (carne de sol, cogumelo, requeijão, cebola, azeitona), Frango com catupiry (molho de frango, requeijão), Palmito, Bacon (bacon, tomate, cebola), Camarão (molho de camarão).";
const COM_ARROZ = "com porção de arroz";
const SABOR_SUCO = "Sabores diversos: escolha na observação.";

export const launchRestaurants: LaunchRestaurant[] = [
  {
    slug: "papaleguas",
    name: "Papaléguas",
    description:
      "Lanchonete e restaurante na Praça da Cultura, no Centro de Presidente Figueiredo. Grelhados, sanduíches, pizzas, yakisoba, massas e petiscos. Algumas fotos são ilustrativas.",
    categories: ["lanches", "pizzas", "massas", "porcoes", "comida-regional", "bebidas"],
    logo: pl("logo"),
    cover: pl("capa"),
    whatsapp: "5592999130838",
    instagram: "papaleguas_lanchonete_pf",
    address: { street: "Praça da Cultura", number: "Box 1", neighborhood: "Centro", city: "Presidente Figueiredo", state: "AM", zipCode: "69735000" },
    hours: { opensAt: "17:30", closesAt: "00:00" },
    // entregam ("disque entrega"), mas a taxa ainda não foi informada
    delivery: { enabled: false, fee: 0, timeMin: null, timeMax: null },
    pickup: true,
    pix: { key: "+5592994750615", type: "PHONE", holder: null },
    menu: [
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
        name: "Pizzas tradicionais",
        description: "Todas com mussarela. Escreva o sabor na observação do pedido.",
        products: [
          item("Pizza tradicional brotinho", 22, { description: PIZZA_TRADICIONAL, image: pl("pizza-tradicional") }),
          item("Pizza tradicional pequena (4 fatias)", 32, { description: PIZZA_TRADICIONAL, image: pl("pizza-tradicional") }),
          item("Pizza tradicional grande (8 fatias)", 52, { description: PIZZA_TRADICIONAL, image: pl("pizza-tradicional") }),
        ],
      },
      {
        name: "Pizzas especiais",
        description: "Todas com mussarela. Escreva o sabor na observação do pedido.",
        products: [
          item("Pizza especial brotinho", 24, { description: PIZZA_ESPECIAL, image: pl("pizza-especial") }),
          item("Pizza especial pequena (4 fatias)", 35, { description: PIZZA_ESPECIAL, image: pl("pizza-especial") }),
          item("Pizza especial grande (8 fatias)", 56, { description: PIZZA_ESPECIAL, image: pl("pizza-especial") }),
        ],
      },
      {
        name: "Calzones",
        products: [
          ...smallLarge("Calzone de filé", 35, 58, { image: pl("calzone") }),
          ...smallLarge("Calzone de frango", 36, 56, { image: pl("calzone") }),
          ...smallLarge("Calzone de queijo e presunto", 35, 57, { image: pl("calzone") }),
        ],
      },
      {
        name: "Yakisoba",
        products: [
          ...halfWhole("Big-Yakisoba", 37, 48, { description: "Carne, frango, calabresa, bacon e camarão.", image: demo("sushi/yakisoba"), featured: true }),
          ...halfWhole("Yakisoba de carne", 23, 34, { image: demo("sushi/yakisoba") }),
          ...halfWhole("Yakisoba de frango", 24, 34, { image: demo("sushi/yakisoba") }),
          ...halfWhole("Yakisoba misto", 27, 38, { description: "Carne e frango.", image: demo("sushi/yakisoba") }),
          ...halfWhole("Yakisoba de camarão", 33, 44, { image: demo("sushi/yakisoba") }),
          ...halfWhole("Yakisoba de peixe", 18, 29, { image: demo("sushi/yakisoba") }),
          ...halfWhole("Yakisoba de carne com bacon", 24, 36, { image: demo("sushi/yakisoba") }),
          ...halfWhole("Yakisoba de carne com calabresa", 23, 35, { image: demo("sushi/yakisoba") }),
          ...halfWhole("Yakisoba de frango com calabresa", 22, 33, { image: demo("sushi/yakisoba") }),
          ...halfWhole("Yakisoba de bacon", 23, 33, { image: demo("sushi/yakisoba") }),
          ...halfWhole("Yakisoba de calabresa", 22, 32, { image: demo("sushi/yakisoba") }),
          ...halfWhole("Yakisoba de legumes", 18, 25, { image: demo("sushi/yakisoba") }),
        ],
      },
      {
        name: "Massas",
        description: "Espaguete ou talharim: escolha na observação do pedido.",
        products: [
          ...halfWhole("Massa à bolonhesa", 22, 36, { description: "Carne moída e molho vermelho.", image: pl("espaguete") }),
          ...halfWhole("Massa ao molho de frango", 24, 39, { description: "Molho de frango e molho branco.", image: pl("espaguete") }),
          ...halfWhole("Massa ao molho de camarão", 34, 44, { description: "Molho branco e camarão fresco.", image: pl("espaguete") }),
          ...halfWhole("Massa ao molho à moda", 28, 39, { description: "Filé de carne e molho rosé.", image: pl("espaguete") }),
          ...halfWhole("Massa ao molho de atum", 24, 35, { description: "Atum, molho de tomate e creme de leite.", image: pl("espaguete") }),
          ...halfWhole("Massa ao molho de presunto", 18, 27, { description: "Molho branco e presunto.", image: pl("espaguete") }),
          ...halfWhole("Massa ao sugo", 11, 17, { description: "Molho à base de tomate.", image: pl("espaguete") }),
          ...halfWhole("Massa alho e óleo", 11, 18, { description: "Alho e óleo.", image: pl("espaguete") }),
        ],
      },
      {
        name: "Lasanhas",
        description: "Sem acompanhamento.",
        products: [
          ...halfWhole("Lasanha à bolonhesa", 25, 39, { description: "Carne moída, queijo e presunto.", image: pl("lasanha") }),
          ...halfWhole("Lasanha de frango", 25, 40, { description: "Molho de frango, queijo e presunto.", image: pl("lasanha") }),
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
          ...halfWhole("Batata frita", 16, 29, { image: demo("burger/batata-frita") }),
          ...halfWhole("Macaxeira frita", 18, 28),
          ...halfWhole("Frango à passarinho", 25, 35, { image: pl("frango-passarinho") }),
          ...halfWhole("Carne de sol acebolada", 22, 33, { image: pl("carne-acebolada") }),
          ...halfWhole("Carne de sol com macaxeira ou batata", 27, 36, { description: "Escolha macaxeira ou batata na observação." }),
          ...halfWhole("Filé com macaxeira ou batata", 28, 38, { description: "Escolha macaxeira ou batata na observação." }),
          ...halfWhole("Filé mignon", 27, 38),
          ...halfWhole("Calabresa", 18, 26),
          ...halfWhole("Mista 1", 29, 39, { description: "Filé, calabresa e batata." }),
          ...halfWhole("Mista 2", 29, 39, { description: "Carne de sol, calabresa e macaxeira." }),
          ...halfWhole("Pirarucu à milanesa", 28, 37, { image: pl("pirarucu-milanesa") }),
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
          ...halfWhole("Canja de galinha", 10, 20, { image: pl("caldo") }),
          ...halfWhole("Caldo de carne com legumes", 11, 21, { image: pl("caldo") }),
          ...halfWhole("Caldo verde", 11, 21, { image: pl("caldo") }),
          ...halfWhole("Mocotó", 11, 21, { image: pl("caldo") }),
        ],
      },
      {
        name: "Saladas",
        products: [
          ...halfWhole("Salada Papaléguas", 18, 28, { description: "Alface, tomate, pepino, palmito, cogumelo e cenoura ralada.", image: pl("salada") }),
          ...halfWhole("Salada simples", 10, 18, { description: "Alface, tomate e pepino.", image: pl("salada") }),
          ...halfWhole("Salada quente", 17, 22, { description: "Repolho, couve-flor, brócolis, pimentão, cebola e cenoura." }),
        ],
      },
      {
        name: "Sobremesas",
        products: [
          item("Salada de fruta 500 ml", 17, { image: pl("salada-de-fruta") }),
          item("Salada de fruta 250 ml", 10, { image: pl("salada-de-fruta") }),
        ],
      },
      {
        name: "Bebidas",
        products: [
          item("Refrigerante lata", 6, { image: demo("comum/refrigerante") }),
          item("Refrigerante mini", 2, { image: demo("comum/refrigerante") }),
          item("Refrigerante 1 litro", 9, { image: demo("comum/refrigerante") }),
          item("Refrigerante 2 litros", 15, { image: demo("comum/refrigerante") }),
          item("Suco 300 ml", 8, { description: SABOR_SUCO, image: demo("pizzaria/suco-laranja") }),
          item("Suco com leite 300 ml", 9, { description: SABOR_SUCO, image: demo("pizzaria/suco-laranja") }),
          item("Suco jarra", 20, { description: SABOR_SUCO, image: demo("pizzaria/suco-laranja") }),
          item("Suco com leite jarra", 25, { description: SABOR_SUCO, image: demo("pizzaria/suco-laranja") }),
          item("Suco em lata", 5, { description: SABOR_SUCO }),
          item("Suco detox 300 ml", 9.5),
          item("Suco detox jarra", 24),
          item("Vitaminada 300 ml", 9.5),
          item("Vitaminada jarra", 25),
          item("Água mineral 350 ml", 2.5, { image: demo("comum/agua") }),
          item("Água mineral 500 ml", 4, { image: demo("comum/agua") }),
          item("Água mineral 2 litros", 7, { image: demo("comum/agua") }),
          item("Água com gás 350 ml", 4, { image: demo("comum/agua") }),
          item("Água tônica lata", 6),
        ],
      },
      {
        name: "Drinks",
        description: "Venda proibida para menores de 18 anos.",
        products: [
          item("Cerveja lata", 6, { image: pl("cerveja") }),
          item("Cerveja long neck", 12, { image: pl("cerveja") }),
          item("Cerveja 600 ml", 19, { image: pl("cerveja") }),
          item("Caipirinha", 10, { description: "Limão, açúcar, gelo e cachaça.", image: pl("caipirinha") }),
          item("Caipirinha verde", 12, { description: "Limão, açúcar, gelo, cachaça e couve.", image: pl("caipirinha") }),
          item("Caipirosca", 11, { description: "Limão, açúcar, gelo e vodka Skarloff.", image: pl("caipirinha") }),
          item("Caipirosca verde", 13, { description: "Limão, açúcar, gelo, vodka Skarloff e couve.", image: pl("caipirinha") }),
          item("Cuba livre", 13),
          item("Campari", 11),
          item("Montilla", 11),
          item("Martini", 10),
          item("Whisky 8 anos", 20),
          item("Whisky 12 anos", 25),
          item("Cachaça", 3),
          item("Vodka Skarloff", 3.5),
        ],
      },
    ],
  },
];
