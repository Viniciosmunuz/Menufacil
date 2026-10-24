"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireAdmin } from "@/server/auth/dal";

// Fechar um chamado.
//
// Quem resolve é o atendimento, no WhatsApp; aqui só se marca que acabou,
// para a lista mostrar quem ainda está esperando. Reabrir é o dono mandar
// outro -- um chamado fechado por engano custa menos que um aberto para
// sempre.

export async function resolverChamado(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  const { count } = await db.supportTicket.updateMany({
    where: { id, status: "ABERTO" },
    data: { status: "RESOLVIDO", resolvedAt: new Date() },
  });
  if (count === 0) return;

  await audit({ actorUserId: admin.id, action: "suporte.resolvido", details: { id } });
  refresh();
}
