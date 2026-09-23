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

// Fuso usado para datas e para "hoje" nos painéis. O servidor na nuvem roda
// em UTC; sem isso, o dia viraria às 20h em Manaus.
export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE || "America/Manaus";

/** 21/09/2026 14:05 */
export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: TIME_ZONE });
}

/** 14:05 */
export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });
}

/** meia-noite de hoje no fuso da plataforma, como instante UTC */
export function startOfToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const zoned = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  // os dois lados contam em minutos cheios: comparar com os segundos de
  // agora empurrava o começo do dia para 00:01 em metade das vezes
  const agoraNoMinuto = Math.floor(now.getTime() / 60000) * 60000;
  const offset = zoned - agoraNoMinuto;
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")) - offset);
}
