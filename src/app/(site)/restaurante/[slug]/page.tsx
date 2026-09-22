import { createHash } from "node:crypto";

import { AtSign, Bike, ChevronDown, Clock, Eye, MapPin, ShoppingBag, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { LogoIcon } from "@/components/brand/logo";
import { deliveryTimeLabel } from "@/components/public/restaurant-card";
import { CartPanel } from "@/components/site/cart-panel";
import { FavoriteButton } from "@/components/site/favorites";
import { BackButton, ShareButton } from "@/components/site/restaurant-actions";
import { RestaurantMenu } from "@/components/site/restaurant-menu";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import { WEEKDAYS, localClock, openStatusLabel } from "@/lib/opening-hours";
import { SHARE_LOGO_SIZE, appUrl } from "@/lib/site";
import { getPublicRestaurant } from "@/server/public/restaurants";
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
  // entrou pelo link do restaurante: nada que leve aos outros (voltar, favoritos)
  const standalone = (await lockedStore())?.slug === r.slug;

  const status = openStatusLabel(r.openMode, r.openingHours);
  const place = [r.street && `${r.street}${r.number ? `, ${r.number}` : ""}`, r.neighborhood, [r.city, r.state].filter(Boolean).join(" - ")]
    .filter(Boolean)
    .join(" · ");
  const time = deliveryTimeLabel(r.deliveryTimeMin, r.deliveryTimeMax);
  const today = localClock().weekday;
  const categories = r.menuCategories.filter((c) => c.products.length > 0);
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
          {/* capa de ponta a ponta no celular */}
          <section className="-mx-4 -mt-4 lg:mx-0 lg:mt-0">
            <div className="relative h-60 overflow-hidden bg-surface-2 sm:h-72 lg:rounded-card lg:border lg:border-line">
              {r.coverUrl ? (
                <Image src={r.coverUrl} alt="" fill priority sizes="(min-width: 1024px) 60rem, 100vw" className="object-cover" />
              ) : (
                <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_70%_30%,rgb(255_138_31/0.25),transparent_60%)]">
                  <LogoIcon className="h-16 opacity-50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-bg/40" aria-hidden="true" />
              <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                {standalone ? <span /> : <BackButton />}
                <div className="flex gap-2">
                  <ShareButton title={r.name} />
                  {!standalone && <FavoriteButton slug={r.slug} name={r.name} />}
                </div>
              </div>
            </div>

            <div className="relative -mt-16 px-4 lg:px-6">
              <div className="flex items-end justify-between gap-3">
                <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-bg bg-surface-3 shadow-2xl">
                  {r.logoUrl ? (
                    <Image src={r.logoUrl} alt={`Logo de ${r.name}`} fill sizes="96px" className="object-cover" />
                  ) : (
                    <LogoIcon className="h-10" />
                  )}
                </span>
                <span
                  className={cn(
                    "mb-2 inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[0.82rem] font-extrabold",
                    open ? "bg-success/15 text-success ring-1 ring-success/30" : "bg-surface-2 text-muted ring-1 ring-line",
                  )}
                >
                  <span className={cn("size-2 rounded-full", open ? "animate-pulse bg-success" : "bg-faint")} aria-hidden="true" />
                  {open ? "Aberto" : "Fechado"}
                  {status.detail && <span className="font-bold opacity-80">· {status.detail}</span>}
                </span>
              </div>

              <h1 className="mt-3 text-[1.75rem] leading-tight font-extrabold tracking-tight sm:text-4xl">{r.name}</h1>
              {r.categories.length > 0 && <p className="mt-0.5 text-sm font-semibold text-muted">{r.categories.map((c) => c.name).join(" • ")}</p>}
              {r.description && <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink/85">{r.description}</p>}

              <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                {time && <Chip icon={Clock}>{time}</Chip>}
                {r.deliveryEnabled && (
                  <Chip icon={Bike}>{r.deliveryFeeCents > 0 ? `Entrega ${formatCents(r.deliveryFeeCents)}` : "Entrega grátis"}</Chip>
                )}
                {r.pickupEnabled && <Chip icon={ShoppingBag}>Retirada</Chip>}
                {r.minOrderCents > 0 && <Chip icon={Wallet}>Mínimo {formatCents(r.minOrderCents)}</Chip>}
              </div>

              <details className="group mt-4 rounded-card border border-line bg-surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPin className="size-4 shrink-0 text-brand" aria-hidden="true" />
                    <span className="truncate">Endereço, horários e pagamento</span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="grid gap-4 border-t border-line px-4 py-4 text-sm sm:grid-cols-2">
                  <div className="flex flex-col gap-3 text-muted">
                    {place && <p>{place}</p>}
                    <p>
                      <span className="font-bold text-ink">Pagamento:</span>{" "}
                      {[r.pixKey && "Pix", r.acceptsCard && "cartão (crédito ou débito)", r.acceptsCash && "dinheiro"]
                        .filter(Boolean)
                        .join(", ")
                        .replace(/, ([^,]*)$/, " ou $1") || "combine com o restaurante"}
                      .
                    </p>
                    {r.instagram && (
                      <a
                        href={`https://instagram.com/${r.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-fit items-center gap-2 font-bold text-ink hover:text-brand"
                      >
                        <AtSign className="size-4 text-faint" aria-hidden="true" />
                        {r.instagram}
                      </a>
                    )}
                  </div>
                  {r.openingHours.length > 0 && (
                    <table className="w-full">
                      <tbody>
                        {r.openingHours.map((h) => (
                          <tr key={h.weekday} className={cn(h.weekday === today ? "font-extrabold text-ink" : "text-muted")}>
                            <td className="py-0.5 pr-4">{WEEKDAYS[h.weekday]}</td>
                            <td className="py-0.5 text-right tabular-nums">{h.closed ? "Fechado" : `${h.opensAt} às ${h.closesAt}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </details>
            </div>
          </section>

          <div className="lg:px-6">
            {categories.length === 0 ? (
              <p className="mt-10 text-center text-muted">O cardápio ainda está sendo montado.</p>
            ) : (
              <RestaurantMenu
                restaurant={{ id: r.id, slug: r.slug, name: r.name }}
                categories={categories}
                canOrder={canOrder}
                closedMessage={closedMessage}
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
