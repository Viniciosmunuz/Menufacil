"use client";

import { Heart } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";

// Favoritos do visitante, guardados no aparelho (sem conta).
const KEY = "mf_favoritos";
const EVENT = "mf-favoritos";
const NONE: string[] = [];

let cachedRaw: string | null | undefined;
let cached: string[] = NONE;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return NONE;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, 100) : NONE;
  } catch {
    cached = NONE;
  }
  return cached;
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useFavorites() {
  return useSyncExternalStore(subscribe, read, () => NONE);
}

function toggle(slug: string) {
  const current = read();
  const next = current.includes(slug) ? current.filter((s) => s !== slug) : [slug, ...current];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}

export function FavoriteButton({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const favorites = useFavorites();
  const on = favorites.includes(slug);
  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={on}
      aria-label={on ? `Tirar ${name} dos favoritos` : `Favoritar ${name}`}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full border backdrop-blur transition-colors",
        on ? "border-brand/60 bg-brand-soft text-brand" : "border-line bg-bg/70 text-ink hover:text-brand",
        className,
      )}
    >
      <Heart className={cn("size-5", on && "fill-brand")} aria-hidden="true" />
    </button>
  );
}
