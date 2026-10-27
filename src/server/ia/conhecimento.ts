import "server-only";

import { db } from "@/lib/db";
import { formatCents, TIME_ZONE } from "@/lib/format";
import { isOpenNow, WEEKDAYS, type OpeningHourData } from "@/lib/opening-hours";
import { appUrl } from "@/lib/site";

// O que a IA sabe sobre o restaurante.
//
// Só leitura: monta um texto a partir do cadastro, do horário e do
// cardápio, e não grava nada. É o mesmo cardápio que o cliente vê pelo
// link -- o que está esgotado aparece como esgotado, e a seção que é só do
// salão nem entra.
//
// Dividido em duas partes de propósito:
//
// - **o fixo** (cardápio, horários, regras) muda pouco e vai num bloco que
//   a Anthropic guarda em cache. A partir da segunda mensagem, essa parte
//   custa uma fração do preço.
// - **o agora** (que horas são, se está aberto) muda a cada minuto e vai
//   numa mensagem separada no fim. Se fosse junto do fixo, o cache nunca
//   seria aproveitado.

export type Conhecimento = { fixo: string; agora: string; link: string; nome: string };

export async function conhecimentoDoRestaurante(restaurantId: string): Promise<Conhecimento | null> {
  const r = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      name: true,
      slug: true,
      status: true,
      description: true,
      neighborhood: true,
      city: true,
      street: true,
      number: true,
      openMode: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      pickupOnlyUntil: true,
      deliveryFeeCents: true,
      minOrderCents: true,
      deliveryTimeMin: true,
      deliveryTimeMax: true,
      acceptsCard: true,
      acceptsCash: true,
      openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
      menuCategories: {
        // a seção que só o garçom lança (couvert, embalagem) não existe para o cliente
        where: { active: true, somenteSalao: false },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          name: true,
          products: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { name: true, description: true, priceCents: true, promoPriceCents: true, available: true },
          },
        },
      },
    },
  });
  if (!r) return null;

  const link = `${appUrl()}/restaurante/${r.slug}`;
  const linhas: string[] = [];

  linhas.push(`RESTAURANTE: ${r.name}`);
  if (r.description) linhas.push(`Sobre: ${r.description}`);
  const endereco = [r.street && `${r.street}${r.number ? `, ${r.number}` : ""}`, r.neighborhood, r.city].filter(Boolean).join(" - ");
  if (endereco) linhas.push(`Endereço: ${endereco}`);
  linhas.push(`Link do cardápio para pedir: ${link}`);
  linhas.push("");

  linhas.push("HORÁRIO DE FUNCIONAMENTO:");
  const horas = r.openingHours as OpeningHourData[];
  for (let dia = 0; dia < 7; dia++) {
    const h = horas.find((x) => x.weekday === dia);
    linhas.push(`- ${WEEKDAYS[dia]}: ${!h || h.closed ? "fechado" : `${h.opensAt} às ${h.closesAt}`}`);
  }
  linhas.push("");

  linhas.push("ENTREGA E RETIRADA:");
  linhas.push(`- Entrega: ${r.deliveryEnabled ? "sim" : "não"}`);
  linhas.push(`- Retirada no local: ${r.pickupEnabled ? "sim" : "não"}`);
  if (r.deliveryEnabled) {
    linhas.push(`- Taxa de entrega: ${r.deliveryFeeCents > 0 ? formatCents(r.deliveryFeeCents) : "grátis"}`);
    if (r.deliveryTimeMin && r.deliveryTimeMax) linhas.push(`- Tempo de entrega: ${r.deliveryTimeMin} a ${r.deliveryTimeMax} minutos`);
  }
  if (r.minOrderCents > 0) linhas.push(`- Pedido mínimo: ${formatCents(r.minOrderCents)}`);
  const formas = ["Pix", r.acceptsCard && "cartão", r.acceptsCash && "dinheiro"].filter(Boolean).join(", ");
  linhas.push(`- Formas de pagamento: ${formas}`);
  linhas.push("");

  linhas.push("CARDÁPIO (preços em reais):");
  for (const c of r.menuCategories) {
    if (c.products.length === 0) continue;
    linhas.push(`\n## ${c.name}`);
    for (const p of c.products) {
      const preco = p.promoPriceCents
        ? `${formatCents(p.promoPriceCents)} (promoção; de ${formatCents(p.priceCents)})`
        : formatCents(p.priceCents);
      const descricao = p.description ? ` — ${p.description.slice(0, 160)}` : "";
      linhas.push(`- ${p.name}: ${preco}${p.available ? "" : " [ESGOTADO HOJE]"}${descricao}`);
    }
  }

  // ─── o agora ───────────────────────────────────────────────────────
  const aberto = r.status === "ACTIVE" && isOpenNow(r.openMode, horas);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const soRetirada = r.pickupOnlyUntil && r.pickupOnlyUntil > new Date();
  const agora = [
    `Agora: ${hora}.`,
    aberto ? "O restaurante está ABERTO e recebendo pedidos." : "O restaurante está FECHADO agora.",
    soRetirada ? "A entrega está pausada no momento; só retirada no local." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { fixo: linhas.join("\n"), agora, link, nome: r.name };
}
