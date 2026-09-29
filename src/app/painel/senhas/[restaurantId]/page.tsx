import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrdersLive } from "@/components/panel/orders-live";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { requireRestaurantAccess } from "@/server/auth/dal";
import { senhasDoSalao, type SenhaNaTela } from "@/server/totem/senhas";

// Painel de senhas: a tela do segundo monitor, virada para o salão.
//
// Fica fora de /painel/[restaurantId] de propósito, para não herdar o menu
// lateral: aqui a tela inteira é do cliente que está esperando o pedido
// dele sair. O endereço continua dentro de /painel, então o login vale do
// mesmo jeito -- é só abrir numa segunda aba e arrastar para o outro
// monitor.
//
// Ela se atualiza sozinha pelo mesmo canal da aba Pedidos: o número muda
// de coluna no instante em que a cozinha marca "pronto".

export const metadata: Metadata = { title: "Senhas", robots: { index: false, follow: false } };

export default async function PainelDeSenhasPage({ params }: PageProps<"/painel/senhas/[restaurantId]">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  // a tela de senhas nasceu com o totem: sem o recurso, não existe
  if (!restaurant.totemEnabled) notFound();

  const pedidos = await senhasDoSalao(restaurant.id);
  const preparando = pedidos.filter((p) => p.status === "PREPARING");
  const prontos = pedidos.filter((p) => p.status === "READY");

  return (
    <div className="flex min-h-dvh flex-col bg-bg p-6 lg:p-10">
      <OrdersLive restaurantId={restaurant.id} />
      <AutoRefresh seconds={20} background />

      <header className="mb-8 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-extrabold lg:text-5xl">{restaurant.name}</h1>
        <p className="text-lg font-bold text-muted lg:text-2xl">Acompanhe sua senha</p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
        <Coluna titulo="Preparando" pronto={false} pedidos={preparando} />
        <Coluna titulo="Pode retirar" pronto pedidos={prontos} />
      </div>
    </div>
  );
}

function Coluna({ titulo, pronto, pedidos }: { titulo: string; pronto: boolean; pedidos: SenhaNaTela[] }) {
  return (
    <section
      className={
        pronto
          ? "flex min-h-0 flex-col rounded-card border-2 border-success/50 bg-success/5 p-5 lg:p-8"
          : "flex min-h-0 flex-col rounded-card border border-line bg-surface p-5 lg:p-8"
      }
    >
      <h2
        className={
          pronto
            ? "mb-5 text-2xl font-extrabold text-success lg:mb-8 lg:text-4xl"
            : "mb-5 text-2xl font-extrabold text-muted lg:mb-8 lg:text-4xl"
        }
      >
        {titulo}
      </h2>

      {pedidos.length === 0 ? (
        <p className="text-xl text-faint lg:text-3xl">—</p>
      ) : (
        <ul className="flex flex-wrap content-start gap-3 lg:gap-5">
          {pedidos.map((p) => (
            <li
              key={p.id}
              className={
                pronto
                  ? "flex min-w-28 flex-col items-center rounded-card bg-success px-5 py-4 text-bg lg:min-w-40 lg:px-8 lg:py-6"
                  : "flex min-w-28 flex-col items-center rounded-card bg-surface-2 px-5 py-4 lg:min-w-40 lg:px-8 lg:py-6"
              }
            >
              <span className="text-4xl font-extrabold tabular-nums lg:text-7xl">{p.number}</span>
              {/* o nome ajuda quando duas senhas ficam prontas juntas */}
              <span
                className={
                  pronto
                    ? "mt-1 max-w-36 truncate text-sm font-bold lg:max-w-52 lg:text-lg"
                    : "mt-1 max-w-36 truncate text-sm text-muted lg:max-w-52 lg:text-lg"
                }
              >
                {p.customerName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
