"use client";

import { useState } from "react";

// Formulário que abre com um clique e fecha sozinho quando a action volta
// com sucesso ({ ok: true }). Com erro, continua aberto mostrando o erro.
// Compara o objeto de estado: cada resposta da action é um objeto novo.
export function useOpenUntilSaved(state: { ok?: boolean }) {
  const [openedAt, setOpenedAt] = useState<object | null>(null);
  const open = openedAt !== null && (openedAt === state || !state.ok);
  return [open, () => setOpenedAt(state), () => setOpenedAt(null)] as const;
}
