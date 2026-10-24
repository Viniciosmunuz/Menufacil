"use server";

import { randomUUID } from "node:crypto";

import { refresh } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { requireRestaurantAccess, type RestaurantAccess } from "@/server/auth/dal";
import { criarOrdemPoint, ligarModoIntegrado, listarTerminais } from "@/server/mercado-pago/api";
import { desligarConta } from "@/server/pagamentos/conta";
import { criarState, enderecoDeAutorizacao } from "@/server/pagamentos/oauth";
import { panelAudit } from "@/server/panel";
import { credenciais, esquecerConta, salvarChaveDoWebhook, salvarMaquininha, salvarToken } from "@/server/totem/config";
import { desligarTotem, novoCodigoDePareamento } from "@/server/totem/dispositivos";
import { darBaixaNoPagamento, gravarPedidoDoPagamento } from "@/server/totem/pagos";

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

// ---- a maquininha, sem digitar nada ------------------------------------
//
// Buscar, escolher, pôr em modo integrado e testar: os quatro passos em
// que a instalação mais travava, agora feitos pelo painel com a conta do
// restaurante. Nenhum deles cobra o cliente de ninguém.

export type MaquininhasState = TotemState & {
  maquininhas?: { id: string; integrada: boolean; modo: string }[];
};

export async function buscarMaquininhas(_prev: MaquininhasState, formData: FormData): Promise<MaquininhasState> {
  const access = await acesso(formData);
  const contas = await credenciais(access.restaurant.id);
  if (!contas) return { error: "Conecte a conta do Mercado Pago antes de buscar as maquininhas." };

  const resposta = await listarTerminais(contas.accessToken);
  if (!resposta.ok) return { error: `O Mercado Pago não deixou listar as maquininhas: ${resposta.erro}` };
  if (resposta.dados.length === 0) {
    return { error: "Nenhuma maquininha Point ligada a esta conta. Confira se ela foi ativada com a conta do restaurante." };
  }

  return {
    ok: true,
    maquininhas: resposta.dados.map((t) => ({
      id: t.id,
      integrada: String(t.operating_mode ?? "").toUpperCase() === "PDV",
      modo: String(t.operating_mode ?? "desconhecido"),
    })),
  };
}

export async function escolherMaquininha(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const id = String(formData.get("deviceId") ?? "").trim();
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(id)) return { error: "Maquininha inválida." };

  await salvarMaquininha(access.restaurant.id, id);
  await panelAudit(access, "totem.maquininha", { preenchido: true, pelaLista: true });
  refresh();
  return { ok: true, message: "Maquininha escolhida." };
}

export async function porEmModoIntegrado(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const id = String(formData.get("deviceId") ?? "").trim();
  if (!/^[A-Za-z0-9_-]{4,80}$/.test(id)) return { error: "Maquininha inválida." };
  const contas = await credenciais(access.restaurant.id);
  if (!contas) return { error: "Conecte a conta do Mercado Pago primeiro." };

  const resposta = await ligarModoIntegrado(contas.accessToken, id);
  if (!resposta.ok) return { error: `O Mercado Pago recusou: ${resposta.erro}` };

  // já deixa escolhida: quem integra uma maquininha é para usar ela
  await salvarMaquininha(access.restaurant.id, id);
  await panelAudit(access, "totem.maquininha.integrada");
  refresh();
  return {
    ok: true,
    message: "Pronto. Agora desligue a maquininha e ligue de novo: o modo integrado só vale depois disso.",
  };
}

/**
 * Manda R$ 1,00 para a maquininha escolhida, só para ver a cobrança
 * aparecer na tela dela. Some sozinha em meio minuto; se alguém passar o
 * cartão, o real cai na própria conta do restaurante.
 */
export async function testarMaquininha(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  const contas = await credenciais(access.restaurant.id);
  if (!contas) return { error: "Conecte a conta do Mercado Pago primeiro." };
  if (!contas.deviceId) return { error: "Escolha a maquininha antes de testar." };

  const resposta = await criarOrdemPoint({
    accessToken: contas.accessToken,
    terminalId: contas.deviceId,
    amountCents: 100,
    descricao: `${access.restaurant.name} - teste do totem`,
    referencia: `teste-${randomUUID()}`,
    prazo: "PT30S",
  });
  if (!resposta.ok) return { error: `A cobrança não saiu: ${resposta.erro}` };

  await panelAudit(access, "totem.maquininha.teste");
  return {
    ok: true,
    message:
      "Cobrança de teste de R$ 1,00 enviada. Ela deve aparecer na tela da maquininha agora e some sozinha em meio minuto. Se não aparecer, confira se a maquininha foi reiniciada depois do modo integrado.",
  };
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

/**
 * Manda o dono para o Mercado Pago autorizar a conta dele -- o mesmo
 * caminho da seção Entrega, e a mesma conta no fim. A volta traz ele de
 * novo para cá.
 */
export async function conectarMercadoPagoDoTotem(formData: FormData) {
  const access = await acesso(formData);
  const state = criarState(access.restaurant.id, access.user.id, "totem");
  const endereco = state ? enderecoDeAutorizacao(state) : null;
  // sem o aplicativo do MenuFácil no servidor não há para onde mandar; a
  // tela já esconde o botão nesse caso
  if (!endereco) redirect(`/painel/${access.restaurant.id}/totem?mp=sem-aplicativo`);
  await panelAudit(access, "totem.mercado_pago.conectar");
  redirect(endereco);
}

/**
 * Desliga a conta conectada pelo botão. Só para quem não usa o 100%
 * Delivery: a conta é a mesma, e desligar daqui derrubaria o Pix da
 * entrega sem o dono estar olhando para ela. Quem tem os dois desliga na
 * aba Mercado Pago, onde o efeito na entrega está escrito.
 */
export async function desconectarContaDoTotem(_prev: TotemState, formData: FormData): Promise<TotemState> {
  const access = await acesso(formData);
  if (access.restaurant.fullDeliveryEnabled) {
    return { error: "Esta conta também recebe o Pix da entrega. Para desligar, use a aba Mercado Pago." };
  }
  await desligarConta(access.restaurant.id);
  await panelAudit(access, "totem.mercado_pago.desconectar");
  refresh();
  return { ok: true, message: "Conta do Mercado Pago desconectada." };
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
