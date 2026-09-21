// Dados iniciais do MenuFácil.
//
//   npm run db:seed
//
// Sempre: conta do administrador (ADMIN_EMAIL) e categorias da plataforma.
// Com SEED_DEMO="true": dois restaurantes fictícios com cardápio e donos,
// para testar o sistema. Rodar de novo não duplica nada.
import "dotenv/config";

import { randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function temporaryPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(12), (b) => alphabet[b % alphabet.length]).join("");
}

const platformCategories = [
  { slug: "lanches", name: "Lanches", icon: "sandwich" },
  { slug: "pizzas", name: "Pizzas", icon: "pizza" },
  { slug: "bebidas", name: "Bebidas", icon: "cup-soda" },
  { slug: "porcoes", name: "Porções", icon: "drumstick" },
  { slug: "sobremesas", name: "Sobremesas", icon: "cake-slice" },
  { slug: "comida-caseira", name: "Comida caseira", icon: "soup" },
  { slug: "marmitex", name: "Marmitex", icon: "package" },
  { slug: "japonesa", name: "Japonesa", icon: "fish" },
  { slug: "acai", name: "Açaí", icon: "ice-cream-bowl" },
  { slug: "self-service", name: "Self service", icon: "utensils-crossed" },
  { slug: "hamburguer", name: "Hambúrguer", icon: "hamburger" },
  { slug: "massas", name: "Massas", icon: "wheat" },
  { slug: "lasanha", name: "Lasanha", icon: "cooking-pot" },
  { slug: "calzone", name: "Calzone", icon: "pizza" },
  { slug: "drinks", name: "Drinks", icon: "martini" },
  { slug: "sorvete", name: "Sorvete", icon: "ice-cream-cone" },
  { slug: "churrasco", name: "Churrasco", icon: "beef" },
  { slug: "espetinho", name: "Espetinho", icon: "flame" },
  { slug: "peixes-e-frutos-do-mar", name: "Peixes e frutos do mar", icon: "shrimp" },
  { slug: "comida-regional", name: "Comida regional", icon: "leaf" },
  { slug: "pastel", name: "Pastel", icon: "croissant" },
  { slug: "salgados", name: "Salgados", icon: "drumstick" },
  { slug: "cachorro-quente", name: "Cachorro-quente", icon: "sandwich" },
  { slug: "padaria-e-cafe", name: "Padaria e café", icon: "coffee" },
  { slug: "saudavel", name: "Saudável", icon: "salad" },
  { slug: "doces-e-bolos", name: "Doces e bolos", icon: "cake" },
];

type DemoProduct = { name: string; description: string; price: number; promo?: number; featured?: boolean };
type DemoRestaurant = {
  slug: string;
  name: string;
  description: string;
  categories: string[];
  ownerName: string;
  ownerEmail: string;
  whatsapp: string;
  deliveryFee: number;
  pix: string;
  menu: Record<string, DemoProduct[]>;
};

const demoRestaurants: DemoRestaurant[] = [
  {
    slug: "pizzaria-forno-de-pedra",
    name: "Pizzaria Forno de Pedra",
    description: "Pizzas artesanais assadas no forno a lenha, com massa de fermentação natural.",
    categories: ["pizzas", "bebidas", "sobremesas"],
    ownerName: "Dono da Pizzaria (demo)",
    ownerEmail: "pizzaria@demo.menufacil.app",
    whatsapp: "5592999990001",
    deliveryFee: 600,
    pix: "pizzaria@demo.menufacil.app",
    menu: {
      Pizzas: [
        { name: "Pizza Margherita", description: "Molho de tomate, muçarela, tomate e manjericão.", price: 4500, featured: true },
        { name: "Pizza Calabresa", description: "Calabresa fatiada, cebola e azeitonas.", price: 4800 },
        { name: "Pizza Frango com Catupiry", description: "Frango desfiado temperado e catupiry.", price: 5200, promo: 4700 },
        { name: "Pizza Portuguesa", description: "Presunto, ovos, cebola, ervilha e azeitonas.", price: 5200 },
      ],
      Bebidas: [
        { name: "Refrigerante 2L", description: "Coca-Cola, Guaraná ou Fanta.", price: 1400 },
        { name: "Suco natural 500ml", description: "Cupuaçu, maracujá ou acerola.", price: 900 },
      ],
      Sobremesas: [{ name: "Pizza de chocolate (broto)", description: "Chocolate ao leite e granulado.", price: 2800 }],
    },
  },
  {
    slug: "burger-da-praca",
    name: "Burger da Praça",
    description: "Hambúrgueres artesanais, porções e combos para matar a fome.",
    categories: ["lanches", "porcoes", "bebidas"],
    ownerName: "Dono do Burger (demo)",
    ownerEmail: "burger@demo.menufacil.app",
    whatsapp: "5592999990002",
    deliveryFee: 500,
    pix: "burger@demo.menufacil.app",
    menu: {
      Hambúrgueres: [
        { name: "X-Burger", description: "Pão, hambúrguer 150g, queijo e molho da casa.", price: 1800, featured: true },
        { name: "X-Salada", description: "Hambúrguer 150g, queijo, alface e tomate.", price: 2000 },
        { name: "X-Bacon", description: "Hambúrguer 150g, queijo e bacon crocante.", price: 2400, promo: 2200 },
      ],
      Porções: [
        { name: "Batata frita", description: "Porção de 400g com cheddar opcional.", price: 1500 },
        { name: "Isca de frango", description: "Tiras de frango empanadas, 400g.", price: 2600 },
      ],
      Bebidas: [
        { name: "Coca-Cola lata", description: "350ml.", price: 600 },
        { name: "Água mineral", description: "500ml.", price: 400 },
      ],
    },
  },
];

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@menufacil.app").trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`• Admin ${email} já existe (senha mantida).`);
    return;
  }
  const password = process.env.ADMIN_PASSWORD || temporaryPassword();
  await db.user.create({
    data: {
      name: process.env.ADMIN_NAME ?? "Administrador MenuFácil",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      mustChangePassword: !process.env.ADMIN_PASSWORD,
    },
  });
  console.log(`• Admin criado: ${email}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`  senha provisória: ${password} (troca obrigatória no primeiro acesso)`);
}

async function seedCategories() {
  for (const [i, c] of platformCategories.entries()) {
    await db.platformCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, sortOrder: i },
    });
  }
  console.log(`• ${platformCategories.length} categorias da plataforma`);
}

async function seedDemo() {
  for (const demo of demoRestaurants) {
    if (await db.restaurant.findUnique({ where: { slug: demo.slug } })) {
      console.log(`• Demo "${demo.name}" já existe.`);
      continue;
    }
    const password = temporaryPassword();
    const owner = await db.user.upsert({
      where: { email: demo.ownerEmail },
      update: {},
      create: {
        name: demo.ownerName,
        email: demo.ownerEmail,
        passwordHash: await bcrypt.hash(password, 12),
        role: "RESTAURANT_OWNER",
        mustChangePassword: true,
      },
    });

    const restaurant = await db.restaurant.create({
      data: {
        slug: demo.slug,
        name: demo.name,
        description: demo.description,
        status: "ACTIVE",
        featured: true,
        activatedAt: new Date(),
        whatsapp: demo.whatsapp,
        street: "Avenida Principal",
        number: "100",
        neighborhood: "Centro",
        city: "Presidente Figueiredo",
        state: "AM",
        deliveryFeeCents: demo.deliveryFee,
        deliveryTimeMin: 30,
        deliveryTimeMax: 50,
        pixKey: demo.pix,
        pixKeyType: "EMAIL",
        pixHolderName: demo.name,
        categories: { connect: demo.categories.map((slug) => ({ slug })) },
        owners: { create: { userId: owner.id } },
        // terça a domingo, 18h às 23h30; segunda fechado
        openingHours: {
          create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
            weekday,
            opensAt: "18:00",
            closesAt: "23:30",
            closed: weekday === 1,
          })),
        },
      },
    });

    let categoryOrder = 0;
    for (const [categoryName, products] of Object.entries(demo.menu)) {
      await db.menuCategory.create({
        data: {
          restaurantId: restaurant.id,
          name: categoryName,
          sortOrder: categoryOrder++,
          products: {
            create: products.map((p, i) => ({
              restaurantId: restaurant.id,
              name: p.name,
              description: p.description,
              priceCents: p.price,
              promoPriceCents: p.promo ?? null,
              featured: p.featured ?? false,
              sortOrder: i,
            })),
          },
        },
      });
    }

    console.log(`• Demo "${demo.name}": dono ${demo.ownerEmail}, senha provisória ${password}`);
  }
}

async function main() {
  await seedAdmin();
  await seedCategories();
  if (process.env.SEED_DEMO === "true") await seedDemo();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
