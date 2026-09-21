import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { logout } from "@/server/auth/actions";

import { SidebarNav, TabsNav, type NavItem } from "./nav-link";

// Casca dos dois painéis (admin e restaurante): menu lateral no
// computador, cabeçalho com abas no celular.
export function PanelShell({
  homeHref,
  context,
  nav,
  userName,
  banner,
  children,
}: {
  homeHref: string;
  /** o que está sendo gerenciado: "Administração" ou o nome do restaurante */
  context: ReactNode;
  nav: NavItem[];
  userName: string;
  banner?: ReactNode;
  children: ReactNode;
}) {
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/40 px-4 py-6 lg:flex">
        <Link href={homeHref} className="mb-2 px-2">
          <Logo />
        </Link>
        <div className="mb-6 px-2 text-sm font-semibold text-faint">{context}</div>
        <SidebarNav items={nav} />
        <div className="mt-auto border-t border-line pt-4">
          <p className="truncate px-3 pb-2 text-sm text-faint">{userName}</p>
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
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
