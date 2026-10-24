import { createHash } from "node:crypto";

import { Bike, Clock, Eye, ShoppingBag, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { LogoIcon } from "@/components/brand/logo";
import { deliveryTimeLabel } from "@/components/public/restaurant-card";
import { CartPanel } from "@/components/site/cart-panel";
import { FavoriteButton } from "@/components/site/favorites";
import { BackButton, ShareButton } from "@/components/site/restaurant-actions";
import { InfoDoRestaurante } from "@/components/site/info-do-restaurante";
import { RestaurantMenu } from "@/components/site/restaurant-menu";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import { soRetirada } from "@/lib/opening-hours";
import { WEEKDAYS, localClock, openStatusLabel } from "@/lib/opening-hours";
import { SHARE_LOGO_SIZE, appUrl } from "@/lib/site";
import { getPublicRestaurant, maisPedidos } from "@/server/public/restaurants";
import { lockedStore } from "@/server/public/store";

export async function generateMetadata({ params }: PageProps<"/restaurante/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicRestaurant(slug, false);
  if (!data) return { title: "Restaurante" };
  const r = data.restaurant;
  // prévia do link no WhatsApp: logo pequena ao lado e uma frase curta
  const version = r.logoUrl ? createHash("sha1").update(r.logoUrl).digest("hex").slice(0, 8) : null;
  const image = version
    ? { url: `${appUrl()}/api/restaurantes/${r.slug}/logo?v=${version}`, width: SHARE_LOGO_SIZE, height: SHARE_LOGO_SIZE }
    : { url: `${appUrl()}/apple-icon.png`, width: 180, height: 180 };
  return {
    title: r.name,
    description: r.description ?? `Cardápio e pedidos de ${r.name} no MenuFácil.`,
    openGraph: { title: r.name, description: "Veja o cardápio e faça seu pedido.", images: [image] },
    twitter: { card: "summary" },
  };
}

function Chip({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 text-[0.8rem] font-bold text-ink/90">
      <Icon className="size-4 text-brand" aria-hidden="true" />
      {children}
    </span>
  );
}

export default async function RestaurantPage({ params, searchParams }: PageProps<"/restaurante/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await getPublicRestaurant(slug, sp.previa === "1");
  if (!data) notFound();
  const { restaurant: r, isPreview, open } = data;
  // o selo "Mais pedido" dos pratos que mais saíram no mês
  const campeoes = await maisPedidos(r.id);
  // entrou pelo link do restaurante: nada que leve aos outros (voltar, favoritos)
  const standalone = (await lockedStore())?.slug === r.slug;

  const status = openStatusLabel(r.openMode, r.openingHours);
  const place = [r.street && `${r.street}${r.number ? `, ${r.number}` : ""}`, r.neighborhood, [r.city, r.state].filter(Boolean).join(" - ")]
    .filter(Boolean)
    .join(" · ");
  const time = deliveryTimeLabel(r.deliveryTimeMin, r.deliveryTimeMax);
  const today = localClock().weekday;
  // as categorias de sabores de pizza não aparecem soltas: elas são o
  // catálogo que o cliente escolhe dentro da pizza montada
  const categories = r.menuCategories.filter((c) => c.products.length > 0 && !c.pizzaFlavors);
  const pizzaFlavors = r.menuCategories
    .filter((c) => c.pizzaFlavors)
    .flatMap((c) =>
      c.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        priceCents: p.promoPriceCents ?? p.priceCents,
        available: p.available,
        // o primeiro grupo de opções do sabor é a tabela de tamanhos
        sizes: (p.optionGroups[0]?.options ?? []).map((o) => ({ name: o.name, priceCents: o.priceCents, available: o.available })),
        categoryId: c.id,
        categoryName: c.name,
      })),
    );
  // Catálogo de acompanhamentos: as seções que o restaurante marcou como
  // acompanhamento. Diferente dos sabores de pizza, elas NÃO saem do
  // cardápio -- quem quer só um arroz continua pedindo um arroz. Esta lista
  // é a mesma seção servindo de opção dentro dos pratos que a aceitam.
  const addons = r.menuCategories
    .filter((c) => c.addons)
    .flatMap((c) =>
      c.products.map((p) => ({ id: p.id, name: p.name, priceCents: p.promoPriceCents ?? p.priceCents, available: p.available })),
    );
  // entrega pausada agora: o cliente precisa saber antes de montar o
  // carrinho, não só no checkout, senão escolhe tudo contando com entrega
  const entregaPausada = soRetirada(r.pickupOnlyUntil);
  const canOrder = open && !isPreview;
  const closedMessage = isPreview
    ? "Prévia: o restaurante ainda não está no ar."
    : !open
      ? `O restaurante está fechado agora${status.detail ? ` e ${status.detail}` : ""}.`
      : null;

  return (
    <div className="flex flex-col">
      {isPreview && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-info/40 bg-info/10 px-4 py-3 text-sm font-bold text-info">
          <Eye className="size-4 shrink-0" aria-hidden="true" />
          Prévia: só quem gerencia o restaurante vê esta página enquanto ele não está no ar.
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {/* Capa de ponta a ponta no celular, baixa como a de perfil do
              LinkedIn: é moldura, não vitrine. Alta (240px), ela e o perfil
              empurravam o cardápio para fora da primeira tela, e o cliente
              tinha de rolar antes de ver um prato. */}
          <section className="-mx-4 -mt-4 lg:mx-0 lg:mt-0">
            <div className="relative h-28 overflow-hidden bg-surface-2 sm:h-40 lg:h-48 lg:rounded-card lg:border lg:border-line">
              {r.coverUrl ? (
                <Image src={r.coverUrl} alt="" fill priority sizes="(min-width: 1024px) 60rem, 100vw" className="object-cover" />
              ) : (
                <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_70%_30%,rgb(249_104_11/0.25),transparent_60%)]">
                  <LogoIcon className="h-16 opacity-50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-bg/30" aria-hidden="true" />
              <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                {standalone ? <span /> : <BackButton />}
                <div className="flex gap-2">
                  <ShareButton title={r.name} />
                  {!standalone && <FavoriteButton slug={r.slug} name={r.name} />}
                </div>
              </div>
            </div>

            <div className="relative -mt-10 px-4 lg:-mt-12 lg:px-6">
              <div className="flex items-end justify-between gap-3">
                <span className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-bg bg-surface-3 shadow-lg lg:size-24">
                  {r.logoUrl ? (
                    <Image src={r.logoUrl} alt={`Logo de ${r.name}`} fill sizes="96px" className="object-cover" />
                  ) : (
                    <LogoIcon className="h-10" />
                  )}
                </span>
                <span
                  className={cn(
                    "mb-1 inline-flex h-8 items-center gap-2 rounded-full px-3 text-[0.8rem] font-extrabold",
                    open ? "bg-success/15 text-success ring-1 ring-success/30" : "bg-surface-2 text-muted ring-1 ring-line",
                  )}
                >
                  <span className={cn("size-2 rounded-full", open ? "animate-pulse bg-success" : "bg-faint")} aria-hidden="true" />
                  {open ? "Aberto" : "Fechado"}
                  {status.detail && <span className="font-bold opacity-80">· {status.detail}</span>}
                </span>
              </div>

              <h1 className="mt-2 text-2xl leading-tight font-extrabold tracking-tight sm:text-4xl">{r.name}</h1>
              {r.categories.length > 0 && <p className="mt-0.5 text-sm font-semibold text-muted">{r.categories.map((c) => c.name).join(" • ")}</p>}
              {/* no celular, duas linhas: o texto inteiro fica no "Endereço,
                  horários e pagamento" logo abaixo */}
              {r.description && (
                <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-ink/85 sm:line-clamp-none sm:text-[0.95rem]">
                  {r.description}
                </p>
              )}

              {/* os selos de entrega e, do lado, as bolinhas de endereço e horários */}
              <InfoDoRestaurante
                selos={
                  <>
                    {time && <Chip icon={Clock}>{time}</Chip>}
                    {r.deliveryEnabled && !entregaPausada && (
                      <Chip icon={Bike}>{r.deliveryFeeCents > 0 ? `Entrega ${formatCents(r.deliveryFeeCents)}` : "Entrega grátis"}</Chip>
                    )}
                    {r.pickupEnabled && <Chip icon={ShoppingBag}>Retirada</Chip>}
                    {r.minOrderCents > 0 && <Chip icon={Wallet}>Mínimo {formatCents(r.minOrderCents)}</Chip>}
                  </>
                }
                descricao={r.description}
                endereco={place || null}
                pagamento={
                  [r.pixKey && "Pix", r.acceptsCard && "cartão (crédito ou débito)", r.acceptsCash && "dinheiro"]
                    .filter(Boolean)
                    .join(", ")
                    .replace(/, ([^,]*)$/, " ou $1") || "combine com o restaurante"
                }
                instagram={r.instagram}
                horarios={r.openingHours.map((h) => ({
                  dia: WEEKDAYS[h.weekday],
                  texto: h.closed ? "Fechado" : `${h.opensAt} às ${h.closesAt}`,
                  hoje: h.weekday === today,
                }))}
              />

              {/* junto do aberto/fechado, que é onde o cliente olha para
                  saber se dá para pedir agora */}
              {entregaPausada && open && !isPreview && (
                <p className="mt-4 rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
                  No momento só estamos aceitando pedidos para retirada no balcão.
                </p>
              )}
            </div>
          </section>

          <div className="lg:px-6">
            {categories.length === 0 ? (
              <p className="mt-10 text-center text-muted">O cardápio ainda está sendo montado.</p>
            ) : (
              <RestaurantMenu
                restaurant={{ id: r.id, slug: r.slug, name: r.name }}
                categories={categories}
                pizzaFlavors={pizzaFlavors}
                addons={addons}
                canOrder={canOrder}
                closedMessage={closedMessage}
                maisPedidos={campeoes}
                // o último pedido deste celular, de volta ao carrinho num toque
                pedirDeNovo
              />
            )}
          </div>
        </div>

        <aside className="sticky top-[5.75rem] hidden lg:block">
          <CartPanel restaurantId={r.id} minOrderCents={r.minOrderCents} closed={!canOrder} />
        </aside>
      </div>
    </div>
  );
}
