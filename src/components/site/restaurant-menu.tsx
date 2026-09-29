"use client";

/* eslint-disable @next/next/no-img-element -- fotos já otimizadas no envio (WebP no tamanho de uso) */
import { CircleCheck, Plus, Search, ShoppingBag, Star, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { LogoIcon } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import {
  effectiveMax,
  halfAllowed,
  halfFromLabel,
  hasPricedOptions,
  optionsPrice,
  optionsText,
  selectionProblems,
  startingPrice,
  trimSelection,
  type OptionData,
  type OptionGroupData,
} from "@/lib/options";
import {
  cheapestFlavor,
  flavorPrice,
  pizzaSizes,
  flavorSlots,
  flavorsByCategory,
  flavorsText,
  pizzaPrice,
  pizzaProblems,
  type PizzaFlavor,
} from "@/lib/pizza";

import { addToCart, cartCount, cartSubtotal, useCart, type CartRestaurant } from "./cart-store";
import { QuantityStepper } from "./quantity-stepper";

export type MenuProduct = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  promoPriceCents: number | null;
  available: boolean;
  featured: boolean;
  /** pizza montada: quantos sabores o cliente escolhe */
  pizzaFlavors?: number | null;
  optionGroups: OptionGroupData[];
};

export type MenuCategory = { id: string; name: string; description: string | null; products: MenuProduct[] };

const unitPrice = (p: MenuProduct) => p.promoPriceCents ?? p.priceCents;
/** preço do cardápio: o menor possível — com opções, ou com o sabor mais barato */
const listPrice = (p: MenuProduct, flavors: PizzaFlavor[]) =>
  flavorSlots(p) ? cheapestFlavor(flavors) : startingPrice(unitPrice(p), p.optionGroups);
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function Price({ p, flavors, className }: { p: MenuProduct; flavors: PizzaFlavor[]; className?: string }) {
  const from = hasPricedOptions(p.optionGroups) || !!flavorSlots(p);
  return (
    <span className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      {from && <span className="text-[0.8em] font-semibold text-muted">a partir de</span>}
      <span className={cn("font-extrabold", !!p.promoPriceCents && "text-brand")}>{formatCents(listPrice(p, flavors))}</span>
      {!!p.promoPriceCents && !from && <s className="text-[0.8em] text-faint">{formatCents(p.priceCents)}</s>}
    </span>
  );
}

/** grupo de opções na janela do produto: escolha única vira "bolinha", múltipla vira "quadradinho" */
function OptionGroupPicker({
  group,
  groups,
  selected,
  onToggle,
}: {
  group: OptionGroupData;
  groups: OptionGroupData[];
  selected: string[];
  onToggle: (group: OptionGroupData, option: OptionData) => void;
}) {
  const max = effectiveMax(group, groups, selected);
  const half = halfAllowed(group, groups, selected);
  const halfFrom = group.halfHalf && !half ? halfFromLabel(group, groups) : null;
  const single = max === 1;
  const count = group.options.filter((o) => selected.includes(o.id)).length;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 flex w-full items-center justify-between gap-3">
        <span className="font-extrabold">{group.name}</span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-bold",
            group.minSelect > 0 && count < group.minSelect ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted",
          )}
        >
          {group.minSelect > 0 ? "Obrigatório" : "Opcional"}
          {half ? " · meio a meio: até 2" : max > 1 ? ` · até ${max}` : ""}
        </span>
      </legend>
      {half && count < 2 && <p className="-mt-1 text-sm text-muted">Quer meio a meio? Marque 2 sabores. Vale o preço do mais caro.</p>}
      {halfFrom && <p className="-mt-1 text-sm text-muted">Meio a meio a partir de {halfFrom}.</p>}
      {group.options.map((o) => {
        const checked = selected.includes(o.id);
        return (
          <label
            key={o.id}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-control border px-4 py-2.5",
              !o.available && "cursor-not-allowed opacity-50",
              checked ? "border-brand bg-brand-soft" : "border-line bg-surface-2 hover:border-line-strong",
            )}
          >
            <input
              type={single ? "radio" : "checkbox"}
              name={`opcao-${group.id}`}
              checked={checked}
              disabled={!o.available}
              onChange={() => onToggle(group, o)}
              onClick={() => single && checked && group.minSelect === 0 && onToggle(group, o)}
              className="size-4 shrink-0 accent-brand"
            />
            <span className="min-w-0 flex-1 font-semibold">
              {o.name}
              {!o.available && <span className="ml-1 text-sm font-normal text-faint">(acabou)</span>}
            </span>
            {o.priceCents > 0 && <span className="shrink-0 text-sm font-bold text-muted tabular-nums">+ {formatCents(o.priceCents)}</span>}
          </label>
        );
      })}
    </fieldset>
  );
}

/**
 * Escolha dos sabores da pizza. Os sabores vêm das categorias que o
 * restaurante marcou como catálogo (Pizzas especiais, Pizzas tradicionais),
 * e cada um mostra o que tem dentro e quanto custa — é o preço do mais caro
 * que vale para a pizza inteira.
 */
function FlavorPicker({
  flavors,
  slots,
  chosen,
  sizeName,
  onToggle,
}: {
  flavors: PizzaFlavor[];
  slots: number;
  chosen: string[];
  /** tamanho escolhido no montador; os preços mostrados são deste tamanho */
  sizeName: string | null;
  onToggle: (id: string) => void;
}) {
  const falta = slots - chosen.length;
  // com tamanhos no cardápio, o preço do sabor depende do tamanho escolhido
  const precisaTamanho = pizzaSizes(flavors).length > 0 && !sizeName;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-extrabold">{slots === 1 ? "Escolha o sabor" : `Escolha ${slots} sabores`}</span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", falta > 0 ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted")}>
          {chosen.length} de {slots}
        </span>
      </div>
      {slots > 1 && <p className="-mt-3 text-sm text-muted">Pode misturar as categorias. O preço é o do sabor mais caro — sem somar nem dividir.</p>}
      {precisaTamanho && <p className="-mt-3 text-sm font-bold text-brand">Escolha o tamanho aí em cima para ver o preço de cada sabor.</p>}

      {flavorsByCategory(flavors).map((grupo) => (
        <fieldset key={grupo.id} className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-extrabold tracking-wide text-muted uppercase">{grupo.name}</legend>
          {grupo.flavors.map((f) => {
            const checked = chosen.includes(f.id);
            const cheio = !checked && chosen.length >= slots;
            const preco = flavorPrice(f, sizeName);
            const indisponivel = precisaTamanho || !f.available || preco === null;
            return (
              <label
                key={f.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-control border px-4 py-3",
                  (indisponivel || cheio) && "cursor-not-allowed opacity-50",
                  checked ? "border-brand bg-brand-soft" : "border-line bg-surface-2 hover:border-line-strong",
                )}
              >
                <input
                  type={slots === 1 ? "radio" : "checkbox"}
                  name="sabor-da-pizza"
                  checked={checked}
                  disabled={indisponivel || cheio}
                  onChange={() => onToggle(f.id)}
                  className="mt-1 size-4 shrink-0 accent-brand"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-bold">
                      {f.name}
                      {!f.available && <span className="ml-1 text-sm font-normal text-faint">(acabou)</span>}
                      {f.available && !precisaTamanho && preco === null && (
                        <span className="ml-1 text-sm font-normal text-faint">(não sai neste tamanho)</span>
                      )}
                    </span>
                    {preco !== null && <span className="text-sm font-bold text-muted tabular-nums">{formatCents(preco)}</span>}
                  </span>
                  {f.description && <span className="mt-0.5 block text-sm leading-snug text-muted">{f.description}</span>}
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

function AddBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 place-items-center rounded-full bg-brand text-brand-ink shadow-lg shadow-black/40 ring-4 ring-surface transition group-hover:bg-brand-hover group-active:scale-90",
        className,
      )}
      aria-hidden="true"
    >
      <Plus className="size-5" strokeWidth={2.6} />
    </span>
  );
}

// No celular cabem dois por linha com a foto em cima; da largura de tablet
// para cima volta a linha larga, com a foto ao lado do texto.
function ProductRow({ p, flavors, onOpen }: { p: MenuProduct; flavors: PizzaFlavor[]; onOpen: (p: MenuProduct) => void }) {
  return (
    <li className="flex">
      <button
        type="button"
        onClick={() => onOpen(p)}
        aria-label={`${p.name}, ${hasPricedOptions(p.optionGroups) || flavorSlots(p) ? "a partir de " : ""}${formatCents(listPrice(p, flavors))}${p.available ? "" : ", esgotado"}`}
        className="group flex w-full flex-col items-stretch gap-2.5 rounded-card border border-line bg-surface p-3 text-left transition hover:border-line-strong active:scale-[0.99] sm:flex-row sm:gap-3"
      >
        <span className={cn("order-2 flex min-w-0 flex-1 flex-col sm:order-1", !p.available && "opacity-55")}>
          <span className="flex items-start gap-1.5 text-[0.95rem] leading-snug font-extrabold sm:text-base">
            {p.featured && <Star className="mt-0.5 size-4 shrink-0 fill-brand text-brand" aria-hidden="true" />}
            {p.name}
          </span>
          {p.description && <span className="mt-1 line-clamp-2 text-[0.78rem] leading-snug text-muted sm:text-[0.82rem]">{p.description}</span>}
          <span className="mt-auto pt-2">
            {p.available ? <Price p={p} flavors={flavors} /> : <span className="text-sm font-bold text-faint">Esgotado</span>}
          </span>
        </span>
        <span className="relative order-1 block aspect-[4/3] w-full shrink-0 sm:order-2 sm:aspect-auto sm:size-28">
          {p.imageUrl ? (
            <img
              src={p.imageUrl}
              alt=""
              loading="lazy"
              className={cn("size-full rounded-control object-cover", !p.available && "grayscale")}
            />
          ) : (
            <span className="grid size-full place-items-center rounded-control bg-surface-2">
              <LogoIcon className="h-8 opacity-40" />
            </span>
          )}
          {p.available ? (
            <AddBadge className="absolute right-1 bottom-1 sm:-right-1.5 sm:-bottom-1.5" />
          ) : (
            <span className="absolute inset-0 grid place-items-center rounded-control bg-bg/55 text-xs font-extrabold text-ink">Esgotado</span>
          )}
        </span>
      </button>
    </li>
  );
}

export function RestaurantMenu({
  restaurant,
  categories,
  pizzaFlavors = [],
  canOrder,
  closedMessage,
  carrinhoHref = "/carrinho",
  barraDoCarrinho = "bottom-[calc(4rem+env(safe-area-inset-bottom))]",
}: {
  restaurant: CartRestaurant;
  categories: MenuCategory[];
  /** sabores de pizza do restaurante, de todas as categorias de sabor */
  pizzaFlavors?: PizzaFlavor[];
  /** fechado ou em prévia: dá para ver, não para pedir */
  canOrder: boolean;
  closedMessage: string | null;
  /**
   * Para onde a barra do carrinho leva. O padrão é a página /carrinho do
   * site; no totem é a tela de fechar o pedido do balcão. O cardápio em si
   * é o mesmo nos dois -- é essa a ideia.
   */
  carrinhoHref?: string;
  /**
   * Onde a barra do carrinho fica no celular. O padrão deixa espaço para a
   * barra de navegação do site; no totem, que não tem essa barra, ela desce
   * até embaixo.
   */
  barraDoCarrinho?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [product, setProduct] = useState<MenuProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [flavorIds, setFlavorIds] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const cart = useCart();

  const q = normalize(query.trim());
  const visible = useMemo(
    () =>
      categories
        .map((c) => ({
          ...c,
          products: q ? c.products.filter((p) => normalize(`${p.name} ${p.description ?? ""}`).includes(q)) : c.products,
        }))
        .filter((c) => c.products.length > 0),
    [categories, q],
  );
  const featured = q ? [] : categories.flatMap((c) => c.products).filter((p) => p.featured && p.available);
  const mineInCart = cart.restaurant?.id === restaurant.id ? cart : null;
  const sectionKey = visible.map((c) => c.id).join(",");

  // aba ativa acompanha a rolagem do cardápio
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("[data-menu-section]")];
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-130px 0px -55% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [sectionKey]);

  // a aba ativa fica visível na faixa de abas
  useEffect(() => {
    const bar = tabsRef.current;
    const tab = bar?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (bar && tab) bar.scrollTo({ left: tab.offsetLeft - bar.clientWidth / 2 + tab.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function open(p: MenuProduct) {
    setProduct(p);
    setQuantity(1);
    setNotes("");
    setSelected([]);
    setFlavorIds([]);
    setConflict(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  const groups = product?.optionGroups ?? [];
  const slots = product ? flavorSlots(product) : null;
  // o tamanho vem do primeiro grupo de opções do montador (Tamanho)
  const sizeName = slots ? (groups[0]?.options.find((o) => selected.includes(o.id))?.name ?? null) : null;

  function toggleOption(group: OptionGroupData, option: OptionData) {
    setSelected((current) => {
      const inGroup = new Set(group.options.map((o) => o.id));
      const max = effectiveMax(group, groups, current);
      let next: string[];
      if (current.includes(option.id)) {
        // escolha única obrigatória: tocar na mesma não desmarca
        next = max === 1 && group.minSelect > 0 ? current : current.filter((id) => id !== option.id);
      } else if (max === 1) {
        next = [...current.filter((id) => !inGroup.has(id)), option.id];
      } else if (current.filter((id) => inGroup.has(id)).length >= max) {
        next = current;
      } else {
        next = [...current, option.id];
      }
      // trocou para um tamanho sem meio a meio: fica só o primeiro sabor
      return trimSelection(groups, next);
    });
  }

  function toggleFlavor(id: string) {
    if (!slots) return;
    setFlavorIds((atuais) => {
      if (atuais.includes(id)) return atuais.filter((f) => f !== id);
      if (slots === 1) return [id];
      return atuais.length >= slots ? atuais : [...atuais, id];
    });
  }

  const problems = product
    ? [...(slots ? pizzaProblems(pizzaFlavors, flavorIds, slots, sizeName) : []), ...selectionProblems(groups, selected)]
    : [];
  // pizza: vale o sabor mais caro; o resto das opcoes continua somando
  const itemPrice = product
    ? (slots ? pizzaPrice(pizzaFlavors, flavorIds, sizeName) : unitPrice(product)) + optionsPrice(groups, selected)
    : 0;

  function add(replace = false) {
    if (!product || problems.length > 0) return;
    const result = addToCart(
      restaurant,
      {
        productId: product.id,
        name: product.name,
        unitPriceCents: itemPrice,
        quantity,
        notes,
        imageUrl: product.imageUrl,
        optionIds: selected,
        flavorIds,
        optionsText: [slots ? flavorsText(pizzaFlavors, flavorIds, slots) : null, optionsText(groups, selected)].filter(Boolean).join(" · ") || null,
      },
      { replace },
    );
    if (result === "conflict") {
      setConflict(true);
      return;
    }
    setToast(`${quantity}x ${product.name}`);
    close();
  }

  return (
    <>
      {/* busca e abas de categoria, grudadas no topo ao rolar */}
      <div className="sticky top-0 z-20 -mx-4 mt-6 border-b border-line bg-bg/95 px-4 pt-3 pb-3 backdrop-blur lg:top-[4.75rem] lg:mx-0 lg:px-0">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no cardápio"
            aria-label="Buscar no cardápio"
            className="h-11 w-full rounded-2xl border border-line bg-surface-2 pr-4 pl-10 text-base text-ink placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
          />
        </label>
        {visible.length > 1 && (
          <nav
            ref={tabsRef}
            className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Categorias do cardápio"
          >
            {featured.length > 0 && (
              <button
                type="button"
                data-tab="destaques"
                onClick={() => jump("destaques")}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-colors",
                  active === "destaques" ? "border-brand bg-brand text-brand-ink" : "border-brand/40 bg-brand-soft text-brand",
                )}
              >
                <Star className={cn("size-3.5", active === "destaques" ? "fill-brand-ink" : "fill-brand")} aria-hidden="true" />
                Destaques
              </button>
            )}
            {visible.map((c) => {
              const id = `cat-${c.id}`;
              return (
                <button
                  key={c.id}
                  type="button"
                  data-tab={id}
                  onClick={() => jump(id)}
                  aria-current={active === id ? "true" : undefined}
                  className={cn(
                    "flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-bold transition-colors",
                    active === id ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-muted hover:text-ink",
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {closedMessage && (
        <p className="mt-4 rounded-card border border-line bg-surface-2 px-4 py-3 text-sm font-semibold text-muted">
          {closedMessage} Dá para ver o cardápio à vontade.
        </p>
      )}

      <div className="flex flex-col gap-8 pt-5">
        {featured.length > 0 && (
          <section id="destaques" data-menu-section className="scroll-mt-36 lg:scroll-mt-52">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold">
              <Star className="size-5 fill-brand text-brand" aria-hidden="true" />
              Destaques
            </h2>
            <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
              {featured.map((p) => (
                <li key={p.id} className="w-40 shrink-0 snap-start sm:w-48">
                  <button
                    type="button"
                    onClick={() => open(p)}
                    className="group flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-surface text-left transition hover:border-line-strong active:scale-[0.98]"
                  >
                    <span className="relative block aspect-square w-full bg-surface-2">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center">
                          <LogoIcon className="h-10 opacity-40" />
                        </span>
                      )}
                      {!!p.promoPriceCents && (
                        <span className="absolute top-2 left-2 rounded-full bg-brand px-2 py-0.5 text-[0.7rem] font-extrabold text-brand-ink">
                          Promoção
                        </span>
                      )}
                    </span>
                    <span className="flex flex-1 flex-col gap-1 p-3">
                      <span className="line-clamp-2 text-sm leading-snug font-extrabold">{p.name}</span>
                      <span className="mt-auto flex items-end justify-between gap-2 pt-1">
                        <Price p={p} flavors={pizzaFlavors} className="text-sm" />
                        <AddBadge className="size-8 ring-0" />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {visible.length === 0 && (
          <p className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center text-muted">
            Nada encontrado para “{query}”.
          </p>
        )}

        {visible.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} data-menu-section className="scroll-mt-36 lg:scroll-mt-52">
            <h2 className="text-xl font-extrabold">{c.name}</h2>
            {c.description && <p className="text-sm text-muted">{c.description}</p>}
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-1 2xl:grid-cols-2">
              {c.products.map((p) => (
                <ProductRow key={p.id} p={p} flavors={pizzaFlavors} onOpen={open} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* aviso rápido de item adicionado */}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 transition-all duration-300",
          "bottom-[calc(8.5rem+env(safe-area-inset-bottom))] lg:bottom-8",
          toast ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        {toast && (
          <span className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-extrabold text-bg shadow-xl">
            <CircleCheck className="size-4 text-success" aria-hidden="true" />
            {toast} no carrinho
          </span>
        )}
      </div>

      {/* barra do carrinho no celular (a coluna da direita faz esse papel no computador) */}
      {mineInCart && mineInCart.items.length > 0 && (
        <div className={cn("fixed inset-x-0 z-30 px-4 pb-3 lg:hidden", barraDoCarrinho)}>
          <Link
            href={carrinhoHref}
            className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 rounded-2xl bg-brand px-5 font-extrabold text-brand-ink shadow-xl shadow-black/50 transition active:scale-[0.98]"
          >
            <span className="flex items-center gap-2.5">
              <span className="relative">
                <ShoppingBag className="size-6" aria-hidden="true" />
                <span className="absolute -top-1.5 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-brand-ink px-1 text-[0.7rem] text-brand tabular-nums">
                  {cartCount(mineInCart)}
                </span>
              </span>
              Ver carrinho
            </span>
            <span className="tabular-nums">{formatCents(cartSubtotal(mineInCart))}</span>
          </Link>
        </div>
      )}

      <dialog
        ref={dialogRef}
        onClick={(e) => e.target === dialogRef.current && close()}
        onClose={() => setProduct(null)}
        className="mx-auto mt-auto mb-0 max-h-[94dvh] w-full max-w-lg overflow-hidden rounded-t-[1.75rem] bg-surface p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm open:animate-[sheet-up_0.28s_ease-out] sm:my-auto sm:rounded-card"
        aria-label={product?.name ?? "Produto"}
      >
        {product && (
          <div className="flex max-h-[94dvh] flex-col">
            <div className="overflow-y-auto overscroll-contain">
              <div className="relative">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="h-16" />
                )}
                <span className="absolute top-2.5 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/70 sm:hidden" aria-hidden="true" />
                <button
                  type="button"
                  onClick={close}
                  className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-bg/70 text-ink backdrop-blur"
                  aria-label="Fechar"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-col gap-4 p-5">
                <div>
                  <h3 className="text-2xl leading-tight font-extrabold">{product.name}</h3>
                  {product.description && <p className="mt-1.5 leading-relaxed text-muted">{product.description}</p>}
                  <Price p={product} flavors={pizzaFlavors} className="mt-3 text-xl" />
                </div>
                {product.available &&
                  groups.map((g) => <OptionGroupPicker key={g.id} group={g} groups={groups} selected={selected} onToggle={toggleOption} />)}
                {product.available && slots && (
                  <FlavorPicker flavors={pizzaFlavors} slots={slots} chosen={flavorIds} sizeName={sizeName} onToggle={toggleFlavor} />
                )}
                {canOrder && product.available && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">Alguma observação?</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={140}
                      rows={2}
                      placeholder="Ex.: sem cebola, ponto da carne..."
                      className="rounded-control border border-line bg-surface-2 px-4 py-3 text-base text-ink placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* ações fixas embaixo, sempre à mão do polegar */}
            <div className="border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {!canOrder || !product.available ? (
                <p className="rounded-control bg-surface-2 px-4 py-3 text-sm text-muted">
                  {!product.available ? "Este item acabou por hoje." : (closedMessage ?? "Não é possível pedir agora.")}
                </p>
              ) : conflict ? (
                <div className="flex flex-col gap-3 rounded-control border border-warning/40 bg-warning/10 p-4 text-sm">
                  <p>
                    Seu carrinho tem itens de <strong>{cart.restaurant?.name}</strong>. Cada pedido é de um restaurante só.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => add(true)}>
                      Começar um novo carrinho
                    </Button>
                    <Button size="sm" variant="ghost" onClick={close}>
                      Manter o outro
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {problems.length > 0 && <p className="text-center text-sm font-bold text-brand">{problems[0]}</p>}
                  <div className="flex items-center gap-3">
                    <QuantityStepper value={quantity} onChange={setQuantity} label={product.name} />
                    <Button size="lg" className="flex-1 justify-between rounded-2xl" onClick={() => add()} disabled={problems.length > 0}>
                      <span>Adicionar</span>
                      <span className="tabular-nums">{formatCents(itemPrice * quantity)}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
