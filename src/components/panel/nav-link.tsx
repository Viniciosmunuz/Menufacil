"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** marca ativo só na rota exata (usado no "Início" do painel) */
  exact?: boolean;
};

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Menu do painel">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-control px-3.5 font-semibold transition-colors [&_svg]:size-5",
              active
                ? "bg-brand-soft text-brand"
                : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// No celular o menu vira uma faixa de abas que rola para o lado.
export function TabsNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      aria-label="Menu do painel"
    >
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold [&_svg]:size-4",
              active
                ? "border-brand bg-brand-soft text-brand"
                : "border-line bg-surface text-muted",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
