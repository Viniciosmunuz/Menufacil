"use server";

import { refresh } from "next/cache";

import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { audit } from "@/server/audit";
import { requireDono } from "@/server/auth/dal";
import { iaConfigurada } from "@/server/ia/responder";

export type EstadoDaAcao = { error?: string; message?: string };

/**
 * Os números que a IA nunca responde.
 *
 * O WhatsApp do restaurante costuma ser o celular do dono, e ali chega a
 * família dele. A lista inteira é gravada de uma vez: são poucos números,
 * e casar linha a linha não pagaria o trabalho.
 */
export async function salvarListas(
  _prev: EstadoDaAcao,
  formData: FormData,
): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(
    String(formData.get("restaurantId") ?? ""),
  );

  /** os números de um campo, só dígitos e sem repetir */
  function numerosDe(campo: string) {
    const fora: string[] = [];
    for (const bruto of formData.getAll(campo)) {
      const texto = String(bruto).trim();
      if (!texto) continue; // linha em branco é linha que ele desistiu de preencher
      const limpo = normalizePhone(texto);
      if (!/^55\d{10,11}$/.test(limpo)) throw new NumeroRuim(texto);
      if (!fora.includes(limpo)) fora.push(limpo);
    }
    return fora;
  }

  let ignorados: string[];
  let semEspera: string[];
  try {
    ignorados = numerosDe("ignorado");
    semEspera = numerosDe("teste");
  } catch (e) {
    if (e instanceof NumeroRuim)
      return { error: `"${e.texto}" não parece um número com DDD.` };
    throw e;
  }

  await db.atendenteIa.update({
    where: { restaurantId: restaurant.id },
    data: { ignorados, semEspera },
  });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: "restaurant.ia.listas",
    details: {
      ignorados: ignorados.length,
      semEspera: semEspera.length,
      viaAdmin,
    },
  });
  refresh();
  return { message: "Listas salvas." };
}

/** um número que não dá para usar; o nome dele volta na mensagem de erro */
class NumeroRuim extends Error {
  constructor(readonly texto: string) {
    super("número inválido");
  }
}

/**
 * O dono liga ou desliga a IA do restaurante dele.
 *
 * Só depois que o admin conectou o WhatsApp: antes disso não há o que
 * ligar. O que a IA pode fazer (só dúvidas ou também pedidos) continua com
 * o admin.
 */
export async function ligarIaDoRestaurante(
  _prev: EstadoDaAcao,
  formData: FormData,
): Promise<EstadoDaAcao> {
  const { restaurant, user, viaAdmin } = await requireDono(
    String(formData.get("restaurantId") ?? ""),
  );
  const ligar = formData.get("ligar") === "1";

  const atendente = await db.atendenteIa.findUnique({
    where: { restaurantId: restaurant.id },
    select: { phoneNumberId: true },
  });
  if (!atendente?.phoneNumberId)
    return {
      error:
        "O WhatsApp ainda não foi conectado. Fale com o suporte do MenuFácil.",
    };
  if (ligar && !iaConfigurada())
    return {
      error: "A IA ainda não está liberada. Fale com o suporte do MenuFácil.",
    };

  await db.atendenteIa.update({
    where: { restaurantId: restaurant.id },
    data: { ativo: ligar },
  });
  await audit({
    actorUserId: user.id,
    restaurantId: restaurant.id,
    action: ligar ? "restaurant.ia.on" : "restaurant.ia.off",
    details: { viaAdmin },
  });
  refresh();
  return { message: ligar ? "IA ligada." : "IA desligada." };
}
