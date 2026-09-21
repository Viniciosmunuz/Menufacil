import "server-only";

import { db } from "@/lib/db";

// O que um restaurante precisa ter antes de ir para o site. Os itens
// obrigatórios evitam uma página pública quebrada (pedido sem Pix, sem
// WhatsApp para avisar, cardápio vazio). Os outros são recomendações.

export type ChecklistItem = {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
};

export async function activationChecklist(restaurantId: string) {
  const [restaurant, availableProducts] = await Promise.all([
    db.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: {
        whatsapp: true,
        pixKey: true,
        city: true,
        logoUrl: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        _count: { select: { owners: true, openingHours: true } },
      },
    }),
    db.product.count({ where: { restaurantId, available: true, category: { active: true } } }),
  ]);

  const items: ChecklistItem[] = [
    { key: "whatsapp", label: "WhatsApp para receber os pedidos", ok: !!restaurant.whatsapp, required: true },
    { key: "pix", label: "Chave Pix para o pagamento", ok: !!restaurant.pixKey, required: true },
    { key: "city", label: "Cidade do restaurante", ok: !!restaurant.city, required: true },
    { key: "menu", label: "Pelo menos 1 produto disponível no cardápio", ok: availableProducts > 0, required: true },
    {
      key: "service",
      label: "Entrega ou retirada habilitada",
      ok: restaurant.deliveryEnabled || restaurant.pickupEnabled,
      required: true,
    },
    { key: "owner", label: "Dono com acesso ao painel", ok: restaurant._count.owners > 0, required: false },
    { key: "hours", label: "Horário de funcionamento", ok: restaurant._count.openingHours > 0, required: false },
    { key: "logo", label: "Logo", ok: !!restaurant.logoUrl, required: false },
  ];

  return { items, ready: items.every((i) => i.ok || !i.required) };
}
