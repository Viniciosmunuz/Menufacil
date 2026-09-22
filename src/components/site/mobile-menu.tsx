"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

import { SiteNavLinks, type NavCategory } from "./site-nav";

// Gaveta do menu no celular (o "hambúrguer" da referência). <dialog> nativo:
// fecha com o voltar do Android, com Esc e prende o foco lá dentro.
export function MobileMenu({ categories }: { categories: NavCategory[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="grid size-11 shrink-0 place-items-center rounded-control text-ink hover:bg-surface-2 lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="size-7" aria-hidden="true" />
      </button>
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && close()}
        className="m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none bg-surface p-0 text-ink backdrop:bg-black/60"
        aria-label="Menu"
      >
        <div className="flex h-full flex-col gap-6 p-4">
          <div className="flex items-center justify-between">
            <Logo />
            <button type="button" onClick={close} className="grid size-11 place-items-center rounded-control hover:bg-surface-2" aria-label="Fechar menu">
              <X className="size-6" aria-hidden="true" />
            </button>
          </div>
          <SiteNavLinks categories={categories} onNavigate={close} />
          <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
            <Link href="/cadastre-seu-restaurante" onClick={close} className={buttonClasses("primary")}>
              Cadastrar meu restaurante
            </Link>
            <Link href="/entrar" onClick={close} className={buttonClasses("ghost")}>
              Entrar no painel
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
