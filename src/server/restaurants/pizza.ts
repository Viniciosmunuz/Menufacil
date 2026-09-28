import "server-only";

import { db } from "@/lib/db";
import { setFlavorCategories as sync, syncPizzaProducts as syncProducts } from "@/lib/pizza-sync";

// O painel chama a sincronização com o cliente do banco da aplicação; o
// seed chama a mesma função com o dele.

export const setFlavorCategories = (restaurantId: string, categoryIds: string[]) => sync(db, restaurantId, categoryIds);

export const syncPizzaProducts = (restaurantId: string, maxFlavors: number) => syncProducts(db, restaurantId, maxFlavors);
