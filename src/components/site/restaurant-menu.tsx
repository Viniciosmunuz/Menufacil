"use client";

import { CircleCheck, PanelLeftClose, PanelLeftOpen, Plus, Search, ShoppingBag, Star, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { LogoIcon } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  acceptsAddons,
  addonProblems,
  addonsPrice,
  addonsText,
  MAX_POR_ADDON,
  type Addon,
  type AddonPick,
} from "@/lib/addons";
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
  /** este prato aceita os acompanhamentos do cardápio somados por cima */
  allowAddons?: boolean | null;
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

/**
 * Acompanhamentos do prato: arroz, feijão, farofa, purê.
 *
 * No balcão do Papaléguas o pedido é "uma lasanha e dois arroz" -- e até
 * agora isso virava duas linhas soltas no sistema, com a cozinha sem saber
 * que era a mesma pessoa. Aqui o acompanhamento entra dentro da linha do
 * prato, com quantidade de cada um.
 *
 * Por isso a linha é só nome, preço e o – 0 + : ninguém no balcão quer ler
 * descrição de arroz. Quantidade zero é o mesmo que não querer, então um
 * toque no "+" já marca e já diz quantos -- não existe marcar primeiro e
 * contar depois.
 */
function AddonPicker({ addons, picks, onChange }: { addons: Addon[]; picks: AddonPick[]; onChange: (id: string, quantity: number) => void }) {
  const quanto = (id: string) => picks.find((p) => p.productId === id)?.quantity ?? 0;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-extrabold">Acompanhamentos</span>
      <p className="-mt-1 text-sm text-muted">Quantos você quiser, somados ao prato.</p>
      <ul className="flex flex-col gap-2">
        {addons.map((a) => {
          const quantidade = quanto(a.id);
          return (
            <li
              key={a.id}
              className={cn(
                "flex items-center gap-3 rounded-control border px-4 py-2",
                !a.available && "opacity-50",
                quantidade > 0 ? "border-brand bg-brand-soft" : "border-line bg-surface-2",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block leading-tight font-bold">
                  {a.name}
                  {!a.available && <span className="ml-1 text-sm font-normal text-faint">(acabou)</span>}
                </span>
                <span className="text-sm text-muted tabular-nums">+ {formatCents(a.priceCents)}</span>
              </span>
              {a.available && (
                <QuantityStepper
                  value={quantidade}
                  onChange={(q) => onChange(a.id, q)}
                  min={0}
                  max={MAX_POR_ADDON}
                  size="sm"
                  label={a.name}
                />
              )}
            </li>
          );
        })}
      </ul>
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
/**
 * As categorias numa coluna à esquerda, com foto -- e que sai e entra.
 *
 * A faixa de abas em cima é boa no celular, onde arrastar de lado é
 * natural. Numa tela de balcão não é: a pessoa está de pé, com o braço
 * esticado, e arrastar uma faixa para procurar "Bebidas" é pior do que
 * correr os olhos por uma lista parada.
 *
 * A foto de cada categoria é a primeira foto de produto dela. Não há campo
 * de capa de categoria no cardápio, e inventar um significaria o dono subir
 * mais uma imagem para cada categoria -- trabalho para ele e mais uma coisa
 * para esquecer. Assim a capa aparece sozinha e já parece com o que a
 * pessoa vai achar lá dentro.
 */
function GavetaDeCategorias({
  aberta,
  destaques,
  categorias,
  ativa,
  aoEscolher,
}: {
  aberta: boolean;
  /** foto dos destaques; undefined quando não há destaque nenhum */
  destaques?: string | null;
  categorias: { id: string; nome: string; foto: string | null }[];
  /** null antes de a rolagem decidir qual categoria está na vez */
  ativa: string | null;
  aoEscolher: (id: string) => void;
}) {
  if (categorias.length <= 1) return null;

  const itens = [
    ...(destaques !== undefined ? [{ id: "destaques", nome: "Destaques", foto: destaques, estrela: true }] : []),
    ...categorias.map((c) => ({ ...c, estrela: false })),
  ];

  return (
    // a largura é que anima, não a posição: assim o cardápio ao lado cresce
    // junto, em vez de a gaveta passar por cima dele
    <aside
      aria-label="Categorias do cardápio"
      className={cn(
        "sticky top-0 shrink-0 self-start overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none",
        aberta ? "w-[6.5rem]" : "w-0",
      )}
    >
      <ul className="flex max-h-dvh flex-col gap-2 overflow-y-auto py-3 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {itens.map((c) => {
          const naVez = ativa === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => aoEscolher(c.id)}
                aria-current={naVez ? "true" : undefined}
                className={cn(
                  "flex w-[6rem] flex-col items-center gap-1.5 rounded-card border p-2 transition-colors",
                  naVez ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <span className="relative block aspect-square w-full overflow-hidden rounded-control bg-surface-2">
                  {c.foto ? (
                    <Image src={c.foto} alt="" width={192} height={192} className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center">
                      {c.estrela ? <Star className="size-6 fill-brand text-brand" /> : <LogoIcon className="h-6 opacity-40" />}
                    </span>
                  )}
                </span>
                <span className={cn("line-clamp-2 text-center text-xs leading-tight font-bold", naVez ? "text-brand" : "text-muted")}>
                  {c.nome}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function ProductRow({
  p,
  flavors,
  onOpen,
  empilhado = false,
}: {
  p: MenuProduct;
  flavors: PizzaFlavor[];
  onOpen: (p: MenuProduct) => void;
  /** foto em cima do texto em qualquer largura; é o cartão do totem */
  empilhado?: boolean;
}) {
  return (
    // content-visibility: o navegador não gasta desenho com o cartão que
    // está fora da tela. Num cardápio de 130 itens isso é a diferença entre
    // a rolagem lisa e a travada no celular simples. O "auto" do
    // contain-intrinsic-size faz ele lembrar a altura de verdade depois do
    // primeiro desenho, então a barra de rolagem não pula.
    <li className="flex [content-visibility:auto] [contain-intrinsic-size:auto_13rem]">
      <button
        type="button"
        onClick={() => onOpen(p)}
        aria-label={`${p.name}, ${hasPricedOptions(p.optionGroups) || flavorSlots(p) ? "a partir de " : ""}${formatCents(listPrice(p, flavors))}${p.available ? "" : ", esgotado"}`}
        className={cn(
          "group flex w-full flex-col items-stretch gap-2.5 rounded-card border border-line bg-surface p-3 text-left transition hover:border-line-strong active:scale-[0.99]",
          !empilhado && "sm:flex-row sm:gap-3",
        )}
      >
        <span className={cn("order-2 flex min-w-0 flex-1 flex-col", !empilhado && "sm:order-1", !p.available && "opacity-55")}>
          <span className="flex items-start gap-1.5 text-[0.95rem] leading-snug font-extrabold sm:text-base">
            {p.featured && <Star className="mt-0.5 size-4 shrink-0 fill-brand text-brand" aria-hidden="true" />}
            {p.name}
          </span>
          {p.description && <span className="mt-1 line-clamp-2 text-[0.78rem] leading-snug text-muted sm:text-[0.82rem]">{p.description}</span>}
          <span className="mt-auto pt-2">
            {p.available ? <Price p={p} flavors={flavors} /> : <span className="text-sm font-bold text-faint">Esgotado</span>}
          </span>
        </span>
        <span
          className={cn(
            "relative order-1 block aspect-[4/3] w-full shrink-0",
            !empilhado && "sm:order-2 sm:aspect-auto sm:size-28",
          )}
        >
          {p.imageUrl ? (
            // A foto fica num quadrado de 112px no computador e em meia
            // tela no celular, mas o arquivo guardado tem 800px de lado.
            // Pedindo o tamanho de uso, a mesma lista deixa de baixar
            // alguns megabytes num cardápio grande.
            //
            // Com medida fixa, e não "fill" com "sizes": o segundo faz o
            // Next escrever a lista inteira de larguras possíveis em cada
            // foto, e em 130 fotos isso sozinho engordou o HTML em 260 KB
            // -- a página demorava mais para chegar do que economizava em
            // imagem. Assim a lista tem duas entradas, 192 e 384.
            // Empilhado, o cartão é bem mais largo (meia tela de tablet),
            // então pede uma foto maior: com 192 a lista do totem ficaria
            // borrada em tela retina.
            <Image
              src={p.imageUrl}
              alt=""
              width={empilhado ? 384 : 192}
              height={empilhado ? 288 : 144}
              className={cn("h-full w-full rounded-control object-cover", !p.available && "grayscale")}
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
  addons = [],
  canOrder,
  closedMessage,
  carrinhoHref = "/carrinho",
  barraDoCarrinho = "bottom-[calc(4rem+env(safe-area-inset-bottom))]",
  barraSempreVisivel = false,
  duasColunas = false,
  categoriasNaLateral = false,
}: {
  restaurant: CartRestaurant;
  categories: MenuCategory[];
  /** sabores de pizza do restaurante, de todas as categorias de sabor */
  pizzaFlavors?: PizzaFlavor[];
  /**
   * Catálogo de acompanhamentos do restaurante -- os produtos das seções
   * marcadas como acompanhamento. Eles continuam à venda sozinhos na seção
   * deles; esta lista é a mesma seção servindo de opção dentro dos pratos
   * que a aceitam.
   */
  addons?: Addon[];
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
  /**
   * Mantém a barra do carrinho visível também em tela grande. No site ela
   * some a partir de "lg" porque o carrinho vira coluna da direita; no
   * totem essa coluna não existe, e num monitor grande o cliente ficava sem
   * nenhum jeito de chegar ao pedido.
   */
  barraSempreVisivel?: boolean;
  /**
   * Duas colunas em qualquer largura, com a foto em cima do texto.
   *
   * É o totem. No site a lista faz o contrário -- dois cartõezinhos no
   * celular e linha larga do tablet para cima --, e ali isso é certo: a
   * pessoa está sentada, com tempo. No balcão ela está de pé, muitas vezes
   * com gente atrás, e o que ajuda é enxergar mais item por tela sem rolar.
   */
  duasColunas?: boolean;
  /**
   * Categorias numa coluna à esquerda, com foto, em vez da faixa de abas
   * em cima -- e essa coluna abre e fecha como gaveta.
   *
   * É o totem. Numa tela de balcão a faixa horizontal obriga a arrastar
   * para encontrar categoria, e arrastar de pé, com o dedo, é pior do que
   * ler uma lista parada. Fechada, a gaveta devolve a largura inteira ao
   * cardápio.
   */
  categoriasNaLateral?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [product, setProduct] = useState<MenuProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [flavorIds, setFlavorIds] = useState<string[]>([]);
  const [addonPicks, setAddonPicks] = useState<AddonPick[]>([]);
  const [conflict, setConflict] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // a gaveta nasce aberta: no balcão as categorias são a navegação, e
  // esconder a navegação atrás de um toque é cobrar um toque a mais de
  // quem está de pé com gente atrás
  const [gavetaAberta, setGavetaAberta] = useState(true);
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
    setAddonPicks([]);
    setConflict(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  const groups = product?.optionGroups ?? [];
  const slots = product ? flavorSlots(product) : null;
  // o prato aceita acompanhamento e o restaurante tem o que oferecer
  const addonsDoPrato = product && acceptsAddons(product) ? addons : [];
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

  function mudarAddon(id: string, quantity: number) {
    const q = Math.max(0, Math.min(MAX_POR_ADDON, quantity));
    setAddonPicks((atuais) => {
      const resto = atuais.filter((p) => p.productId !== id);
      // zero sai da lista: a linha do carrinho não carrega escolha vazia
      if (q === 0) return resto;
      return atuais.some((p) => p.productId === id)
        ? atuais.map((p) => (p.productId === id ? { ...p, quantity: q } : p))
        : [...resto, { productId: id, quantity: q }];
    });
  }

  const problems = product
    ? [
        ...(slots ? pizzaProblems(pizzaFlavors, flavorIds, slots, sizeName) : []),
        ...selectionProblems(groups, selected),
        ...addonProblems(addonsDoPrato, addonPicks),
      ]
    : [];
  // pizza: vale o sabor mais caro; o resto das opcoes continua somando
  const itemPrice = product
    ? (slots ? pizzaPrice(pizzaFlavors, flavorIds, sizeName) : unitPrice(product)) +
      optionsPrice(groups, selected) +
      addonsPrice(addonsDoPrato, addonPicks)
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
        addons: addonPicks,
        optionsText:
          [
            slots ? flavorsText(pizzaFlavors, flavorIds, slots) : null,
            optionsText(groups, selected),
            addonsText(addonsDoPrato, addonPicks),
          ]
            .filter(Boolean)
            .join(" · ") || null,
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

  const miolo = (
    <>
      {/* Busca e abas de categoria, grudadas no topo ao rolar.
          
          Fundo sólido, não translúcido: o cartão de produto que desliza por
          baixo aparecia borrado atrás da busca, e o que se via era um
          cartão cortado no meio com um rastro laranja em cima -- parecia
          defeito de tela, não efeito. */}
      <div className="sticky top-0 z-20 -mx-4 mt-6 border-b border-line bg-bg px-4 pt-3 pb-3 lg:top-[4.75rem] lg:mx-0 lg:px-0">
        <div className={cn(categoriasNaLateral && "flex items-center gap-2")}>
        {categoriasNaLateral && visible.length > 1 && (
          <button
            type="button"
            onClick={() => setGavetaAberta((a) => !a)}
            aria-expanded={gavetaAberta}
            aria-label={gavetaAberta ? "Fechar as categorias" : "Abrir as categorias"}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface-2 text-muted transition-colors hover:text-ink"
          >
            {gavetaAberta ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
          </button>
        )}
        <label className="relative block w-full">
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
        </div>
        {visible.length > 1 && !categoriasNaLateral && (
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
                // Desligado, igual aos outros.
                //
                // Ele vivia laranja mesmo sem estar na vez, e os outros só
                // acendem quando a rolagem chega neles -- então, descendo
                // até Porções, dois botões ficavam laranja ao mesmo tempo,
                // com dois laranjas diferentes. Parecia defeito. A estrela
                // já basta para dizer que este é especial.
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-colors",
                  active === "destaques" ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-muted hover:text-ink",
                )}
              >
                <Star className={cn("size-3.5", active === "destaques" ? "fill-brand-ink" : "fill-brand text-brand")} aria-hidden="true" />
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
                        <Image src={p.imageUrl} alt="" width={192} height={192} className="h-full w-full object-cover" />
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
            <ul className={cn("mt-3 grid grid-cols-2 gap-3", !duasColunas && "sm:grid-cols-1 2xl:grid-cols-2")}>
              {c.products.map((p) => (
                <ProductRow key={p.id} p={p} flavors={pizzaFlavors} onOpen={open} empilhado={duasColunas} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );

  return (
    <>
      {categoriasNaLateral ? (
        <div className="flex gap-3">
          <GavetaDeCategorias
            aberta={gavetaAberta}
            destaques={featured.length > 0 ? (featured.find((p) => p.imageUrl)?.imageUrl ?? null) : undefined}
            categorias={visible.map((c) => ({
              id: `cat-${c.id}`,
              nome: c.name,
              // a capa da categoria é a primeira foto de produto dela: sem
              // inventar campo novo no cardápio, e sempre parecida com o
              // que a pessoa vai achar lá dentro
              foto: c.products.find((p) => p.imageUrl)?.imageUrl ?? null,
            }))}
            ativa={active}
            aoEscolher={jump}
          />
          <div className="min-w-0 flex-1">{miolo}</div>
        </div>
      ) : (
        miolo
      )}

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
        <div className={cn("fixed inset-x-0 z-30 px-4 pb-3", !barraSempreVisivel && "lg:hidden", barraDoCarrinho)}>
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
                  // Sem "priority": a folha nasce fechada, e a foto grande
                  // não deve disputar banda com o cardápio que está à vista.
                  //
                  // Aqui o "sizes" vale a pena, ao contrário da lista: é uma
                  // foto só, e sem ele o navegador pedia a de 1920 px (137
                  // KB) para uma folha que tem 512 px de largura.
                  <Image
                    src={product.imageUrl}
                    alt=""
                    width={640}
                    height={480}
                    sizes="(min-width: 640px) 512px, 100vw"
                    className="aspect-[4/3] w-full object-cover"
                  />
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
                {product.available && addonsDoPrato.length > 0 && (
                  <AddonPicker addons={addonsDoPrato} picks={addonPicks} onChange={mudarAddon} />
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
