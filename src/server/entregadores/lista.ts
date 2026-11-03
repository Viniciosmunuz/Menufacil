import "server-only";

import { db } from "@/lib/db";

// O que a tela de Entregadores mostra: quem é a equipe e em que pé está
// cada um agora.
//
// "Em entrega" não é um campo guardado: é o pedido em rota no nome dele. Um
// campo a mais seria mais um lugar para desencontrar da verdade -- bastaria
// uma falha no meio do caminho para o painel dizer que o rapaz está na rua
// enquanto o pedido já voltou.

export type EntregadorNaTela = {
  id: string;
  nome: string;
  telefone: string;
  fotoUrl: string | null;
  moto: string | null;
  corDaMoto: string | null;
  placa: string | null;
  ativo: boolean;
  disponibilidade: "DISPONIVEL" | "INDISPONIVEL" | "PAUSA";
  /** quantos pedidos ele está levando agora */
  emRota: number;
  /** entregas que ele fechou hoje */
  hoje: number;
  ultimoAcesso: Date | null;
};

export type QuadroDeEntregas = {
  entregadores: EntregadorNaTela[];
  /** pedidos de entrega que saíram e ainda não têm quem leve */
  semEntregador: number;
};

/** meia-noite de hoje no fuso do restaurante, para contar o dia */
function comecoDoDia() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

export async function quadroDeEntregas(restaurantId: string): Promise<QuadroDeEntregas> {
  const desde = comecoDoDia();

  const [linhas, semEntregador] = await Promise.all([
    db.entregador.findMany({
      where: { restaurantId },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        telefone: true,
        fotoUrl: true,
        moto: true,
        corDaMoto: true,
        placa: true,
        ativo: true,
        disponibilidade: true,
        user: { select: { lastLoginAt: true } },
        _count: { select: { pedidos: { where: { status: "OUT_FOR_DELIVERY" } } } },
        pedidos: { where: { status: "COMPLETED", updatedAt: { gte: desde } }, select: { id: true } },
      },
    }),
    db.order.count({ where: { restaurantId, type: "DELIVERY", status: "OUT_FOR_DELIVERY", entregadorId: null } }),
  ]);

  return {
    semEntregador,
    entregadores: linhas.map((e) => ({
      id: e.id,
      nome: e.nome,
      telefone: e.telefone,
      fotoUrl: e.fotoUrl,
      moto: e.moto,
      corDaMoto: e.corDaMoto,
      placa: e.placa,
      ativo: e.ativo,
      disponibilidade: e.disponibilidade,
      emRota: e._count.pedidos,
      hoje: e.pedidos.length,
      ultimoAcesso: e.user.lastLoginAt,
    })),
  };
}

/** os quatro números do topo da tela */
export function contarEntregadores(lista: EntregadorNaTela[]) {
  const ativos = lista.filter((e) => e.ativo);
  return {
    total: lista.length,
    // "disponível" é quem está ativo, se disse disponível e não está com
    // pedido na mão: é a resposta à pergunta "tem quem pegue agora?"
    disponiveis: ativos.filter((e) => e.disponibilidade === "DISPONIVEL" && e.emRota === 0).length,
    emEntrega: ativos.filter((e) => e.emRota > 0).length,
    inativos: lista.length - ativos.length,
  };
}

/** um pedido que já saiu, com quem está levando */
export type EmRota = {
  id: string;
  number: number;
  customerName: string;
  bairro: string | null;
  desde: Date;
  entregador: { id: string; nome: string } | null;
  ocorrencias: { motivo: string; descricao: string | null; quando: Date }[];
};

/**
 * O que está na rua agora.
 *
 * Inclui o pedido sem entregador de propósito: é justamente ele que o
 * balcão precisa ver, para dar a alguém na mão.
 */
export async function pedidosEmRota(restaurantId: string): Promise<EmRota[]> {
  const linhas = await db.order.findMany({
    where: { restaurantId, type: "DELIVERY", status: "OUT_FOR_DELIVERY" },
    orderBy: [{ entregadorId: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      number: true,
      customerName: true,
      deliveryNeighborhood: true,
      createdAt: true,
      atribuidoEm: true,
      entregador: { select: { id: true, nome: true } },
      ocorrencias: { orderBy: { createdAt: "desc" }, select: { motivo: true, descricao: true, createdAt: true } },
    },
  });

  return linhas.map((o) => ({
    id: o.id,
    number: o.number,
    customerName: o.customerName,
    bairro: o.deliveryNeighborhood,
    desde: o.atribuidoEm ?? o.createdAt,
    entregador: o.entregador,
    ocorrencias: o.ocorrencias.map((c) => ({ motivo: c.motivo, descricao: c.descricao, quando: c.createdAt })),
  }));
}
