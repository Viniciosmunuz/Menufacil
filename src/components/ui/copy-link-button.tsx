"use client";

import { CircleCheck, Copy } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { Button } from "./button";
import { copyToClipboard } from "./copy-button";

/** copia o link e mostra o aviso "Link copiado!" subindo no pé da tela */
export function CopyLinkButton({ url, className }: { url: string; className?: string }) {
  const [shown, setShown] = useState(false);
  const timer = useRef<number>(undefined);

  async function copy() {
    await copyToClipboard(url);
    setShown(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(false), 2200);
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={copy} className={className}>
        <Copy className="size-4" aria-hidden="true" />
        Copiar link
      </Button>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 transition duration-200 lg:bottom-8",
          shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <span className="flex items-center gap-2 rounded-full bg-success px-5 py-3 font-extrabold text-bg shadow-2xl">
          <CircleCheck className="size-5" aria-hidden="true" />
          {shown ? "Link copiado!" : ""}
        </span>
      </div>
    </>
  );
}
