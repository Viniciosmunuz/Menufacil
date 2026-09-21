import type { RestaurantStatus } from "@/generated/prisma/enums";

// Caminhos permitidos entre os status de um restaurante, usados pela tela
// do admin (quais botões mostrar) e pela server action (o que aceitar).

export type StatusTransition = "activate" | "deactivate" | "return_to_setup" | "block" | "restore";

type TransitionRule = {
  from: RestaurantStatus[];
  to: RestaurantStatus;
  label: string;
  description: string;
  /** exige a lista de liberação completa */
  needsChecklist?: boolean;
  /** pede um segundo clique para confirmar */
  confirm?: string;
  tone: "primary" | "secondary" | "danger";
};

export const STATUS_TRANSITIONS: Record<StatusTransition, TransitionRule> = {
  activate: {
    from: ["DRAFT", "PENDING_REVIEW", "INACTIVE"],
    to: "ACTIVE",
    label: "Ativar e publicar",
    description: "O restaurante aparece no site e passa a receber pedidos.",
    needsChecklist: true,
    tone: "primary",
  },
  return_to_setup: {
    from: ["PENDING_REVIEW"],
    to: "DRAFT",
    label: "Devolver para ajustes",
    description: "Volta para implantação, sem aparecer no site.",
    tone: "secondary",
  },
  deactivate: {
    from: ["ACTIVE"],
    to: "INACTIVE",
    label: "Desativar",
    description: "Sai do site, mas o dono continua entrando no painel.",
    confirm: "Confirmar desativação",
    tone: "secondary",
  },
  block: {
    from: ["DRAFT", "PENDING_REVIEW", "ACTIVE", "INACTIVE"],
    to: "BLOCKED",
    label: "Bloquear",
    description: "Sai do site e o dono perde o acesso ao painel até você restaurar.",
    confirm: "Confirmar bloqueio",
    tone: "danger",
  },
  restore: {
    from: ["BLOCKED"],
    to: "INACTIVE",
    label: "Restaurar",
    description: "O dono volta a entrar no painel. O restaurante fica desativado até você ativar.",
    tone: "primary",
  },
};

export function availableTransitions(status: RestaurantStatus): StatusTransition[] {
  return (Object.keys(STATUS_TRANSITIONS) as StatusTransition[]).filter((t) =>
    STATUS_TRANSITIONS[t].from.includes(status),
  );
}

export function isStatusTransition(value: unknown): value is StatusTransition {
  return typeof value === "string" && value in STATUS_TRANSITIONS;
}
