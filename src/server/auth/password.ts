import "server-only";

import bcrypt from "bcryptjs";

const COST = 12;

export const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Hash de uma senha qualquer, usado quando o e-mail não existe: o login
// gasta o mesmo tempo nos dois casos e não revela quais e-mails estão
// cadastrados.
let dummyHash: Promise<string> | null = null;
export function dummyPasswordCheck(password: string) {
  dummyHash ??= bcrypt.hash("senha-que-nao-existe", COST);
  return dummyHash.then((hash) => bcrypt.compare(password, hash));
}

// Senha provisória legível para o admin entregar ao dono do restaurante.
// Sem caracteres que confundem ao ditar (0/O, 1/l/I).
export function generateTemporaryPassword(length = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
