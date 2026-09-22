// Restaurantes de demonstração (fictícios) usados pelo seed com SEED_DEMO="true".
// Fotos: Unsplash (licença livre), em public/demo. Logos desenhados para o MenuFácil.
// Sem WhatsApp de propósito: são restaurantes de mentira.

export type DemoProduct = {
  name: string;
  description: string;
  price: number; // centavos
  promo?: number;
  featured?: boolean;
  image: string;
};

export type DemoRestaurant = {
  slug: string;
  name: string;
  description: string;
  categories: string[];
  owner: { name: string; email: string };
  logo: string;
  cover: string;
  address: { street: string; number: string; neighborhood: string };
  hours: { opensAt: string; closesAt: string; closedWeekdays?: number[] };
  delivery: { fee: number; min: number; timeMin: number; timeMax: number };
  pix: { key: string; holder: string; instructions?: string };
  menu: { name: string; description?: string; products: DemoProduct[] }[];
};

const img = (path: string) => `/demo/${path}.webp`;

export const demoRestaurants: DemoRestaurant[] = [
  {
    slug: "pizzaria-forno-de-pedra",
    name: "Pizzaria Forno de Pedra",
    description: "Pizzas artesanais assadas no forno a lenha, com massa de fermentação natural de 48 horas.",
    categories: ["pizzas", "calzone", "bebidas", "sobremesas"],
    owner: { name: "Dono da Pizzaria (demo)", email: "pizzaria@demo.menufacil.app" },
    logo: img("pizzaria/logo"),
    cover: img("pizzaria/capa"),
    address: { street: "Avenida Amazonas", number: "1450", neighborhood: "Centro" },
    hours: { opensAt: "11:00", closesAt: "23:30" },
    delivery: { fee: 600, min: 3000, timeMin: 35, timeMax: 50 },
    pix: { key: "pizzaria@demo.menufacil.app", holder: "Pizzaria Forno de Pedra", instructions: "Confirmamos o pagamento em até 5 minutos." },
    menu: [
      {
        name: "Pizzas",
        description: "Tamanho grande, 8 fatias.",
        products: [
          { name: "Pizza Margherita", description: "Molho de tomate italiano, muçarela de búfala, tomate fresco e manjericão.", price: 4990, featured: true, image: img("pizzaria/margherita") },
          { name: "Pizza Calabresa", description: "Calabresa artesanal fatiada, cebola roxa, azeitonas pretas e orégano.", price: 4690, image: img("pizzaria/calabresa") },
          { name: "Pizza Frango com Catupiry", description: "Frango desfiado temperado, Catupiry original e milho.", price: 5290, promo: 4790, featured: true, image: img("pizzaria/frango-catupiry") },
          { name: "Pizza Portuguesa", description: "Presunto, ovos, cebola, ervilha, azeitonas e muçarela.", price: 5290, image: img("pizzaria/portuguesa") },
          { name: "Pizza Quatro Queijos", description: "Muçarela, provolone, parmesão e gorgonzola.", price: 5490, image: img("pizzaria/quatro-queijos") },
        ],
      },
      {
        name: "Calzones",
        products: [
          { name: "Calzone de Calabresa", description: "Massa fechada recheada com calabresa, muçarela e cebola.", price: 3990, image: img("pizzaria/calzone") },
        ],
      },
      {
        name: "Sobremesas",
        products: [
          { name: "Pizza de Chocolate (broto)", description: "Chocolate ao leite, morangos e granulado. 4 fatias.", price: 3490, image: img("pizzaria/pizza-chocolate") },
          { name: "Petit Gâteau", description: "Bolinho de chocolate com recheio cremoso e sorvete de creme.", price: 2290, image: img("pizzaria/petit-gateau") },
        ],
      },
      {
        name: "Bebidas",
        products: [
          { name: "Refrigerante 2 L", description: "Coca-Cola, Guaraná ou Fanta. Diga qual na observação.", price: 1400, image: img("comum/refrigerante") },
          { name: "Suco de Laranja 500 ml", description: "Natural, feito na hora.", price: 1090, image: img("pizzaria/suco-laranja") },
        ],
      },
    ],
  },
  {
    slug: "burger-da-praca",
    name: "Burger da Praça",
    description: "Hambúrgueres artesanais de 160 g na chapa, pão brioche e batata frita crocante.",
    categories: ["lanches", "hamburguer", "porcoes", "bebidas"],
    owner: { name: "Dono do Burger (demo)", email: "burger@demo.menufacil.app" },
    logo: img("burger/logo"),
    cover: img("burger/capa"),
    address: { street: "Rua 7 de Setembro", number: "88", neighborhood: "Centro" },
    hours: { opensAt: "11:00", closesAt: "23:30" },
    delivery: { fee: 500, min: 2000, timeMin: 30, timeMax: 45 },
    pix: { key: "burger@demo.menufacil.app", holder: "Burger da Praça" },
    menu: [
      {
        name: "Hambúrgueres",
        description: "Pão brioche e blend de carne de 160 g.",
        products: [
          { name: "X-Burger", description: "Blend 160 g, queijo cheddar e molho da casa.", price: 2490, featured: true, image: img("burger/x-burger") },
          { name: "X-Salada", description: "Blend 160 g, queijo, alface, tomate, cebola roxa e maionese verde.", price: 2690, image: img("burger/x-salada") },
          { name: "X-Bacon", description: "Blend 160 g, cheddar, bacon crocante e cebola caramelizada.", price: 2990, promo: 2690, image: img("burger/x-bacon") },
          { name: "Smash Duplo", description: "Dois smash de 80 g, cheddar em dobro, picles e molho especial.", price: 3290, featured: true, image: img("burger/smash-duplo") },
        ],
      },
      {
        name: "Porções",
        products: [
          { name: "Batata Frita", description: "400 g de batata crocante com molho da casa.", price: 1990, image: img("burger/batata-frita") },
          { name: "Onion Rings", description: "Anéis de cebola empanados, 300 g.", price: 2290, image: img("burger/onion-rings") },
          { name: "Isca de Frango", description: "Tiras de frango empanadas com molho barbecue, 400 g.", price: 2990, image: img("burger/isca-frango") },
        ],
      },
      {
        name: "Bebidas",
        products: [
          { name: "Milkshake de Chocolate", description: "500 ml, com chantilly e biscoito.", price: 1890, image: img("burger/milkshake") },
          { name: "Refrigerante Lata", description: "350 ml.", price: 650, image: img("comum/refrigerante") },
          { name: "Água Mineral", description: "500 ml, com ou sem gás.", price: 400, image: img("comum/agua") },
        ],
      },
    ],
  },
  {
    slug: "sushi-da-serra",
    name: "Sushi da Serra",
    description: "Culinária japonesa feita na hora: sushis, hot rolls, yakisoba e combinados para dividir.",
    categories: ["japonesa", "peixes-e-frutos-do-mar", "bebidas"],
    owner: { name: "Dono do Sushi (demo)", email: "sushi@demo.menufacil.app" },
    logo: img("sushi/logo"),
    cover: img("sushi/capa"),
    address: { street: "Avenida Uatumã", number: "312", neighborhood: "Centro" },
    hours: { opensAt: "11:00", closesAt: "23:00" },
    delivery: { fee: 700, min: 4000, timeMin: 40, timeMax: 60 },
    pix: { key: "sushi@demo.menufacil.app", holder: "Sushi da Serra" },
    menu: [
      {
        name: "Combinados",
        products: [
          { name: "Combinado 30 Peças", description: "Sashimi, niguiri, uramaki e hot roll. Serve 2 pessoas.", price: 11990, promo: 9990, featured: true, image: img("sushi/combinado") },
        ],
      },
      {
        name: "Sushis",
        products: [
          { name: "Uramaki Filadélfia (8 peças)", description: "Salmão, cream cheese e cebolinha.", price: 3290, featured: true, image: img("sushi/uramaki") },
          { name: "Hot Roll (10 peças)", description: "Empanado e frito, com salmão, cream cheese e molho tarê.", price: 2990, image: img("sushi/hot-roll") },
          { name: "Niguiri de Salmão (4 peças)", description: "Bolinho de arroz com fatia de salmão fresco.", price: 2490, image: img("sushi/nigiri") },
          { name: "Sashimi de Salmão (10 fatias)", description: "Salmão fresco fatiado, com shoyu e gengibre.", price: 4490, image: img("sushi/sashimi") },
        ],
      },
      {
        name: "Pratos Quentes",
        products: [
          { name: "Yakisoba de Frango", description: "Macarrão, frango e legumes salteados no molho especial.", price: 3690, image: img("sushi/yakisoba") },
          { name: "Guioza (6 unidades)", description: "Pastéis japoneses de carne suína, grelhados.", price: 2490, image: img("sushi/gyoza") },
        ],
      },
      {
        name: "Bebidas",
        products: [
          { name: "Chá Gelado de Limão", description: "500 ml.", price: 990, image: img("sushi/cha-gelado") },
          { name: "Refrigerante Lata", description: "350 ml.", price: 650, image: img("comum/refrigerante") },
        ],
      },
    ],
  },
  {
    slug: "tropical-acai",
    name: "Tropical Açaí",
    description: "Açaí da região batido na hora, sorvetes e milk-shakes. Monte do seu jeito!",
    categories: ["acai", "sorvete", "sobremesas"],
    owner: { name: "Dono do Açaí (demo)", email: "acai@demo.menufacil.app" },
    logo: img("acai/logo"),
    cover: img("acai/capa"),
    address: { street: "Rua Cachoeira da Porteira", number: "25", neighborhood: "Centro" },
    hours: { opensAt: "09:00", closesAt: "22:00" },
    delivery: { fee: 400, min: 1500, timeMin: 20, timeMax: 35 },
    pix: { key: "acai@demo.menufacil.app", holder: "Tropical Açaí" },
    menu: [
      {
        name: "Açaí",
        description: "Açaí puro da região, batido na hora.",
        products: [
          { name: "Açaí no Copo 300 ml", description: "Com 2 complementos à sua escolha.", price: 1400, image: img("acai/copo-300") },
          { name: "Açaí no Copo 500 ml", description: "Com morango, amora e leite condensado.", price: 2000, promo: 1800, featured: true, image: img("acai/copo-500") },
          { name: "Tigela de Açaí 700 ml", description: "Com banana, morango, granola e mel. Serve 2 pessoas.", price: 2800, featured: true, image: img("acai/tigela-700") },
          { name: "Açaí com Banana e Granola", description: "Três bolas de açaí cremoso, banana e granola crocante.", price: 2200, image: img("acai/banana-granola") },
        ],
      },
      {
        name: "Sorvetes",
        products: [
          { name: "Casquinha", description: "Baunilha com granulado colorido.", price: 700, image: img("acai/casquinha") },
          { name: "Sundae de Chocolate", description: "Sorvete, calda de chocolate, chantilly e biscoito.", price: 1600, image: img("acai/sundae") },
          { name: "Banana Split", description: "Banana, 3 bolas de sorvete, caldas e chantilly.", price: 2400, image: img("acai/banana-split") },
          { name: "Picolé de Morango", description: "Feito com fruta de verdade.", price: 600, image: img("acai/picole") },
        ],
      },
      {
        name: "Bebidas",
        products: [
          { name: "Milk-shake de Morango", description: "500 ml, com chantilly.", price: 1800, image: img("acai/milkshake-morango") },
        ],
      },
    ],
  },
];
