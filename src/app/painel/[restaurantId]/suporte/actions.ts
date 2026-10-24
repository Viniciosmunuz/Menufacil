"use server";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { linkWhatsappMenuFacil } from "@/lib/contato";
import { requireDono } from "@/server/auth/dal";
import { panelAudit } from "@/server/panel";

import { ASSUNTOS, type Assunto } from "./assuntos";

// Pedir ajuda.
//
// O chamado é gravado e a conversa abre no WhatsApp com tudo escrito. As
// duas coisas, e não uma: o WhatsApp sozinho se perde no meio do dia --
// três restaurantes pedindo ajuda ao mesmo tempo e uma das mensagens fica
// sem resposta --, e o registro sozinho vira uma caixa de entrada que
// ninguém abre. Assim o dono fala por onde ele já fala, e o MenuFácil tem
// a lista de quem está esperando.

export type SuporteFormState = { error?: string };

export async function pedirAjuda(_prev: SuporteFormState, formData: FormData): Promise<SuporteFormState> {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireDono(restaurantId);

  const assunto = String(formData.get("assunto") ?? "Outro");
  const mensagem = String(formData.get("mensagem") ?? "").trim();

  if (mensagem.length < 10) return { error: "Conte um pouco mais do que está acontecendo, para a gente já olhar certo." };
  if (!ASSUNTOS.includes(assunto as Assunto)) return { error: "Escolha do que se trata." };

  await db.supportTicket.create({
    data: {
      restaurantId,
      abertoPor: acesso.user.name,
      assunto,
      mensagem: mensagem.slice(0, 2000),
    },
    select: { id: true },
  });

  await panelAudit(acesso, "suporte.chamado", { assunto });

  // a conversa já abre dizendo de qual restaurante é e do que se trata:
  // do outro lado, descobrir isso custa duas perguntas e uma hora
  const texto = `*Suporte MenuFácil*\n\nRestaurante: ${acesso.restaurant.name}\nQuem fala: ${acesso.user.name}\nAssunto: ${assunto}\n\n${mensagem}`;
  const link = linkWhatsappMenuFacil(texto);
  redirect(link ?? `/painel/${restaurantId}/suporte`);
}
