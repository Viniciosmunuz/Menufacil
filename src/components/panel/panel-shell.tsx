"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Logo, LogoIcon } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { logout } from "@/server/auth/actions";

import { SidebarNav, TabsNav, type NavItem } from "./nav-link";

// Casca dos dois painéis (admin e restaurante): menu lateral no
// computador, cabeçalho com abas no celular.
//
// Em algumas telas o menu encolhe para só os ícones e o conteúdo perde o
// limite de largura. É o caso do salão: o mapa de mesas e o cardápio lado
// a lado disputam cada centímetro, e dezessete rem de rótulos repetidos
// custam uma coluna inteira de mesas. Quem entra ali está trabalhando
// naquilo, não navegando entre seções.
export function PanelShell({
  homeHref,
  context,
  nav,
  userName,
  banner,
  children,
  larga,
}: {
  homeHref: string;
  /** o que está sendo gerenciado: "Administração" ou o nome do restaurante */
  context: ReactNode;
  nav: NavItem[];
  userName: string;
  banner?: ReactNode;
  children: ReactNode;
  /** trecho do endereço que faz a tela usar a largura toda, com o menu em ícones */
  larga?: string;
}) {
  const pathname = usePathname();
  const compacto = !!larga && pathname.includes(larga);

  const logoutButton = (
    <form action={logout}>
      <button
        type="submit"
        className="flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sair
      </button>
    </form>
  );

  return (
    <div className={cn("min-h-dvh lg:grid", compacto ? "lg:grid-cols-[5rem_minmax(0,1fr)]" : "lg:grid-cols-[17rem_minmax(0,1fr)]")}>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/40 py-6 lg:flex",
          compacto ? "items-stretch px-3" : "px-4",
        )}
      >
        <Link href={homeHref} className={cn("mb-2", compacto ? "grid place-items-center" : "px-2")} aria-label="Início">
          {compacto ? <LogoIcon className="size-8 text-brand" /> : <Logo />}
        </Link>
        {!compacto && <div className="mb-6 px-2 text-sm font-semibold text-faint">{context}</div>}
        {compacto && <div className="mb-6" />}
        <SidebarNav items={nav} compacto={compacto} />
        <div className="mt-auto border-t border-line pt-4">
          {!compacto && <p className="truncate px-3 pb-2 text-sm text-faint">{userName}</p>}
          {logoutButton}
        </div>
      </aside>

      <div className="min-w-0">
        {banner}
        <header className="border-b border-line bg-surface/40 px-4 pt-4 pb-3 lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Link href={homeHref}>
              <Logo />
            </Link>
            {logoutButton}
          </div>
          <div className="mb-3 truncate text-sm font-semibold text-faint">{context}</div>
          <TabsNav items={nav} />
        </header>
        <main className={cn("w-full px-4 py-6 sm:px-6", compacto ? "lg:px-6 lg:py-6" : "mx-auto max-w-6xl lg:px-10 lg:py-10")}>{children}</main>
      </div>
    </div>
  );
}
