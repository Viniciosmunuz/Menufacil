import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import type { RestaurantStatus, UserRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import { readSession } from "./session";

// ---- Camada de acesso -------------------------------------------------
// Toda página e toda server action que mexe em dado privado passa por aqui.
// O proxy só faz um redirecionamento otimista pela presença do cookie; quem
// decide de verdade são estas funções, que conferem a sessão no banco.
//
// Regras:
// - ADMIN (dono do MenuFácil) acessa todos os restaurantes, com a própria
//   conta, sem usar a senha do dono do restaurante.
// - RESTAURANT_OWNER acessa só os restaurantes ligados a ele em
//   RestaurantOwner, e não entra se o restaurante estiver bloqueado.
// - Quem não tem acesso recebe 404: nem a existência do restaurante vaza.

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session || session.user.status !== "ACTIVE") return null;
  const { id, name, email, role, mustChangePassword } = session.user;
  return { id, name, email, role, mustChangePassword };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

/** usuário que já trocou a senha provisória: o único que pode mexer em dados */
async function requireReadyUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/conta/senha");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireReadyUser();
  if (user.role !== "ADMIN") redirect("/painel");
  return user;
}

export type RestaurantAccess = {
  user: CurrentUser;
  restaurant: { id: string; name: string; slug: string; status: RestaurantStatus; receiptWidth: number };
  /** true quando quem está no painel é o admin da plataforma */
  viaAdmin: boolean;
};

export const getRestaurantAccess = cache(
  async (restaurantId: string): Promise<RestaurantAccess | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, slug: true, status: true, receiptWidth: true },
    });
    if (!restaurant) return null;

    if (user.role === "ADMIN") return { user, restaurant, viaAdmin: true };

    const ownership = await db.restaurantOwner.findUnique({
      where: { restaurantId_userId: { restaurantId, userId: user.id } },
      select: { id: true },
    });
    if (!ownership || restaurant.status === "BLOCKED") return null;

    return { user, restaurant, viaAdmin: false };
  },
);

export async function requireRestaurantAccess(restaurantId: string): Promise<RestaurantAccess> {
  const user = await requireReadyUser();
  const access = await getRestaurantAccess(restaurantId);
  if (!access) {
    // dono do restaurante bloqueado ve a explicação em /painel
    if (user.role === "RESTAURANT_OWNER") redirect("/painel");
    notFound();
  }
  return access;
}
