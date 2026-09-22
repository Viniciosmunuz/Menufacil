"use client";

import { BookOpen, ChevronDown, Heart, Home, Info, LayoutGrid, MessageCircle, ShoppingCart, Utensils } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { CategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/cn";

import { cartCount, useCart } from "./cart-store";

export type NavCategory = { slug: string; name: string; icon: string | null };

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

const itemClasses = (active: boolean) =>
  cn(
    "flex h-12 w-full items-center gap-3 rounded-control px-4 font-bold transition-colors",
    active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
  );

/** menu do site: lateral no computador, gaveta no celular */
export function SiteNavLinks({ categories, onNavigate }: { categories: NavCategory[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Menu do site">
      {SITE_LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        if (href === "/categorias") {
          return <CategoriesDrawer key={href} categories={categories} active={active} onNavigate={onNavigate} />;
        }
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={itemClasses(active)}>
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function CategoriesDrawer({ categories, active, onNavigate }: { categories: NavCategory[]; active: boolean; onNavigate?: () => void }) {
  const [open, setOpen] = useState(active);
  const listId = useId();

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={listId} className={itemClasses(active)}>
        <LayoutGrid className="size-5" aria-hidden="true" />
        Categorias
        <ChevronDown className={cn("ml-auto size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
      </button>
      {/* grid 0fr → 1fr anima a altura sem precisar medir o conteúdo */}
      <div
        id={listId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="mt-1 mb-2 ml-[1.625rem] flex flex-col gap-0.5 border-l border-line pl-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/restaurantes?categoria=${c.slug}`}
                  onClick={onNavigate}
                  className="flex h-9 items-center gap-2.5 rounded-control px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <CategoryIcon name={c.icon} className="size-4 shrink-0 text-brand" />
                  <span className="truncate">{c.name}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/categorias"
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className="flex h-9 items-center rounded-control px-3 text-sm font-bold text-brand hover:bg-surface-2"
              >
                Ver todas
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/** barra de baixo do celular; no link de um restaurante, só leva a ele */
export function BottomNav({ store }: { store?: { slug: string; whatsapp: string | null } | null }) {
  const pathname = usePathname();
  const cart = useCart();
  const count = cartCount(cart);
  const menuHref = store ? `/restaurante/${store.slug}` : cart.restaurant ? `/restaurante/${cart.restaurant.slug}` : "/restaurantes";

  const items: { href: string; label: string; icon: typeof Home; active: boolean; badge?: number; external?: boolean }[] = store
    ? [
        { href: menuHref, label: "Cardápio", icon: BookOpen, active: pathname.startsWith("/restaurante") },
        { href: "/carrinho", label: "Carrinho", icon: ShoppingCart, active: pathname === "/carrinho", badge: count },
        ...(store.whatsapp ? [{ href: `https://wa.me/${store.whatsapp}`, label: "WhatsApp", icon: MessageCircle, active: false, external: true }] : []),
      ]
    : [
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
      <ul className="mx-auto grid max-w-lg auto-cols-fr grid-flow-col">
        {items.map(({ href, label, icon: Icon, active, badge, external }) => (
          <li key={label}>
            <Link
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
