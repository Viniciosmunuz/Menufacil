"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/server/audit";
import { requireAdmin } from "@/server/auth/dal";

export type EstadoDaRecarga = { error?: string; ok?: boolean };

// A recarga de créditos que ele fez na Anthropic, para a tela estimar o
// saldo (a API não informa o saldo de verdade).
//
// Fica no registro de auditoria, e não numa tabela nova: é um número que
// muda de mês em mês, e assim sobra o histórico de cada recarga sem mexer
// no banco de produção. A última gravada é a que vale.
export async function salvarRecarga(_prev: EstadoDaRecarga, formData: FormData): Promise<EstadoDaRecarga> {
  const user = await requireAdmin();

  const texto = String(formData.get("valor") ?? "").replace(/[^\d,.]/g, "");
  // "25,50" e "25.50" valem o mesmo; ponto de milhar não se usa em dólar aqui
  const valor = Number(texto.replace(",", "."));
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Informe quanto você carregou, em dólar. Ex.: 25,00" };

  const dia = String(formData.get("dia") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return { error: "Informe o dia da recarga." };
  if (dia > new Date().toISOString().slice(0, 10)) return { error: "O dia da recarga não pode ser no futuro." };

  await audit({
    actorUserId: user.id,
    action: "anthropic.recarga",
    details: { centavos: Math.round(valor * 100), dia },
  });
  revalidatePath("/admin/anthropic");
  return { ok: true };
}
