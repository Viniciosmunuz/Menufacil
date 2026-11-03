"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import type { MotivoDaOcorrencia } from "@/generated/prisma/enums";
import { requireEntregador } from "@/server/auth/dal";
import { assumirPedido, confirmarEntrega, devolverPedido, registrarOcorrencia } from "@/server/entregadores/atribuicao";
import { avisarPessoas, esquecerAparelho, guardarAparelho } from "@/server/push/avisos";

// O que o entregador faz na rua.
//
// Quem ele é vem sempre do `requireEntregador`, nunca do formulário: o
// celular manda em qual pedido o dedo tocou, e não quem está tocando. O id
// do pedido é conferido contra o restaurante e contra o cadastro dele
// dentro de cada função do servidor.

export type AcaoState = { ok?: boolean; error?: string };

const MOTIVOS: MotivoDaOcorrencia[] = ["CLIENTE_NAO_ENCONTRADO", "ENDERECO_INCORRETO", "CLIENTE_NAO_ATENDE", "PROBLEMA_COM_PEDIDO", "OUTRO"];

export async function assumir(_prev: AcaoState, formData: FormData): Promise<AcaoState> {
  const { entregador, restaurant } = await requireEntregador();
  const r = await assumirPedido(restaurant.id, entregador.id, String(formData.get("orderId") ?? ""));
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: true };
}

export async function devolver(_prev: AcaoState, formData: FormData): Promise<AcaoState> {
  const { entregador, restaurant } = await requireEntregador();
  const r = await devolverPedido(restaurant.id, entregador.id, String(formData.get("orderId") ?? ""));
  if (!r.ok) return { error: r.error };
  redirect(`/entregador/${restaurant.id}`);
}

export async function confirmar(_prev: AcaoState, formData: FormData): Promise<AcaoState> {
  const { entregador, restaurant, user } = await requireEntregador();
  const r = await confirmarEntrega(restaurant.id, entregador.id, user.id, String(formData.get("orderId") ?? ""));
  if (!r.ok) return { error: r.error };
  // entregou: volta para a lista, que é onde está o próximo
  redirect(`/entregador/${restaurant.id}`);
}

export async function contarProblema(_prev: AcaoState, formData: FormData): Promise<AcaoState> {
  const { entregador, restaurant } = await requireEntregador();
  const escolha = String(formData.get("motivo") ?? "");
  if (!MOTIVOS.includes(escolha as MotivoDaOcorrencia)) return { error: "Escolha o que aconteceu." };

  const r = await registrarOcorrencia(
    restaurant.id,
    entregador.id,
    String(formData.get("orderId") ?? ""),
    escolha as MotivoDaOcorrencia,
    String(formData.get("descricao") ?? ""),
  );
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: true };
}

// ---- avisos no celular dele -------------------------------------------
// Mesmo caminho do "Avisar neste aparelho" do balcão: o aparelho se
// cadastra num serviço de push e o servidor manda o aviso para lá. A
// diferença é o destinatário -- aqui o aviso é da conta dele, e não do
// restaurante, então o celular do entregador não apita a cada pedido que
// entra na cozinha.

export async function ligarAvisosDoEntregador(entrada: {
  restaurantId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  label?: string;
}) {
  const { user, restaurant } = await requireEntregador();
  await guardarAparelho({
    restaurantId: restaurant.id,
    userId: user.id,
    endpoint: entrada.endpoint,
    p256dh: entrada.p256dh,
    auth: entrada.auth,
    label: entrada.label?.slice(0, 60) ?? null,
  });
}

export async function desligarAvisosDoEntregador(entrada: { restaurantId: string; endpoint: string }) {
  const { restaurant } = await requireEntregador();
  await esquecerAparelho(entrada.endpoint, restaurant.id);
}

/** o restaurantId vem da peça compartilhada; quem manda é a sessão */
export async function testarAvisosDoEntregador(restaurantId: string) {
  const { user, restaurant } = await requireEntregador();
  if (restaurantId !== restaurant.id) return { enviados: 0 };
  const enviados = await avisarPessoas(restaurant.id, [user.id], {
    titulo: "Está funcionando",
    corpo: "É assim que você vai saber que tem entrega.",
    tag: "teste-entregador",
    url: `/entregador/${restaurant.id}`,
  });
  return { enviados };
}
