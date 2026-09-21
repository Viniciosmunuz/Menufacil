import { ArrowLeft, AtSign, Bike, Clock, Eye, MapPin, ShoppingBag, Star, Store } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LogoIcon } from "@/components/brand/logo";
import { deliveryTimeLabel } from "@/components/public/restaurant-card";
import { CartPanel } from "@/components/site/cart-panel";
import { FavoriteButton } from "@/components/site/favorites";
import { RestaurantMenu } from "@/components/site/restaurant-menu";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import { WEEKDAYS, localClock, todayLabel } from "@/lib/opening-hours";
import { getPublicRestaurant } from "@/server/public/restaurants";

export async function generateMetadata({ params }: PageProps<"/restaurante/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicRestaurant(slug, false);
  if (!data) return { title: "Restaurante" };
  const r = data.restaurant;
  return {
    title: r.name,
    description: r.description ?? `Cardápio e pedidos de ${r.name} no MenuFácil.`,
    openGraph: { title: r.name, description: r.description ?? undefined, images: r.coverUrl ? [r.coverUrl] : undefined },
  };
}

export default async function RestaurantPage({ params, searchParams }: PageProps<"/restaurante/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await getPublicRestaurant(slug, sp.previa === "1");
  if (!data) notFound();
  const { restaurant: r, isPreview, open } = data;

  const place = [r.street && `${r.street}${r.number ? `, ${r.number}` : ""}`, r.neighborhood, [r.city, r.state].filter(Boolean).join(" - ")]
    .filter(Boolean)
    .join(" · ");
  const time = deliveryTimeLabel(r.deliveryTimeMin, r.deliveryTimeMax);
  const today = localClock().weekday;
  const nextOpen = r.openingHours.find((h) => h.weekday === today && !h.closed);

  const categories = r.menuCategories.filter((c) => c.products.length > 0);
  const canOrder = open && !isPreview;
  const closedMessage = isPreview
    ? "Prévia: o restaurante ainda não está no ar."
    : !open
      ? r.openMode === "CLOSED" || !nextOpen
        ? "O restaurante está fechado agora."
        : `O restaurante está fechado agora. Hoje abre às ${nextOpen.opensAt}.`
      : null;

  return (
    <div className="flex flex-col gap-5">
      {isPreview && (
        <div className="flex items-center gap-2 rounded-card border border-info/40 bg-info/10 px-4 py-3 text-sm font-bold text-info">
          <Eye className="size-4 shrink-0" aria-hidden="true" />
          Prévia: só quem gerencia o restaurante vê esta página enquanto ele não está no ar.
        </div>
      )}

      <Link href="/restaurantes" className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Restaurantes
      </Link>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {/* capa e identificação */}
          <section className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="relative aspect-[16/9] bg-surface-2 sm:aspect-[16/6]">
              {r.coverUrl ? (
                <Image src={r.coverUrl} alt="" fill priority sizes="(min-width: 1024px) 60rem, 100vw" className="object-cover" />
              ) : (
                <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_70%_30%,rgb(255_138_31/0.25),transparent_60%)]">
                  <LogoIcon className="h-16 opacity-50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" aria-hidden="true" />
              <FavoriteButton slug={r.slug} name={r.name} className="absolute top-3 right-3" />
            </div>
            <div className="relative flex flex-col gap-4 px-5 pb-5">
              <div className="-mt-12 flex items-end gap-4">
                <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-surface bg-surface-3 shadow-xl">
                  {r.logoUrl ? (
                    <Image src={r.logoUrl} alt="" fill sizes="96px" className="object-cover" />
                  ) : (
                    <Store className="size-9 text-brand" aria-hidden="true" />
                  )}
                </span>
                <span
                  className={cn(
                    "mb-1 inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm font-extrabold",
                    open ? "bg-success/15 text-success" : "bg-surface-3 text-muted",
                  )}
                >
                  <span className={cn("size-2 rounded-full", open ? "bg-success" : "bg-faint")} aria-hidden="true" />
                  {open ? "Aberto agora" : "Fechado"}
                </span>
              </div>
              <div>
                <h1 className="text-3xl leading-tight font-extrabold">{r.name}</h1>
                {r.categories.length > 0 && <p className="text-muted">{r.categories.map((c) => c.name).join(" · ")}</p>}
                {r.description && <p className="mt-2 max-w-2xl text-ink/90">{r.description}</p>}
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <li className="flex items-center gap-1.5 font-bold">
                  {r.ratingCount > 0 && r.ratingAverage ? (
                    <>
                      <Star className="size-4 fill-brand text-brand" aria-hidden="true" />
                      {r.ratingAverage.toFixed(1).replace(".", ",")} ({r.ratingCount} avaliações)
                    </>
                  ) : (
                    <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-extrabold text-brand">Novo no MenuFácil</span>
                  )}
                </li>
                <li className="flex items-center gap-1.5 text-muted">
                  <Clock className="size-4 text-faint" aria-hidden="true" />
                  {r.openMode === "AUTO" ? todayLabel(r.openingHours) : open ? "Aberto agora" : "Fechado agora"}
                </li>
                {r.deliveryEnabled && (
                  <li className="flex items-center gap-1.5 text-muted">
                    <Bike className="size-4 text-faint" aria-hidden="true" />
                    {time ? `${time} · ` : ""}
                    {r.deliveryFeeCents > 0 ? `entrega ${formatCents(r.deliveryFeeCents)}` : "entrega grátis"}
                  </li>
                )}
                {r.pickupEnabled && (
                  <li className="flex items-center gap-1.5 text-muted">
                    <ShoppingBag className="size-4 text-faint" aria-hidden="true" />
                    Retirada no local
                  </li>
                )}
                {r.minOrderCents > 0 && <li className="text-muted">Pedido mínimo {formatCents(r.minOrderCents)}</li>}
              </ul>
              <details className="group rounded-control border border-line bg-surface-2 px-4 py-3 text-sm">
                <summary className="cursor-pointer font-bold">Endereço e horários</summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 text-muted">
                    {place && (
                      <p className="flex gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
                        {place}
                      </p>
                    )}
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
                          <tr key={h.weekday} className={cn(h.weekday === today && "font-extrabold text-ink")}>
                            <td className="py-0.5 pr-4 text-muted">{WEEKDAYS[h.weekday]}</td>
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

          {closedMessage && !isPreview && (
            <p className="mt-5 rounded-card border border-line bg-surface-2 px-4 py-3 text-sm font-bold text-muted">
              {closedMessage} Você pode ver o cardápio à vontade.
            </p>
          )}

          {categories.length === 0 ? (
            <p className="mt-8 text-center text-muted">O cardápio ainda está sendo montado.</p>
          ) : (
            <RestaurantMenu
              restaurant={{ id: r.id, slug: r.slug, name: r.name }}
              categories={categories}
              canOrder={canOrder}
              closedMessage={closedMessage}
            />
          )}
        </div>

        <aside className="sticky top-[5.75rem] hidden lg:block">
          <CartPanel restaurantId={r.id} minOrderCents={r.minOrderCents} closed={!canOrder} />
        </aside>
      </div>
    </div>
  );
}
