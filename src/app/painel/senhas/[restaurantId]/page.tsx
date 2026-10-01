import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LogoIcon } from "@/components/brand/logo";
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
// Ela se atualiza sozinha pelo mesmo canal da aba Pedidos: no instante em
// que a cozinha marca "pronto", o número salta do lado de quem espera para
// o quadro grande.
//
// A tela conta a mesma história em três tamanhos, do mais urgente ao menos:
//
//   AGORA É A SUA VEZ   a senha da vez, enorme, sozinha
//   ÚLTIMOS PEDIDOS     as duas anteriores, para quem perdeu a chamada
//   EM PREPARO          a fila, para a pessoa se achar nela
//
// Tudo medido em vw, porque a mesma tela roda numa TV de 50 polegadas e num
// monitor de 22 -- em pixel fixo, uma das duas sempre sai errada.

export const metadata: Metadata = { title: "Senhas", robots: { index: false, follow: false } };

export default async function PainelDeSenhasPage({ params }: PageProps<"/painel/senhas/[restaurantId]">) {
  const { restaurantId } = await params;
  const { restaurant } = await requireRestaurantAccess(restaurantId);
  // a tela de senhas nasceu com o totem: sem o recurso, não existe
  if (!restaurant.totemEnabled) notFound();

  const pedidos = await senhasDoSalao(restaurant.id);
  const preparando = pedidos.filter((p) => p.status === "PREPARING");

  // o mais recente a ficar pronto é o da vez: é a chamada que o salão
  // acabou de ouvir, e é esse número que todo mundo está procurando
  const prontos = pedidos
    .filter((p) => p.status === "READY")
    .sort((a, b) => b.em.getTime() - a.em.getTime());
  const daVez = prontos[0] ?? null;

  // atrás dele, os dois anteriores: primeiro quem ficou pronto e não veio
  // buscar, depois quem já retirou. Quem chegou do banheiro e perdeu a
  // chamada se acha aqui sem ter que perguntar no balcão.
  const ultimos = [...prontos.slice(1), ...pedidos.filter((p) => p.status === "COMPLETED").sort((a, b) => b.em.getTime() - a.em.getTime())].slice(0, 2);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg p-[2.5vw] pb-[5vw]">
      <OrdersLive restaurantId={restaurant.id} />
      <AutoRefresh seconds={20} background />

      <header className="flex items-center gap-6">
        <div className="flex min-w-0 items-center gap-[1.4vw]">
          <LogoIcon className="h-[6.5vw] max-h-24" />
          <div className="min-w-0 leading-none">
            <p className="text-[3.4vw] font-extrabold tracking-tight">
              Menu<span className="text-brand">Fácil</span>
            </p>
            <p className="mt-[0.6vw] truncate text-[1.2vw] font-bold tracking-[0.35em] text-muted uppercase">
              {restaurant.name}
            </p>
          </div>
        </div>
      </header>

      <main className="mt-[2vw] grid min-h-0 flex-1 grid-cols-1 gap-[2vw] lg:grid-cols-[1.75fr_minmax(0,1fr)]">
        <DaVez senha={daVez} />

        <div className="flex min-h-0 flex-col gap-[2vw]">
          <Ultimos senhas={ultimos} />
          <EmPreparo senhas={preparando} />
        </div>
      </main>

      {/* a onda da marca fechando o rodapé, como no resto do site */}
      <svg
        viewBox="0 0 1200 90"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[3.5vw] w-full text-brand"
      >
        <path fill="currentColor" d="M0 70C220 10 420 86 640 58 860 30 1030 6 1200 34V90H0Z" />
      </svg>
    </div>
  );
}

/** o quadro grande: a senha que acabou de ser chamada */
function DaVez({ senha }: { senha: SenhaNaTela | null }) {
  const digitos = senha ? String(senha.number).padStart(3, "0").length : 3;
  // o número ocupa quase a largura do quadro; passando de três dígitos ele
  // encolhe, senão a senha #1024 sairia pela borda
  const tamanho = digitos <= 3 ? "text-[24vw]" : digitos === 4 ? "text-[18vw]" : "text-[14vw]";

  return (
    <section className="flex min-h-0 flex-col rounded-[2vw] border-[0.25vw] border-brand bg-surface/60 p-[2vw]">
      <h2 className="whitespace-nowrap text-[2.3vw] font-extrabold text-brand uppercase">Agora é a sua vez</h2>

      {senha ? (
        <div className="my-auto flex flex-col items-center">
          <span className={`${tamanho} leading-[0.82] font-extrabold tabular-nums drop-shadow-[0_0_2vw_rgb(255_138_31/0.35)]`}>
            {String(senha.number).padStart(3, "0")}
          </span>
          {/* o nome resolve quando duas senhas ficam prontas quase juntas */}
          <span className="mt-[1vw] max-w-full truncate text-[1.6vw] font-bold text-muted">{senha.customerName}</span>
        </div>
      ) : (
        <p className="my-auto text-center text-[2.2vw] font-bold text-faint">
          Nenhuma senha pronta agora.
          <br />
          <span className="text-[1.5vw] font-medium">Fique de olho: a sua aparece aqui.</span>
        </p>
      )}
    </section>
  );
}

/** as duas senhas anteriores, para quem perdeu a chamada */
function Ultimos({ senhas }: { senhas: SenhaNaTela[] }) {
  return (
    <section className="shrink-0">
      <h2 className="text-[1.4vw] font-extrabold tracking-[0.3em] text-muted uppercase">Últimos pedidos</h2>

      {senhas.length === 0 ? (
        <p className="mt-[1.2vw] text-[1.2vw] text-faint">Nenhuma senha chamada ainda.</p>
      ) : (
        <ul className="mt-[1.2vw] grid grid-cols-2 gap-[1vw]">
          {senhas.map((p) => {
            const retirado = p.status === "COMPLETED";
            return (
              <li
                key={p.id}
                className="flex min-w-0 flex-col items-center rounded-[1.2vw] border border-line bg-surface px-[0.8vw] py-[1.2vw]"
              >
                <span className="flex min-w-0 items-center gap-[0.4vw] text-[0.85vw] font-extrabold tracking-[0.1em] text-brand uppercase">
                  <LogoIcon className="h-[1.2vw] max-h-5" />
                  {retirado ? "Retirado" : "Pode retirar"}
                </span>
                <span className="mt-[0.4vw] text-[3.6vw] leading-none font-extrabold tabular-nums">
                  {String(p.number).padStart(3, "0")}
                </span>
                <span className="mt-[0.4vw] max-w-full truncate text-[1vw] text-muted">
                  {retirado ? "Obrigado!" : p.customerName}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** a fila de quem ainda espera */
function EmPreparo({ senhas }: { senhas: SenhaNaTela[] }) {
  return (
    <section className="flex min-h-0 flex-col border-t border-line pt-[1.5vw]">
      <h2 className="text-[1.4vw] font-extrabold tracking-[0.3em] text-muted uppercase">Em preparo</h2>

      {senhas.length === 0 ? (
        <p className="mt-[1.2vw] text-[1.2vw] text-faint">Nenhum pedido na fila.</p>
      ) : (
        <ul className="mt-[1.2vw] flex flex-wrap content-start gap-[0.8vw]">
          {senhas.slice(0, 9).map((p) => (
            <li
              key={p.id}
              className="rounded-[0.9vw] border border-line bg-surface-2 px-[1vw] py-[0.6vw] text-[2.1vw] leading-none font-extrabold tabular-nums text-muted"
            >
              {String(p.number).padStart(3, "0")}
            </li>
          ))}
        </ul>
      )}

      {senhas.length > 9 && <p className="mt-[1vw] text-[1.1vw] text-faint">e mais {senhas.length - 9} na fila</p>}
    </section>
  );
}
