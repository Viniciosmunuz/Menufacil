import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// Registro de quem fez o quê. Importante principalmente quando o admin
// mexe no restaurante de um cliente: fica o histórico de cada alteração.
export async function audit(params: {
  actorUserId: string;
  action: string;
  restaurantId?: string | null;
  details?: Prisma.InputJsonValue;
}) {
  await db.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      action: params.action,
      restaurantId: params.restaurantId ?? null,
      details: params.details,
    },
  });
}
