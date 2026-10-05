import type { OpenMode } from "@/generated/prisma/enums";

import { TIME_ZONE } from "./format";

// Horário de funcionamento. Um intervalo por dia (0 = domingo). O fechamento
// pode passar da meia-noite (18:00 às 02:00): nesse caso o restaurante
// continua aberto na madrugada do dia seguinte.

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type OpeningHourData = { weekday: number; opensAt: string; closesAt: string; closed: boolean };

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** dia da semana e minuto do dia no fuso da plataforma */
export function localClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function openAt(hours: OpeningHourData[], weekday: number, minutes: number) {
  const today = hours.find((h) => h.weekday === weekday);
  if (today && !today.closed) {
    const open = toMinutes(today.opensAt);
    const close = toMinutes(today.closesAt);
    if (close > open ? minutes >= open && minutes < close : minutes >= open) return true;
  }
  // madrugada: intervalo de ontem que passou da meia-noite
  const yesterday = hours.find((h) => h.weekday === (weekday + 6) % 7);
  if (yesterday && !yesterday.closed) {
    const open = toMinutes(yesterday.opensAt);
    const close = toMinutes(yesterday.closesAt);
    if (close <= open && minutes < close) return true;
  }
  return false;
}

export function isOpenNow(openMode: OpenMode, hours: OpeningHourData[], now = new Date()) {
  if (openMode === "OPEN") return true;
  if (openMode === "CLOSED") return false;
  const { weekday, minutes } = localClock(now);
  return openAt(hours, weekday, minutes);
}

/** "Hoje: 18:00 às 23:30" | "Hoje: fechado" | "Horário não informado" */
export function todayLabel(hours: OpeningHourData[], now = new Date()) {
  if (hours.length === 0) return "Horário não informado";
  const today = hours.find((h) => h.weekday === localClock(now).weekday);
  if (!today || today.closed) return "Hoje: fechado";
  return `Hoje: ${today.opensAt} às ${today.closesAt}`;
}

/** "Aberto · até 23:30" | "Fechado · abre às 11:00" | "Fechado · abre amanhã às 11:00" */
export function openStatusLabel(openMode: OpenMode, hours: OpeningHourData[], now = new Date()) {
  const open = isOpenNow(openMode, hours, now);
  if (openMode === "OPEN") return { open, detail: null };
  if (openMode === "CLOSED") return { open, detail: null };
  if (hours.length === 0) return { open, detail: null };

  const { weekday, minutes } = localClock(now);
  const today = hours.find((h) => h.weekday === weekday);
  if (open) {
    // aberto por um horário de ontem que passou da meia-noite
    const yesterday = hours.find((h) => h.weekday === (weekday + 6) % 7);
    const closing = today && !today.closed && minutes >= toMinutes(today.opensAt) ? today.closesAt : yesterday?.closesAt;
    return { open, detail: closing ? `até ${closing}` : null };
  }
  if (today && !today.closed && minutes < toMinutes(today.opensAt)) return { open, detail: `abre às ${today.opensAt}` };
  for (let i = 1; i <= 7; i++) {
    const day = hours.find((h) => h.weekday === (weekday + i) % 7);
    if (day && !day.closed) {
      const when = i === 1 ? "amanhã" : WEEKDAYS[day.weekday].toLowerCase();
      return { open, detail: `abre ${when} às ${day.opensAt}` };
    }
  }
  return { open, detail: null };
}

/**
 * Quando a noite de hoje acaba, para o "só retirada" saber até onde vale.
 *
 * O modo não é um liga/desliga: ele nasce com hora para morrer, e essa hora
 * é o fechamento do turno em andamento. Com isso ninguém precisa lembrar de
 * desligar -- e, mais importante, ninguém passa o dia seguinte sem entregar
 * por ter esquecido ligado.
 *
 * O turno que cruza a meia-noite (18:00 às 00:00, que é o do Papaléguas)
 * fecha no dia seguinte, e é por isso que a conta não é simplesmente "hoje
 * às closesAt".
 *
 * Sem horário cadastrado, ou aberto manualmente num dia marcado como
 * fechado, não há fechamento a que se agarrar: aí vale o limite de
 * segurança, porque um modo sem fim seria exatamente o que se quer evitar.
 */
const LIMITE_SEM_HORARIO_H = 8;

export function fimDoTurno(hours: OpeningHourData[], now = new Date()) {
  const { weekday, minutes } = localClock(now);
  const limite = new Date(now.getTime() + LIMITE_SEM_HORARIO_H * 60 * 60 * 1000);

  // madrugada: quem manda é o turno de ontem, que ainda não fechou
  const ontem = hours.find((h) => h.weekday === (weekday + 6) % 7);
  if (ontem && !ontem.closed) {
    const abre = toMinutes(ontem.opensAt);
    const fecha = toMinutes(ontem.closesAt);
    if (fecha <= abre && minutes < fecha) return new Date(now.getTime() + (fecha - minutes) * 60 * 1000);
  }

  const hoje = hours.find((h) => h.weekday === weekday);
  if (hoje && !hoje.closed) {
    const abre = toMinutes(hoje.opensAt);
    const fecha = toMinutes(hoje.closesAt);
    // o turno que cruza a meia-noite fecha amanhã, não hoje
    const faltam = fecha > abre ? fecha - minutes : fecha + 24 * 60 - minutes;
    if (faltam > 0) return new Date(now.getTime() + faltam * 60 * 1000);
  }

  return limite;
}

/** a entrega está pausada agora? */
export const soRetirada = (pickupOnlyUntil: Date | null | undefined, now = new Date()) =>
  !!pickupOnlyUntil && pickupOnlyUntil.getTime() > now.getTime();
