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
  "restaurant.info": "Informações e fotos alteradas",
  "restaurant.contact": "Contato alterado",
  "restaurant.address": "Endereço alterado",
  "restaurant.hours": "Horários alterados",
  "restaurant.open_mode": "Aberto/fechado alterado",
  "restaurant.delivery": "Entrega e retirada alteradas",
  "restaurant.payment": "Pix alterado",
  "menu.category_create": "Categoria do cardápio criada",
  "menu.category_update": "Categoria do cardápio alterada",
  "menu.category_delete": "Categoria do cardápio excluída",
  "menu.product_create": "Produto criado",
  "menu.product_update": "Produto alterado",
  "menu.product_delete": "Produto excluído",
  "menu.product_available": "Disponibilidade do produto alterada",
  "menu.product_featured": "Destaque do produto alterado",
  "demo.content": "Conteúdo de demonstração preenchido",
};

const openModeLabel: Record<string, string> = {
  AUTO: "seguir o horário",
  OPEN: "aberto manualmente",
  CLOSED: "fechado manualmente",
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
  if (action === "restaurant.open_mode" && typeof d?.openMode === "string") {
    return { title, detail: openModeLabel[d.openMode] ?? d.openMode };
  }
  if (action === "menu.product_available" && typeof d?.name === "string") {
    return { title, detail: `${d.name}: ${d.value ? "disponível" : "esgotado"}` };
  }
  if (action.startsWith("menu.") && typeof d?.name === "string") return { title, detail: d.name };
  if (action === "restaurant.create" && typeof d?.ownerEmail === "string") {
    return { title, detail: `Dono: ${d.ownerEmail}` };
  }
  return { title };
}
