import { Bike, Clock, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";

export type RestaurantCardData = {
  name: string;
  slug: string;
  logoUrl: string | null;
  coverUrl: string | null;
  city: string | null;
  state: string | null;
  categories: string[];
  open: boolean;
  ratingAverage: number | null;
  ratingCount: number;
  deliveryEnabled: boolean;
  deliveryFeeCents: number;
  deliveryTimeMin: number | null;
  deliveryTimeMax: number | null;
};

export function deliveryTimeLabel(min: number | null, max: number | null) {
  if (min && max) return `${min}–${max} min`;
  if (min || max) return `${min || max} min`;
  return null;
}

// Cartão do restaurante nas listas do site (e na prévia do painel).
export function RestaurantCard({ data, href }: { data: RestaurantCardData; href?: string }) {
  const place = [data.city, data.state].filter(Boolean).join(" - ");
  const time = deliveryTimeLabel(data.deliveryTimeMin, data.deliveryTimeMax);

  const body = (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors group-hover:border-line-strong">
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
        {data.coverUrl ? (
          <Image
            src={data.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 22rem, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_30%_20%,rgb(255_138_31/0.22),transparent_60%)]">
            <LogoIcon className="h-12 opacity-60" />
          </div>
        )}
        <span
          className={cn(
            "absolute top-3 left-3 inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold backdrop-blur",
            data.open ? "bg-success/90 text-bg" : "bg-bg/80 text-muted",
          )}
        >
          <span className={cn("size-1.5 rounded-full", data.open ? "bg-bg" : "bg-faint")} aria-hidden="true" />
          {data.open ? "Aberto agora" : "Fechado"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <span className="relative -mt-10 grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-surface bg-surface-3 shadow-lg">
            {data.logoUrl ? (
              <Image src={data.logoUrl} alt="" fill sizes="56px" className="object-cover" />
            ) : (
              <span className="text-lg font-extrabold text-brand">{data.name.charAt(0)}</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg leading-tight font-extrabold">{data.name}</h3>
            {data.categories.length > 0 && (
              <p className="truncate text-sm text-muted">{data.categories.join(" · ")}</p>
            )}
          </div>
          {data.ratingCount > 0 && data.ratingAverage ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold">
              <Star className="size-4 fill-brand text-brand" aria-hidden="true" />
              {data.ratingAverage.toFixed(1).replace(".", ",")}
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-extrabold text-brand">Novo</span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {place && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-faint" aria-hidden="true" />
              {place}
            </span>
          )}
          {time && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-faint" aria-hidden="true" />
              {time}
            </span>
          )}
          {data.deliveryEnabled && (
            <span className="flex items-center gap-1.5">
              <Bike className="size-4 text-faint" aria-hidden="true" />
              {data.deliveryFeeCents > 0 ? formatCents(data.deliveryFeeCents) : "Entrega grátis"}
            </span>
          )}
        </div>
      </div>
    </article>
  );

  return href ? (
    <Link href={href} className="group block h-full rounded-card">
      {body}
    </Link>
  ) : (
    <div className="group h-full">{body}</div>
  );
}
