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
  /**
   * O título do grupo a que o item pertence no menu lateral ("Menu
   * principal", "Gestão"). Itens seguidos com o mesmo grupo ficam juntos
   * sob um título só; sem grupo, o menu é uma lista corrida, como no admin.
   */
  grupo?: string;
  /**
   * O nome curto, para a barra de baixo do celular: "Visão geral" e
   * "Cardápio digital" não cabem embaixo de um ícone.
   */
  curto?: string;
};

/** junta os itens seguidos do mesmo grupo, na ordem em que aparecem */
function emGrupos(items: NavItem[]) {
  const grupos: { titulo?: string; itens: NavItem[] }[] = [];
  for (const item of items) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === item.grupo) ultimo.itens.push(item);
    else grupos.push({ titulo: item.grupo, itens: [item] });
  }
  return grupos;
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * O menu lateral. Compacto, fica só com os ícones.
 *
 * O salão pede a tela inteira: o mapa de mesas e o cardápio lado a lado
 * disputam cada centímetro, e dezessete rem de rótulos repetidos custam
 * uma coluna de mesas. Os ícones ficam, porque sair dali tem de continuar
 * sendo um toque.
 */
export function SidebarNav({ items, compacto = false }: { items: NavItem[]; compacto?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex min-h-0 flex-col overflow-y-auto [scrollbar-width:thin]" aria-label="Menu do painel">
      {emGrupos(items).map((grupo, n) => (
        <div
          key={grupo.titulo ?? n}
          // do segundo grupo em diante, uma linha fina separa um do outro
          className={cn("flex flex-col gap-1", n > 0 && "mt-4 border-t border-line pt-4")}
        >
          {/* O título do grupo ("Menu principal", "Gestão") saía escrito
              aqui. Saiu em 15/11/2026, a pedido dele: a linha entre um
              grupo e o outro já diz que são duas coisas. */}
          {grupo.itens.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={compacto ? item.label : undefined}
                className={cn(
                  "relative flex h-11 shrink-0 items-center rounded-control transition-colors duration-200 [&_svg]:size-5 [&_svg]:shrink-0",
                  compacto ? "justify-center px-0" : "gap-3 px-3.5",
                  active
                    ? // o item da tela em que se está: fundo laranja bem suave,
                      // ícone e texto no laranja, e o filete na borda esquerda
                      "bg-brand-soft font-bold text-brand before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-brand"
                    : "font-semibold text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                {item.icon}
                {compacto ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/**
 * O trilho fino do painel do restaurante: ícone em cima, nome embaixo.
 *
 * Os grupos continuam separados por uma linha curta, como no menu largo.
 * O nome usa o `curto` quando houver: nesta largura cabe pouco.
 */
export function Trilho({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="mt-3 flex w-full flex-col items-center border-t border-line pt-2" aria-label="Menu do painel">
      {emGrupos(items).map((grupo, n) => (
        <div key={grupo.titulo ?? n} className="flex w-full flex-col items-center">
          {n > 0 && <span className="my-2 w-10 border-t border-line" aria-hidden="true" />}
          {grupo.itens.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="group flex w-full flex-col items-center gap-1 py-1.5"
              >
                <span
                  className={cn(
                    "grid h-9 w-12 place-items-center rounded-full transition-colors duration-200 [&_svg]:size-5",
                    active ? "bg-brand-soft text-brand" : "text-muted group-hover:bg-surface-2 group-hover:text-ink",
                  )}
                >
                  {item.icon}
                </span>
                <span
                  className={cn(
                    "max-w-full truncate px-1 text-[0.68rem] leading-none tracking-tight",
                    active ? "font-extrabold text-brand" : "font-semibold text-muted group-hover:text-ink",
                  )}
                >
                  {item.curto ?? item.label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
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
