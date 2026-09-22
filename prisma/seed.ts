// Dados iniciais do MenuFácil.
//
//   npm run db:seed
//
// Sempre: conta do administrador (ADMIN_EMAIL) e categorias da plataforma.
// Com SEED_DEMO="true": quatro restaurantes fictícios completos (logo, capa,
// cardápio com fotos) e seus donos, para demonstrar e testar. Rodar de novo
// não duplica nada, e cada demo é preenchido uma única vez: depois disso, o
// que for mudado nele pelo painel não é sobrescrito.
import "dotenv/config";

import { randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

import { demoRestaurants } from "./demo-data";

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

const DEMO_MARK = "demo.content";

async function seedDemo() {
  for (const demo of demoRestaurants) {
    let restaurant = await db.restaurant.findUnique({ where: { slug: demo.slug } });
    if (restaurant && (await db.auditLog.findFirst({ where: { restaurantId: restaurant.id, action: DEMO_MARK } }))) {
      console.log(`• Demo "${demo.name}" já preenchido.`);
      continue;
    }

    // dono (conta nova ganha senha provisória)
    let password: string | null = null;
    let owner = await db.user.findUnique({ where: { email: demo.owner.email } });
    if (!owner) {
      password = temporaryPassword();
      owner = await db.user.create({
        data: {
          name: demo.owner.name,
          email: demo.owner.email,
          passwordHash: await bcrypt.hash(password, 12),
          role: "RESTAURANT_OWNER",
          mustChangePassword: true,
        },
      });
    }

    const data = {
      name: demo.name,
      description: demo.description,
      logoUrl: demo.logo,
      coverUrl: demo.cover,
      status: "ACTIVE" as const,
      featured: true,
      whatsapp: null,
      street: demo.address.street,
      number: demo.address.number,
      neighborhood: demo.address.neighborhood,
      city: "Presidente Figueiredo",
      state: "AM",
      zipCode: "69735000",
      openMode: "AUTO" as const,
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryFeeCents: demo.delivery.fee,
      minOrderCents: demo.delivery.min,
      deliveryTimeMin: demo.delivery.timeMin,
      deliveryTimeMax: demo.delivery.timeMax,
      pixKey: demo.pix.key,
      pixKeyType: "EMAIL" as const,
      pixHolderName: demo.pix.holder,
      paymentInstructions: demo.pix.instructions ?? null,
    };

    restaurant = restaurant
      ? await db.restaurant.update({ where: { id: restaurant.id }, data })
      : await db.restaurant.create({ data: { ...data, slug: demo.slug, activatedAt: new Date() } });
    const restaurantId = restaurant.id;

    await db.$transaction(async (tx) => {
      await tx.restaurant.update({
        where: { id: restaurantId },
        data: { categories: { set: demo.categories.map((slug) => ({ slug })) } },
      });
      await tx.restaurantOwner.upsert({
        where: { restaurantId_userId: { restaurantId, userId: owner.id } },
        update: {},
        create: { restaurantId, userId: owner.id },
      });
      await tx.openingHour.deleteMany({ where: { restaurantId } });
      await tx.openingHour.createMany({
        data: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          restaurantId,
          weekday,
          opensAt: demo.hours.opensAt,
          closesAt: demo.hours.closesAt,
          closed: demo.hours.closedWeekdays?.includes(weekday) ?? false,
        })),
      });
      // cardápio novo (pedidos antigos guardam nome e preço próprios)
      await tx.menuCategory.deleteMany({ where: { restaurantId } });
      for (const [categoryOrder, category] of demo.menu.entries()) {
        await tx.menuCategory.create({
          data: {
            restaurantId,
            name: category.name,
            description: category.description ?? null,
            sortOrder: categoryOrder,
            products: {
              create: category.products.map((p, i) => ({
                restaurantId,
                name: p.name,
                description: p.description,
                imageUrl: p.image,
                priceCents: p.price,
                promoPriceCents: p.promo ?? null,
                featured: p.featured ?? false,
                sortOrder: i,
              })),
            },
          },
        });
      }
      await tx.auditLog.create({ data: { restaurantId, action: DEMO_MARK, details: { version: 1 } } });
    });

    const products = demo.menu.reduce((sum, c) => sum + c.products.length, 0);
    console.log(
      `• Demo "${demo.name}" preenchido (${products} produtos)${password ? `: dono ${demo.owner.email}, senha provisória ${password}` : ""}`,
    );
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
