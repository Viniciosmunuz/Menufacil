const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 1250 -> "R$ 12,50" */
export function formatCents(cents: number) {
  return brl.format(cents / 100);
}

/** "5592999990000" -> "(92) 99999-0000" */
export function formatPhone(digits: string | null | undefined) {
  if (!digits) return "";
  const local = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return digits;
}

/** qualquer texto de telefone -> só dígitos com 55 na frente (formato do WhatsApp) */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 11 ? `55${digits}` : digits;
}
