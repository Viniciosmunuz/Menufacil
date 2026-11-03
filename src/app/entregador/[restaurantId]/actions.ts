"use server";

import { refresh } from "next/cache";

import type { DisponibilidadeEntregador } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requireEntregador } from "@/server/auth/dal";

// Ações da tela do entregador.
//
// Quem é ele vem sempre do `requireEntregador`, nunca de um campo do
// formulário: o celular manda o que o dedo tocou, e não quem está tocando.

const VALORES: DisponibilidadeEntregador[] = ["DISPONIVEL", "INDISPONIVEL", "PAUSA"];

export async function mudarDisponibilidade(formData: FormData): Promise<void> {
  const { entregador } = await requireEntregador();
  const escolha = String(formData.get("disponibilidade") ?? "");
  if (!VALORES.includes(escolha as DisponibilidadeEntregador)) return;

  await db.entregador.update({
    where: { id: entregador.id },
    data: { disponibilidade: escolha as DisponibilidadeEntregador },
  });
  refresh();
}
