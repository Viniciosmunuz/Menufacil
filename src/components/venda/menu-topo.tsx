"use client";

import { LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { SECOES } from "./conteudo";

// O menu do topo da página de venda.
//
// No computador os links ficam à vista, no meio da barra. No celular eles
// não cabem: tentando caber, o nome da marca era cortado no meio
// ("MenuFá...") e o "Entrar" encostava no botão laranja. Então ali eles
// moram atrás do hambúrguer, e na barra fica só o que importa -- a marca e
// o botão que leva ao formulário.

export type LinkDoMenu = { href: string; label: string };

export function MenuDoTopo({ links }: { links: LinkDoMenu[] }) {
  const [aberto, setAberto] = useState(false);

  // com o menu aberto a página atrás não rola
  useEffect(() => {
    if (!aberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [aberto]);

  // Escape fecha, como em qualquer camada
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  return (
    <>
      {/* computador: os links na barra */}
      <nav aria-label="Seções da página" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
        {links.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className="rounded-control px-3 py-2 text-sm font-bold text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Link href="/entrar" className="hidden items-center gap-1.5 px-2 text-sm font-bold text-muted hover:text-ink lg:flex">
          <LogIn className="size-4" aria-hidden="true" />
          Entrar
        </Link>

        <a href={`#${SECOES.comece}`} className={buttonClasses("primary", "sm", "shrink-0")}>
          Quero conhecer
        </a>

        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir o menu"
          aria-expanded={aberto}
          className="grid size-11 shrink-0 place-items-center rounded-control text-ink transition-colors hover:bg-surface lg:hidden"
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
      </div>

      {/* celular: a camada com os links */}
      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar o menu"
            onClick={() => setAberto(false)}
            className="absolute inset-0 bg-ink/50"
          />
          <div className="absolute inset-x-0 top-0 flex max-h-dvh flex-col overflow-y-auto rounded-b-card bg-bg pb-5 shadow-[0_20px_40px_-12px_rgb(0_0_0/0.35)]">
            <div className="flex h-16 items-center justify-between px-4">
              <span className="text-lg font-extrabold tracking-tight">
                Menu<span className="text-brand">Fácil</span>
              </span>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar o menu"
                className="grid size-11 place-items-center rounded-control text-ink transition-colors hover:bg-surface"
              >
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Seções da página" className="flex flex-col px-2">
              {links.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setAberto(false)}
                  className="flex min-h-13 items-center rounded-control px-3 font-bold transition-colors hover:bg-surface"
                >
                  {label}
                </a>
              ))}
            </nav>

            <div className="mt-2 border-t border-line px-4 pt-4">
              <Link
                href="/entrar"
                onClick={() => setAberto(false)}
                className={buttonClasses("secondary", "lg", "w-full")}
              >
                <LogIn className="size-5" aria-hidden="true" />
                Entrar no painel
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
