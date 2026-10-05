import "server-only";

import { db } from "@/lib/db";
import { OPEN_ORDER_STATUSES } from "@/lib/labels";
import { EXCLUDE_UNPAID } from "@/lib/order-flow";

// O que está de pé no restaurante, para o admin olhar sem pedir print.
//
// Tudo isto já existia no banco; o que faltava era um lugar onde fosse
// possível olhar. Quando o dono liga dizendo "não está imprimindo", a
// resposta estava a uma consulta de distância e ninguém a fazia.
//
// A consulta e a conta do relógio vivem aqui, e não na página, porque ler a
// hora durante o desenho de um componente é impuro -- a mesma razão de
// `filaDeEspera` morar em stats.ts.

/** ligado um dia, calado desde então: é isso que vira "parou" na tela */
const HORAS_ATE_SUMIR = 24;

export async function saudeDoRestaurante(restaurantId: string) {
  const [impressoras, avisos, ultimoOk, mp, ultimoAvisoMp, restaurante, ultimaVia, naoImpressos] = await Promise.all([
    db.printDevice.findMany({
      where: { restaurantId },
      orderBy: { pairedAt: "desc" },
      select: { name: true, printerName: true, role: true, lastSeenAt: true },
    }),
    db.pushDevice.count({ where: { restaurantId } }),
    db.pushDevice.findFirst({
      where: { restaurantId, lastOkAt: { not: null } },
      orderBy: { lastOkAt: "desc" },
      select: { lastOkAt: true },
    }),
    db.mercadoPagoAccount.findUnique({ where: { restaurantId }, select: { accessToken: true } }),
    db.mpWebhookEvent.findFirst({ where: { restaurantId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.restaurant.findUnique({ where: { id: restaurantId }, select: { totemEnabled: true } }),
    // A prova de que o Menu Fácil para PC está de pé é a via ter saído no
    // papel. O aplicativo não se cadastra em lugar nenhum: ele abre o painel
    // numa janela e imprime por dentro, e quem sabe disso é o navegador do
    // balcão (window.menuFacilApp), não o servidor. Mas quando ele imprime,
    // marca o pedido -- e isso chega aqui.
    db.order.findFirst({
      where: { restaurantId, printedAt: { not: null } },
      orderBy: { printedAt: "desc" },
      select: { printedAt: true, number: true },
    }),
    // pedido aberto que entrou e não saiu no papel: é esta a fila que o
    // balcão descobre quando a cozinha pergunta "cadê a comanda?"
    db.order.count({
      where: { restaurantId, printedAt: null, status: { in: [...OPEN_ORDER_STATUSES] }, ...EXCLUDE_UNPAID },
    }),
  ]);

  const agora = Date.now();
  const sumiu = (d: Date | null) => !!d && agora - d.getTime() > HORAS_ATE_SUMIR * 60 * 60 * 1000;

  return {
    impressao: {
      ultima: ultimaVia?.printedAt ?? null,
      ultimoNumero: ultimaVia?.number ?? null,
      naoImpressos,
      sumiu: sumiu(ultimaVia?.printedAt ?? null),
    },
    impressoras: impressoras.map((i) => ({ ...i, sumiu: sumiu(i.lastSeenAt) })),
    avisos: { quantos: avisos, ultimoOk: ultimoOk?.lastOkAt ?? null, sumiu: sumiu(ultimoOk?.lastOkAt ?? null) },
    mercadoPago: mp
      ? {
          conectado: !!mp.accessToken,
          // token de teste começa com TEST-: dá para ver daqui que o
          // restaurante ligou a conta errada, antes de o primeiro Pix falhar
          producao: !!mp.accessToken && !mp.accessToken.startsWith("TEST-"),
          ultimoAviso: ultimoAvisoMp?.createdAt ?? null,
        }
      : null,
    totemLigado: restaurante?.totemEnabled ?? false,
  };
}
