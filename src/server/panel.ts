import "server-only";

import type { Prisma } from "@/generated/prisma/client";

import { audit } from "./audit";
import type { RestaurantAccess } from "./auth/dal";

// Registro de uma alteração feita no painel do restaurante. Quando é o
// admin gerenciando, fica marcado no histórico.
export function panelAudit(access: RestaurantAccess, action: string, details?: Record<string, Prisma.InputJsonValue | null>) {
  return audit({
    actorUserId: access.user.id,
    action,
    restaurantId: access.restaurant.id,
    details: { ...details, ...(access.viaAdmin ? { viaAdmin: true } : {}) },
  });
}
