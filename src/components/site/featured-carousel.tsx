"use client";

import { Children, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

// Carrossel de um cartão por vez (celular), deslizando com o dedo, com
// pontinhos que também servem de navegação.
export function FeaturedCarousel({ children, label }: { children: ReactNode; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const slides = Children.toArray(children);

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  function go(i: number) {
    const track = trackRef.current;
    track?.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="flex min-w-0 flex-col gap-2" role="region" aria-roledescription="carrossel" aria-label={label}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div key={i} className="w-full shrink-0 snap-start">
            {slide}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Mostrar restaurante ${i + 1} de ${slides.length}`}
              aria-current={i === index}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-brand" : "w-1.5 bg-line-strong")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
