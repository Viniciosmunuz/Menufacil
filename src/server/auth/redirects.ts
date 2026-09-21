import type { UserRole } from "@/generated/prisma/client";

export function homeFor(role: UserRole) {
  return role === "ADMIN" ? "/admin" : "/painel";
}

// Só aceita voltar para uma rota interna que o papel pode abrir. Evita que
// um link de login com "?voltar=https://site-falso" mande a pessoa para fora.
export function safeReturnPath(path: string | null | undefined, role: UserRole) {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return null;
  const allowed = role === "ADMIN" ? ["/admin", "/painel"] : ["/painel"];
  return allowed.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) ? path : null;
}
