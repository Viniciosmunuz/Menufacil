"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireRestaurantAccess, type RestaurantAccess } from "@/server/auth/dal";
import { panelAudit } from "@/server/panel";
import { esquecerConta, salvarChaveDoWebhook, salvarMaquininha, salvarToken } from "@/server/totem/config";
import { desligarTotem, novoCodigoDePareamento } from "@/server/totem/dispositivos";
import { darBaixaNoPagamento, gravarPedidoDoPagamento } from "@/server/totem/pagos";
import { ImageError, deleteImage, hasFile, saveImage } from "@/server/storage";

// Ações da seção Totem.
//
// Todas conferem duas coisas antes de qualquer outra: quem está mexendo
// tem acesso a este restaurante, e o totem está liberado para ele. Sumir
// com o link no menu não basta -- o endereço digitado na mão passaria.

export type TotemState = { ok?: boolean; error?: string; message?: string; savedAt?: number };

async function acesso(formData: FormData): Promise<RestaurantAccess> {
  const access = await requireRestaurantAccess(String(formData.get("restaurantId") ?? ""));
  if (!access.restaurant.totemEnabled) notFound();
  return access;
}

function salvo(): TotemState {
  refresh();
  return { ok: true, savedAt: Date.now() };
}

export async function salvarAccessToken(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const token = String(formData.get("accessToken") ?? "");
  if (!token.trim()) return { error: "Cole o Access Token da sua conta do Mercado Pago." };

  const resultado = await salvarToken(access.restaurant.id, token);
  if ("erro" in resultado) return { error: resultado.erro };

  // o token em si nunca entra no histórico: só o fato de ter sido trocado
  await panelAudit(access, "totem.mercado_pago", { producao: resultado.producao });
  return salvo();
}

export async function salvarDeviceId(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const deviceId = String(formData.get("deviceId") ?? "").trim();
  if (deviceId && !/^[A-Za-z0-9_-]{4,60}$/.test(deviceId)) {
    return { error: "O número da maquininha tem só letras, números, hífen e sublinhado." };
  }

  await salvarMaquininha(access.restaurant.id, deviceId);
  await panelAudit(access, "totem.maquininha", { preenchido: Boolean(deviceId) });
  return salvo();
}

export async function salvarWebhook(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const chave = String(formData.get("webhookKey") ?? "");

  const resultado = await salvarChaveDoWebhook(access.restaurant.id, chave);
  if ("erro" in resultado) return { error: resultado.erro };

  await panelAudit(access, "totem.webhook", { preenchido: Boolean(chave.trim()) });
  return salvo();
}

export async function desconectarMercadoPago(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  await esquecerConta(access.restaurant.id);
  await panelAudit(access, "totem.desconectado");
  refresh();
  return { ok: true, message: "Conta do Mercado Pago removida deste restaurante." };
}

export async function gerarCodigoDoTotem(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const { pairingCode } = await novoCodigoDePareamento(access.restaurant.id);
  await panelAudit(access, "totem.codigo");
  refresh();
  return { ok: true, message: `Código do novo totem: ${pairingCode}` };
}

export async function removerTotem(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const deviceId = String(formData.get("deviceId") ?? "");
  const { count } = await desligarTotem(deviceId, access.restaurant.id);
  if (count === 0) return { error: "Esse totem já não está ligado a este restaurante." };

  await panelAudit(access, "totem.removido");
  refresh();
  return { ok: true, message: "Totem desligado. Ele vai pedir o código de novo ao abrir." };
}

/**
 * O cartaz que fica na tela do totem parado.
 *
 * É imagem de cada restaurante, não da plataforma: um cartaz de hambúrguer
 * na açaiteria do centro seria pior do que cartaz nenhum. Sem cartaz
 * cadastrado, o totem monta a tela sozinho com a capa do restaurante.
 */
export async function salvarCartazDoTotem(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const arquivo = formData.get("cartaz");
  const marcado = String(formData.get("removerCartaz") ?? "");
  const remover = marcado === "on" || marcado === "true";

  if (!remover && !hasFile(arquivo)) return { error: "Escolha uma imagem para o cartaz." };

  const atual = await db.restaurant.findUnique({
    where: { id: access.restaurant.id },
    select: { totemIdleUrl: true },
  });

  let totemIdleUrl: string | null = null;
  if (!remover && hasFile(arquivo)) {
    try {
      totemIdleUrl = await saveImage({ restaurantId: access.restaurant.id, kind: "descanso", file: arquivo });
    } catch (e) {
      return { error: e instanceof ImageError ? e.message : "Não consegui salvar essa imagem." };
    }
  }

  await db.restaurant.update({ where: { id: access.restaurant.id }, data: { totemIdleUrl } });
  // a imagem antiga só é apagada depois que a nova já está salva no banco
  if (atual?.totemIdleUrl && atual.totemIdleUrl !== totemIdleUrl) await deleteImage(atual.totemIdleUrl);

  await panelAudit(access, "totem.cartaz", { cartaz: totemIdleUrl ? "trocado" : "removido" });
  return remover ? { ok: true, message: "Cartaz removido. O totem volta a montar a tela com a sua capa." } : salvo();
}

// ---- pagamento que entrou sem o pedido entrar ---------------------------
//
// O dinheiro do cliente já saiu. As duas ações abaixo são as duas saídas
// que o balcão tem: gravar o pedido com o mesmo carrinho, ou dar baixa
// porque resolveu na mão.

export async function gravarPedidoPago(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const pagamentoId = String(formData.get("pagamentoId") ?? "");

  const resultado = await gravarPedidoDoPagamento(access.restaurant.id, pagamentoId);
  if ("erro" in resultado) return { error: resultado.erro };

  await panelAudit(access, "totem.pago_sem_pedido.gravado", { pagamentoId, pedido: resultado.numero });
  refresh();
  return { ok: true, message: `Pedido #${resultado.numero} gravado. Ele já está na aba Pedidos e sai na impressora.` };
}

export async function baixarPagamento(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const pagamentoId = String(formData.get("pagamentoId") ?? "");
  const nota = String(formData.get("nota") ?? "");
  if (!nota.trim()) return { error: "Escreva o que foi feito: devolveu o dinheiro, entregou na mão..." };

  const resultado = await darBaixaNoPagamento(access.restaurant.id, pagamentoId, nota);
  if ("erro" in resultado) return { error: resultado.erro };

  await panelAudit(access, "totem.pago_sem_pedido.baixa", { pagamentoId, nota: nota.trim().slice(0, 200) });
  refresh();
  return { ok: true, message: "Baixa registrada." };
}
