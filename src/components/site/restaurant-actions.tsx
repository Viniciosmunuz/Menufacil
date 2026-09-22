"use client";

import { ArrowLeft, Check, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/cn";

const round =
  "grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-bg/60 text-ink backdrop-blur-md transition hover:bg-bg/80 active:scale-95";

/** voltar: para a página anterior do site ou para a lista de restaurantes */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        const sameSite = document.referrer.startsWith(window.location.origin);
        if (sameSite && window.history.length > 1) router.back();
        else router.push("/restaurantes");
      }}
      className={cn(round, className)}
      aria-label="Voltar"
    >
      <ArrowLeft className="size-5" aria-hidden="true" />
    </button>
  );
}

/** compartilhar o link do restaurante (menu do celular ou copiar o link) */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href.split("?")[0];
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `Olha o cardápio de ${title}!`, url });
      } catch {
        // pessoa cancelou
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copie o link:", url);
    }
  }
  return (
    <button type="button" onClick={share} className={cn(round, className)} aria-label={copied ? "Link copiado" : `Compartilhar ${title}`}>
      {copied ? <Check className="size-5 text-success" aria-hidden="true" /> : <Share2 className="size-5" aria-hidden="true" />}
    </button>
  );
}
