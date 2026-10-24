import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import type { NivelGarcom, OrderFlowMode, RestaurantStatus, UserRole } from "@/generated/prisma/client";
import { noAr } from "@/lib/features";
import { db } from "@/lib/db";

import { readSession } from "./session";

// ---- Camada de acesso -------------------------------------------------
// Toda página e toda server action que mexe em dado privado passa por aqui.
// O proxy só faz um redirecionamento otimista pela presença do cookie; quem
// decide de verdade são estas funções, que conferem a sessão no banco.
//
// Regras:
// - ADMIN (dono do MenuFácil) acessa todos os restaurantes, com a própria
//   conta, sem usar a senha do dono do restaurante.
// - RESTAURANT_OWNER acessa só os restaurantes ligados a ele em
//   RestaurantOwner, e não entra se o restaurante estiver bloqueado.
// - Quem não tem acesso recebe 404: nem a existência do restaurante vaza.

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session || session.user.status !== "ACTIVE") return null;
  const { id, name, email, role, mustChangePassword } = session.user;
  return { id, name, email, role, mustChangePassword };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

/** usuário que já trocou a senha provisória: o único que pode mexer em dados */
async function requireReadyUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/conta/senha");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireReadyUser();
  if (user.role !== "ADMIN") redirect("/painel");
  return user;
}

export type RestaurantAccess = {
  user: CurrentUser;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    status: RestaurantStatus;
    receiptWidth: number;
    // recursos liberados pelo admin: o painel usa para esconder e barrar
    printEnabled: boolean;
    totemEnabled: boolean;
    fullDeliveryEnabled: boolean;
    salaoEnabled: boolean;
    /// fluxo escolhido pelo dono; só vale com fullDeliveryEnabled ligado
    deliveryMode: OrderFlowMode;
  };
  /** true quando quem está no painel é o admin da plataforma */
  viaAdmin: boolean;
  /**
   * O papel desta pessoa neste restaurante.
   *
   * Todo vínculo que existia até aqui é OWNER, então nada muda para quem já
   * usa o sistema. STAFF nasce com o Salão: é o garçom, que entra pelo
   * mesmo login e vai para a tela dele, sem passar pelo painel do dono.
   */
  papel: "OWNER" | "STAFF";
  /** o nível do garçom; o dono não tem nível, porque pode tudo */
  nivel?: NivelGarcom;
  /**
   * O que esta pessoa pode fazer na mesa.
   *
   * O dono pode tudo. O garçom lança pedido e recebe pagamento sempre --
   * é o trabalho dele. O resto depende do nível: o Garçom II mexe no que
   * já aconteceu (apaga item impresso, dá desconto, troca a mesa de
   * lugar, finaliza e apaga a comanda), o Garçom não.
   *
   * A conferência é aqui, no servidor, porque esconder o botão não impede
   * ninguém de chamar a ação direto.
   */
  pode: { excluirItem: boolean; finalizarMesa: boolean; mexerNaMesa: boolean };
};

export const getRestaurantAccess = cache(
  async (restaurantId: string): Promise<RestaurantAccess | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    // O restaurante e o vínculo do dono vêm juntos, de propósito.
    //
    // Eram duas consultas em fila, e esta função roda em toda tela do
    // painel, antes de qualquer dado da página: uma ida ao banco a menos
    // aqui é uma ida a menos em cada abertura de tela. Para o admin o
    // filtro de dono não serve para nada, mas custa quase nada -- é um
    // índice -- e pagar isso é melhor do que manter dois caminhos.
    const linha = await db.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        receiptWidth: true,
        printEnabled: true,
        totemEnabled: true,
        fullDeliveryEnabled: true,
        salaoEnabled: true,
        deliveryMode: true,
        owners: { where: { userId: user.id }, select: { id: true, role: true, nivel: true }, take: 1 },
      },
    });
    if (!linha) return null;
    const { owners, ...restaurant } = linha;

    // o dono pode tudo; o garçom depende do nível, e o Garçom II faz na
    // mesa o mesmo que o dono -- é o que o nível quer dizer
    const tudo = { excluirItem: true, finalizarMesa: true, mexerNaMesa: true };
    if (user.role === "ADMIN") return { user, restaurant, viaAdmin: true, papel: "OWNER", pode: tudo };
    if (owners.length === 0 || restaurant.status === "BLOCKED") return null;

    const vinculo = owners[0];
    return {
      user,
      restaurant,
      viaAdmin: false,
      papel: vinculo.role,
      nivel: vinculo.nivel,
      pode: vinculo.role === "OWNER" || vinculo.nivel === "GARCOM_II" ? tudo : { excluirItem: false, finalizarMesa: false, mexerNaMesa: false },
    };
  },
);

export async function requireRestaurantAccess(restaurantId: string): Promise<RestaurantAccess> {
  const user = await requireReadyUser();
  const access = await getRestaurantAccess(restaurantId);
  if (!access) {
    // dono do restaurante bloqueado ve a explicação em /painel
    if (user.role === "RESTAURANT_OWNER") redirect("/painel");
    notFound();
  }
  return access;
}

/**
 * Acesso a uma tela ou ação do Salão.
 *
 * Esconder a aba no menu não impede ninguém de digitar o endereço na mão, e
 * o que se faz no salão mexe com dinheiro: desconto, pagamento, fechar
 * mesa. Todo caminho do módulo passa por aqui, e um restaurante sem o
 * recurso liberado recebe a mesma resposta de um endereço que não existe --
 * a página não está lá.
 */
export async function requireSalao(restaurantId: string): Promise<RestaurantAccess> {
  const acesso = await requireRestaurantAccess(restaurantId);
  // fora do ar vale para todos, inclusive para quem está com a coluna
  // ligada no banco: a decisão é da plataforma, não do cadastro
  if (!noAr("salaoEnabled") || !acesso.restaurant.salaoEnabled) notFound();
  return acesso;
}

/**
 * Uma tela do painel do dono.
 *
 * O garçom entra pelo mesmo login de todo mundo -- é um login só, como o
 * resto do sistema --, mas o painel do dono não é lugar dele: ali estão o
 * caixa, o cardápio e os relatórios. Em vez de um erro, ele vai para a
 * tela em que tem o que fazer.
 */
export async function requireDono(restaurantId: string): Promise<RestaurantAccess> {
  const acesso = await requireRestaurantAccess(restaurantId);
  // com o salão fora do ar a tela do garçom não existe, e mandá-lo para lá
  // seria entregar um 404 a quem acabou de acertar a senha: a conta dele
  // não tem para onde ir enquanto o recurso não voltar
  if (acesso.papel === "STAFF") {
    if (!noAr("salaoEnabled")) notFound();
    redirect(`/garcom/${restaurantId}`);
  }
  return acesso;
}
