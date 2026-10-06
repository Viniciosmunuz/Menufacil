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

/** o dia de hoje no fuso da plataforma, como "2026-09-23" */
export function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
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

/**
 * "14:05" quando é de hoje, "21/09 14:05" quando é de outro dia.
 *
 * Na lista de pedidos do balcão, quase tudo é de hoje: repetir a data em
 * cada linha só rouba espaço de coisa que importa mais, como o nome do
 * cliente. A data volta a aparecer assim que o pedido não é mais de hoje.
 */
export function formatWhen(date: Date | string) {
  const d = new Date(date);
  const hora = formatTime(d);
  if (todayKey(d) === todayKey()) return hora;
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TIME_ZONE });
  return `${dia} ${hora}`;
}

/** meia-noite de N dias atrás, no fuso da plataforma (0 = hoje) */
export function startOfDaysAgo(days: number, now = new Date()) {
  return new Date(startOfToday(now).getTime() - days * 24 * 60 * 60 * 1000);
}

/** "seg", "ter"... para o eixo do gráfico da semana */
export function weekdayShort(date: Date) {
  return date.toLocaleDateString("pt-BR", { weekday: "short", timeZone: TIME_ZONE }).replace(".", "");
}

/**
 * "22 min", "1h05". Minutos até a hora cheia, porque é assim que se fala de
 * tempo de cozinha -- "uns quarenta minutos", nunca "0,7 hora".
 */
export function formatMinutos(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, "0")}`;
}
