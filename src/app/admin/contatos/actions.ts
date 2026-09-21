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
