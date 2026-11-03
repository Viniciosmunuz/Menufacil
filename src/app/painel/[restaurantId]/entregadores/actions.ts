"use server";

import { refresh } from "next/cache";

import { formatPhone } from "@/lib/format";
import { requireEntregadores } from "@/server/auth/dal";
import {
  atualizarEntregador,
  criarEntregador,
  ligarEntregador,
  trocarSenhaDoEntregador,
  type DadosDoEntregador,
} from "@/server/entregadores/cadastro";
import { atribuirNaMao } from "@/server/entregadores/atribuicao";
import { panelAudit } from "@/server/panel";
import { hasFile, ImageError, saveImage } from "@/server/storage";

// Ações da tela de Entregadores. Todas passam por requireEntregadores:
// esconder a tela não impede ninguém de chamar a ação direto, e aqui se
// cadastra gente e se entrega senha.

export type EntregadorFormState = { ok?: boolean; error?: string; message?: string };

/** o dono, com o recurso ligado; garçom não cadastra ninguém */
async function dono(formData: FormData) {
  const restaurantId = String(formData.get("restaurantId") ?? "");
  const acesso = await requireEntregadores(restaurantId);
  if (acesso.papel === "STAFF") return { erro: "Só o dono do restaurante pode mexer nos entregadores." } as const;
  return { acesso } as const;
}

/** os campos do formulário, com a foto já enviada quando veio uma */
async function campos(formData: FormData, restaurantId: string): Promise<DadosDoEntregador | { erro: string }> {
  const foto = formData.get("foto");
  let fotoUrl: string | null = null;
  try {
    if (hasFile(foto)) fotoUrl = await saveImage({ restaurantId, kind: "entregador", file: foto });
  } catch (error) {
    if (error instanceof ImageError) return { erro: error.message };
    throw error;
  }
  return {
    nome: String(formData.get("nome") ?? ""),
    telefone: String(formData.get("telefone") ?? ""),
    senha: String(formData.get("senha") ?? ""),
    moto: String(formData.get("moto") ?? ""),
    cor: String(formData.get("cor") ?? ""),
    placa: String(formData.get("placa") ?? ""),
    fotoUrl,
  };
}

export async function cadastrarEntregador(_prev: EntregadorFormState, formData: FormData): Promise<EntregadorFormState> {
  const porta = await dono(formData);
  if ("erro" in porta) return { error: porta.erro };
  const { acesso } = porta;

  const dados = await campos(formData, acesso.restaurant.id);
  if ("erro" in dados) return { error: dados.erro };

  const r = await criarEntregador(acesso.restaurant.id, acesso.restaurant.slug, dados);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "entregador.novo", { nome: dados.nome, telefone: dados.telefone, devolta: r.devolta });
  refresh();
  const telefone = formatPhone(dados.telefone);
  return {
    ok: true,
    message: r.devolta
      ? `Entregador de volta à equipe. Ele entra com o telefone ${telefone} e a senha que você acabou de definir.`
      : `Entregador cadastrado. Ele entra com o telefone ${telefone} e a senha que você definiu.`,
  };
}

export async function salvarEntregador(_prev: EntregadorFormState, formData: FormData): Promise<EntregadorFormState> {
  const porta = await dono(formData);
  if ("erro" in porta) return { error: porta.erro };
  const { acesso } = porta;

  const entregadorId = String(formData.get("entregadorId") ?? "");
  const dados = await campos(formData, acesso.restaurant.id);
  if ("erro" in dados) return { error: dados.erro };

  // sem foto nova, a que está lá fica: o formulário de edição não reenvia
  // a foto atual, e null aqui apagaria o retrato a cada troca de telefone
  const semFoto = { ...dados, fotoUrl: dados.fotoUrl ?? undefined };
  const r = await atualizarEntregador(acesso.restaurant.id, acesso.restaurant.slug, entregadorId, semFoto);
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "entregador.editado", { entregadorId, nome: dados.nome });
  refresh();
  return { ok: true, message: "Cadastro salvo." };
}

export async function definirSenhaDoEntregador(_prev: EntregadorFormState, formData: FormData): Promise<EntregadorFormState> {
  const porta = await dono(formData);
  if ("erro" in porta) return { error: porta.erro };
  const { acesso } = porta;

  const entregadorId = String(formData.get("entregadorId") ?? "");
  const r = await trocarSenhaDoEntregador(acesso.restaurant.id, entregadorId, String(formData.get("senha") ?? ""));
  if (!r.ok) return { error: r.error };

  await panelAudit(acesso, "entregador.senha", { entregadorId });
  refresh();
  return { ok: true, message: "Senha trocada. O aparelho que estava aberto foi desconectado." };
}

export async function alternarEntregador(formData: FormData): Promise<void> {
  const porta = await dono(formData);
  if ("erro" in porta) return;
  const { acesso } = porta;

  const entregadorId = String(formData.get("entregadorId") ?? "");
  const ativo = formData.get("ativo") === "1";
  const r = await ligarEntregador(acesso.restaurant.id, entregadorId, ativo);
  if (!r.ok) return;

  await panelAudit(acesso, ativo ? "entregador.ligado" : "entregador.desligado", { entregadorId });
  refresh();
}

/** o dono dando o pedido a alguém na mão, ou tirando de quem está com ele */
export async function darPedidoA(formData: FormData): Promise<void> {
  const porta = await dono(formData);
  if ("erro" in porta) return;
  const { acesso } = porta;

  const orderId = String(formData.get("orderId") ?? "");
  const escolhido = String(formData.get("entregadorId") ?? "");
  const r = await atribuirNaMao(acesso.restaurant.id, orderId, escolhido || null);
  if (!r.ok) return;

  await panelAudit(acesso, "entregador.pedido_atribuido", { orderId, entregadorId: escolhido || null });
  refresh();
}
