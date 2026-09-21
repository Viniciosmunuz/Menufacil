import type { Metadata } from "next";

import { PageHeader } from "@/components/panel/page-header";
import { db } from "@/lib/db";
import { formatPhone } from "@/lib/format";
import { requireAdmin } from "@/server/auth/dal";

import { NewRestaurantForm } from "./new-restaurant-form";

export const metadata: Metadata = { title: "Novo restaurante" };

export default async function NewRestaurantPage({ searchParams }: PageProps<"/admin/restaurantes/novo">) {
  await requireAdmin();
  const sp = await searchParams;
  const leadId = typeof sp.contato === "string" ? sp.contato : null;

  const [categories, lead] = await Promise.all([
    db.platformCategory.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, icon: true },
    }),
    leadId ? db.restaurantLead.findUnique({ where: { id: leadId } }) : null,
  ]);

  // cadastro a partir de um contato do site: já vem preenchido
  const initial = lead
    ? {
        leadId: lead.id,
        name: lead.restaurantName,
        city: lead.city ?? "",
        whatsapp: formatPhone(lead.whatsapp),
        ownerName: lead.contactName,
        ownerPhone: formatPhone(lead.whatsapp),
      }
    : {};

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/restaurantes", label: "Restaurantes" }}
        title="Novo restaurante"
        description="Ele começa em implantação: não aparece no site até você ativar."
      />
      <NewRestaurantForm categories={categories} initial={initial} />
    </div>
  );
}
