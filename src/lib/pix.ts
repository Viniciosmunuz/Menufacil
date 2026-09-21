import type { PixKeyType } from "@/generated/prisma/enums";

import { formatPhone, normalizePhone } from "./format";

export const pixKeyTypeLabel: Record<PixKeyType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Celular",
  RANDOM: "Chave aleatória",
};

export const PIX_KEY_TYPES = Object.keys(pixKeyTypeLabel) as PixKeyType[];

export function isPixKeyType(value: unknown): value is PixKeyType {
  return typeof value === "string" && value in pixKeyTypeLabel;
}

function validCpf(d: string) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
}

function validCnpj(d: string) {
  if (!/^\d{14}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const digit = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return digit(12) === Number(d[12]) && digit(13) === Number(d[13]);
}

/** confere e deixa a chave no formato do Pix; devolve o erro para o formulário */
export function normalizePixKey(type: PixKeyType, raw: string): { value: string } | { error: string } {
  const input = raw.trim();
  switch (type) {
    case "CPF": {
      const d = input.replace(/\D/g, "");
      return validCpf(d) ? { value: d } : { error: "CPF inválido. Confira os 11 números." };
    }
    case "CNPJ": {
      const d = input.replace(/\D/g, "");
      return validCnpj(d) ? { value: d } : { error: "CNPJ inválido. Confira os 14 números." };
    }
    case "EMAIL": {
      const v = input.toLowerCase();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 77 ? { value: v } : { error: "E-mail inválido." };
    }
    case "PHONE": {
      const d = normalizePhone(input);
      return /^55\d{10,11}$/.test(d) ? { value: `+${d}` } : { error: "Celular inválido. Use DDD + número." };
    }
    case "RANDOM": {
      const v = input.toLowerCase();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
        ? { value: v }
        : { error: "Chave aleatória inválida. Copie do app do banco, com os tracinhos." };
    }
  }
}

/** para mostrar ao cliente e no painel */
export function formatPixKey(type: PixKeyType | null | undefined, value: string) {
  if (type === "CPF" && /^\d{11}$/.test(value)) {
    return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
  }
  if (type === "CNPJ" && /^\d{14}$/.test(value)) {
    return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
  }
  if (type === "PHONE") return formatPhone(value.replace(/\D/g, ""));
  return value;
}
