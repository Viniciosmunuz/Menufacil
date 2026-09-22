"use client";

import { BookOpen, Heart, Home, Info, LayoutGrid, MessageCircle, ShoppingCart, Utensils } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { cartCount, useCart } from "./cart-store";

export const SITE_LINKS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/restaurantes", label: "Restaurantes", icon: Utensils },
  { href: "/categorias", label: "Categorias", icon: LayoutGrid },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
  { href: "/sobre", label: "Sobre nós", icon: Info },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** menu do site: lateral no computador, gaveta no celular */
export function SiteNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Menu do site">
      {SITE_LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-12 items-center gap-3 rounded-control px-4 font-bold transition-colors",
              active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** barra de baixo do celular, como na referência */
export function BottomNav() {
  const pathname = usePathname();
  const cart = useCart();
  const count = cartCount(cart);
  const menuHref = cart.restaurant ? `/restaurante/${cart.restaurant.slug}` : "/restaurantes";

  const items = [
    { href: "/", label: "Início", icon: Home, active: pathname === "/" },
    { href: menuHref, label: "Cardápio", icon: BookOpen, active: pathname.startsWith("/restaurante") },
    { href: "/carrinho", label: "Carrinho", icon: ShoppingCart, active: pathname === "/carrinho", badge: count },
    { href: "/contato", label: "Contato", icon: MessageCircle, active: pathname === "/contato" },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Navegação principal"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {items.map(({ href, label, icon: Icon, active, badge }) => (
          <li key={label}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn("flex h-16 flex-col items-center justify-center gap-1 text-xs font-bold", active ? "text-brand" : "text-muted")}
            >
              <span className="relative">
                <Icon className="size-6" aria-hidden="true" />
                {badge !== undefined && (
                  <span className="absolute -top-2 -right-3 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[0.7rem] font-extrabold text-brand-ink tabular-nums">
                    {badge}
                  </span>
                )}
              </span>
              {label}
              {badge !== undefined && badge > 0 && <span className="sr-only">({badge} itens)</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
