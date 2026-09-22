import { Clock, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

import { deliveryTimeLabel, type RestaurantCardData } from "./restaurant-card";

// Cartão compacto de "Restaurantes em destaque", no desenho da referência:
// foto com borda por dentro do cartão, nome, categorias, cidade e nota.
export function RestaurantMiniCard({ data, priority = false }: { data: RestaurantCardData; priority?: boolean }) {
  const place = [data.city, data.state].filter(Boolean).join(" - ");
  const time = deliveryTimeLabel(data.deliveryTimeMin, data.deliveryTimeMax);
  return (
    <Link
      href={`/restaurante/${data.slug}`}
      className="group flex h-full flex-col rounded-card border border-line bg-surface p-2 transition-colors hover:border-line-strong"
    >
      <span className="relative block aspect-[16/10] overflow-hidden rounded-control bg-surface-3">
        {data.coverUrl ? (
          <Image
            src={data.coverUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 16rem, (min-width: 640px) 45vw, 55vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="grid size-full place-items-center">
            <LogoIcon className="h-10 opacity-50" />
          </span>
        )}
        <span
          className={cn(
            "absolute top-2 right-2 inline-flex h-6 items-center gap-1 rounded-full px-2 text-[0.68rem] font-extrabold backdrop-blur",
            data.open ? "bg-success/90 text-bg" : "bg-bg/75 text-muted",
          )}
        >
          <span className={cn("size-1.5 rounded-full", data.open ? "bg-bg" : "bg-faint")} aria-hidden="true" />
          {data.open ? "Aberto" : "Fechado"}
        </span>
        {data.logoUrl && (
          <span className="absolute bottom-2 left-2 size-9 overflow-hidden rounded-full border-2 border-surface bg-surface shadow-md">
            <Image src={data.logoUrl} alt="" fill sizes="36px" className="object-cover" />
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-1 px-1.5 pt-2.5 pb-1">
        <span className="truncate text-[0.95rem] leading-tight font-extrabold sm:text-base">{data.name}</span>
        {data.categories.length > 0 && (
          <span className="truncate text-xs text-muted">{data.categories.slice(0, 3).join(" • ")}</span>
        )}
        {place && (
          <span className="flex items-center gap-1 truncate text-xs text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{place}</span>
          </span>
        )}
        <span className="flex items-center gap-3 text-xs text-muted">
          {data.ratingCount > 0 && data.ratingAverage ? (
            <span className="flex items-center gap-1 font-bold text-ink">
              <Star className="size-3.5 fill-brand text-brand" aria-hidden="true" />
              {data.ratingAverage.toFixed(1).replace(".", ",")}
              <span className="font-normal text-muted">({data.ratingCount})</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 font-bold text-brand">
              <Star className="size-3.5 fill-brand text-brand" aria-hidden="true" />
              Novo
            </span>
          )}
          {time && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              {time}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
