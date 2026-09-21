import { isRestaurantStatus, restaurantStatusLabel } from "./labels";

// Texto legível para cada linha do histórico (AuditLog).

const actionLabel: Record<string, string> = {
  "restaurant.create": "Restaurante cadastrado",
  "restaurant.update": "Dados básicos alterados",
  "restaurant.status": "Status alterado",
  "owner.add": "Dono adicionado",
  "owner.remove": "Acesso de dono removido",
  "owner.password_reset": "Nova senha provisória gerada",
  "user.password_change": "Senha alterada",
};

const fieldLabel: Record<string, string> = {
  name: "nome",
  slug: "endereço",
  city: "cidade",
  state: "estado",
  featured: "destaque",
};

type Details = Record<string, unknown> | null | undefined;

export function describeAudit(action: string, details: unknown): { title: string; detail?: string } {
  const d = (details && typeof details === "object" ? details : null) as Details;
  const title = actionLabel[action] ?? action;

  if (action === "restaurant.status" && d && isRestaurantStatus(d.from) && isRestaurantStatus(d.to)) {
    return { title, detail: `${restaurantStatusLabel[d.from]} → ${restaurantStatusLabel[d.to]}` };
  }
  if (action === "restaurant.update" && d?.changes && typeof d.changes === "object") {
    const fields = Object.keys(d.changes).map((k) => fieldLabel[k] ?? k);
    return { title, detail: fields.length ? `Mudou: ${fields.join(", ")}` : "Categorias revisadas" };
  }
  if (typeof d?.email === "string") return { title, detail: d.email };
  if (action === "restaurant.create" && typeof d?.ownerEmail === "string") {
    return { title, detail: `Dono: ${d.ownerEmail}` };
  }
  return { title };
}
