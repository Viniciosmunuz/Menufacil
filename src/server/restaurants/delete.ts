import "server-only";

import { db } from "@/lib/db";
import { deleteImage } from "@/server/storage";

import { demoRestaurants } from "../../../prisma/demo-data";
import { launchRestaurants } from "../../../prisma/launch-data";

// Excluir um restaurante de vez.
//
// Desativar e bloquear tiram do site mas guardam tudo; isto aqui apaga
// mesmo, e não tem volta. O banco cuida do resto sozinho: cardápio,
// produtos, pedidos, donos ligados, integração do WhatsApp, impressoras e
// avisos saem junto (onDelete: Cascade no schema).
//
// Duas coisas sobrevivem de propósito:
// - o **histórico** (AuditLog é SetNull): fica o registro de que este
//   restaurante existiu e de quem o apagou;
// - a **conta do dono**: ela é uma pessoa, não uma peça do restaurante, e
//   pode estar ligada a outros. Só o vínculo com este some.

/**
 * Slugs que o seed recria a cada publicação (prisma/launch-data.ts e
 * demo-data.ts). Apagar um desses resolve por algumas horas: no próximo
 * deploy ele volta. O painel avisa antes, para ninguém achar que é defeito.
 */
const SEMEADOS = new Set<string>([...launchRestaurants.map((r) => r.slug), ...demoRestaurants.map((r) => r.slug)]);

export const voltaNoProximoDeploy = (slug: string) => SEMEADOS.has(slug);

export type ResumoDaExclusao = {
  id: string;
  name: string;
  slug: string;
  status: string;
  pedidos: number;
  produtos: number;
  categorias: number;
  donos: number;
  semeado: boolean;
};

/** o que vai sumir junto, para o admin ver antes de decidir */
export async function resumoDaExclusao(restaurantId: string): Promise<ResumoDaExclusao | null> {
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!restaurant) return null;

  const [pedidos, produtos, categorias, donos] = await Promise.all([
    db.order.count({ where: { restaurantId } }),
    db.product.count({ where: { restaurantId } }),
    db.menuCategory.count({ where: { restaurantId } }),
    db.restaurantOwner.count({ where: { restaurantId } }),
  ]);

  return { ...restaurant, pedidos, produtos, categorias, donos, semeado: voltaNoProximoDeploy(restaurant.slug) };
}

/** o nome digitado bate com o do restaurante? (sem frescura de maiúscula e espaço) */
export const nomeConfere = (digitado: string, nome: string) => digitado.trim().toLocaleLowerCase("pt-BR") === nome.trim().toLocaleLowerCase("pt-BR");

/**
 * Endereços das fotos que são nossas, juntados antes de a linha sumir.
 *
 * Só entra o que foi enviado pelo painel: o deleteImage ignora caminho que
 * não seja /uploads/ nem do Vercel Blob, então as fotos de demonstração que
 * moram no repositório ficam onde estão.
 */
async function fotosDoRestaurante(restaurantId: string) {
  const [restaurant, produtos] = await Promise.all([
    db.restaurant.findUnique({ where: { id: restaurantId }, select: { logoUrl: true, coverUrl: true } }),
    db.product.findMany({ where: { restaurantId, imageUrl: { not: null } }, select: { imageUrl: true } }),
  ]);
  return [restaurant?.logoUrl, restaurant?.coverUrl, ...produtos.map((p) => p.imageUrl)].filter((url): url is string => !!url);
}

class ExclusaoBarrada extends Error {}

export type ResultadoDaExclusao = { ok: true; name: string } | { ok: false; error: string };

export async function excluirRestaurante(params: {
  restaurantId: string;
  nomeDigitado: string;
  actorUserId: string;
}): Promise<ResultadoDaExclusao> {
  const resumo = await resumoDaExclusao(params.restaurantId);
  if (!resumo) return { ok: false, error: "Restaurante não encontrado." };

  // no ar não se apaga: tirar do site primeiro é a etapa que dá tempo de pensar
  if (resumo.status === "ACTIVE") {
    return { ok: false, error: "Este restaurante está no ar. Desative ou bloqueie antes de excluir." };
  }
  if (!nomeConfere(params.nomeDigitado, resumo.name)) {
    return { ok: false, error: "O nome digitado não confere com o do restaurante." };
  }

  const fotos = await fotosDoRestaurante(resumo.id);

  try {
    // registro e exclusão na mesma transação: ou fica o histórico e o
    // restaurante sai, ou nada acontece. O registro precisa ser escrito
    // antes, enquanto o vínculo ainda existe; depois ele vira nulo sozinho
    // (AuditLog é SetNull) e sobram o nome e os números nos detalhes.
    await db.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actorUserId: params.actorUserId,
          action: "restaurant.delete",
          restaurantId: resumo.id,
          details: { name: resumo.name, slug: resumo.slug, pedidos: resumo.pedidos, produtos: resumo.produtos },
        },
      });
      // o status no where de novo: se alguém publicou o restaurante enquanto
      // esta tela estava aberta, nada é apagado
      const { count } = await tx.restaurant.deleteMany({ where: { id: resumo.id, status: { not: "ACTIVE" } } });
      if (count === 0) throw new ExclusaoBarrada();
    });
  } catch (erro) {
    if (erro instanceof ExclusaoBarrada) return { ok: false, error: "O restaurante mudou enquanto você olhava. Atualize a página." };
    throw erro;
  }

  // as fotos só saem depois de o banco confirmar: arquivo apagado não volta
  await Promise.all(fotos.map((url) => deleteImage(url)));

  return { ok: true, name: resumo.name };
}
