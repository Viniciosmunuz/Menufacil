"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireAdmin } from "@/server/auth/dal";

export async function setLeadHandled(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const handled = formData.get("handled") === "true";

  const { count } = await db.restaurantLead.updateMany({ where: { id }, data: { handled } });
  if (count > 0) await audit({ actorUserId: admin.id, action: "lead.update", details: { id, handled } });
  refresh();
}

/**
 * Apaga um contato. Serve para dois casos: o que já foi atendido e não
 * precisa mais ficar na lista, e o que nunca foi contato de verdade (o
 * formulário é aberto no site, então spam chega).
 *
 * Sem volta: o contato não vai para lugar nenhum, some. Por isso a tela
 * pede dois toques antes de mandar.
 */
export async function excluirContato(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const lead = await db.restaurantLead.findUnique({
    where: { id },
    select: { restaurantName: true, contactName: true, handled: true },
  });
  if (!lead) return;

  await db.restaurantLead.delete({ where: { id } });
  // o nome fica no histórico: sem ele, a linha do log não diz nada
  await audit({
    actorUserId: admin.id,
    action: "lead.delete",
    details: { restaurante: lead.restaurantName, contato: lead.contactName, atendido: lead.handled },
  });
  refresh();
}

/** limpa de uma vez tudo que já foi atendido */
export async function limparAtendidos() {
  const admin = await requireAdmin();
  const { count } = await db.restaurantLead.deleteMany({ where: { handled: true } });
  if (count > 0) await audit({ actorUserId: admin.id, action: "lead.delete_handled", details: { quantos: count } });
  refresh();
}
