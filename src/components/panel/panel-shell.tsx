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
  menuAberto,
  larga,
  atalho,
}: {
  homeHref: string;
  /** o que está sendo gerenciado: "Administração" ou o nome do restaurante */
  context: ReactNode;
  nav: NavItem[];
  userName: string;
  banner?: ReactNode;
  children: ReactNode;
  /**
   * Um destino que não é seção: fica como ícone ao lado do Sair.
   *
   * O Menu Fácil PC é disso: ninguém "navega" até lá no dia a dia -- entra
   * uma vez para baixar o programa e parear o computador. Na lista de
   * seções ele pesava igual a Pedidos e Cardápio, que são o trabalho.
   */
  atalho?: { href: string; label: string; icon: ReactNode };
  /**
   * A tela em que o menu fica aberto, com os nomes das seções.
   *
   * É a inicial, e só ela: ali a pessoa está escolhendo para onde ir. Nas
   * outras ela já está trabalhando naquilo, e o menu de 17rem levava um
   * terço da tela do balcão -- no salão, uma coluna inteira de mesas.
   * Passando nada, o menu fica aberto em todas, como era antes.
   */
  menuAberto?: string;
  /** trecho do endereço em que o conteúdo usa a largura toda (o salão) */
  larga?: string;
}) {
  const pathname = usePathname();
  const compacto = !!menuAberto && pathname !== menuAberto;
  // o menu em ícones devolve largura para o conteúdo, mas quem usa a tela
  // inteira é só o salão: num formulário, linha de 1600px não se lê
  const larguraToda = !!larga && pathname.includes(larga);

  const atalhoButton = atalho ? (
    <Link
      href={atalho.href}
      aria-label={atalho.label}
      title={atalho.label}
      className="grid size-10 shrink-0 place-items-center rounded-control text-muted hover:bg-surface-2 hover:text-ink [&_svg]:size-4"
    >
      {atalho.icon}
    </Link>
  ) : null;

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
          <div className={cn("flex items-center gap-1", compacto && "flex-col")}>
            {logoutButton}
            {atalhoButton}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {banner}
        <header className="border-b border-line bg-surface/40 px-4 pt-4 pb-3 lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Link href={homeHref}>
              <Logo />
            </Link>
            <div className="flex items-center gap-1">
              {logoutButton}
              {atalhoButton}
            </div>
          </div>
          <div className="mb-3 truncate text-sm font-semibold text-faint">{context}</div>
          <TabsNav items={nav} />
        </header>
        <main className={cn("w-full px-4 py-6 sm:px-6", larguraToda ? "lg:px-6 lg:py-6" : "mx-auto max-w-6xl lg:px-10 lg:py-10")}>{children}</main>
      </div>
    </div>
  );
}
