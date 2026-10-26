"use client";

import { ArrowDown, ArrowUp, ChevronDown, EllipsisVertical, Pencil, Plus, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { useOpenUntilSaved } from "@/components/panel/use-open-until-saved";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { SubmitButton } from "@/components/ui/submit-button";

import { deleteMenuCategory, moveMenuCategory, saveMenuCategory, type MenuFormState } from "./actions";
import { useCardapio } from "./cardapio-layout";

type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  addons: boolean;
  somenteSalao: boolean;
  productCount: number;
  esgotados: number;
};

function CategoryFields({ category, state }: { category?: Category; state: MenuFormState }) {
  const err = state.fieldErrors ?? {};
  const key = category?.id ?? "nova";
  return (
    <>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Nome da categoria" htmlFor={`cat-name-${key}`} error={err.name}>
        <Input
          id={`cat-name-${key}`}
          name="name"
          required
          maxLength={50}
          defaultValue={state.values?.name ?? category?.name}
          placeholder="Ex.: Pizzas, Bebidas, Sobremesas"
          aria-invalid={!!err.name}
        />
      </Field>
      <Field label="Descrição" htmlFor={`cat-desc-${key}`} error={err.description} hint="Opcional. Ex.: Todas com borda recheada.">
        <Input id={`cat-desc-${key}`} name="description" maxLength={200} defaultValue={state.values?.description ?? category?.description ?? ""} />
      </Field>
      {category && (
        <>
          <Checkbox name="active" defaultChecked={category.active} label="Aparece no cardápio" hint="Desmarque para esconder a categoria inteira." />
          {/* Diferente das categorias de sabores de pizza, esta continua
              aparecendo no cardápio: quem quer só um arroz pede um arroz. O
              que a marcação faz é deixar estes itens também somarem dentro
              de um prato -- e qual prato aceita isso se escolhe no próprio
              prato, em "Aceita acompanhamento". */}
          <Checkbox
            name="addons"
            defaultChecked={category.addons}
            label="Esta seção É a lista de acompanhamentos"
            hint="Marque na seção que tem o arroz, o feijão, a farofa — não na do prato que vai recebê-los. Depois, em cada prato, ligue “Aceita acompanhamento”."
          />
          {/* A seção que só o garçom lança: a taxa de embalagem, o couvert,
              o "para viagem". O cliente do link e o totem nem sabem que ela
              existe, e o preço continua sendo o do cadastro -- é produto de
              verdade, não um campo à parte. */}
          <Checkbox
            name="somenteSalao"
            defaultChecked={category.somenteSalao}
            label="Só no salão"
            hint="Esta seção some do cardápio do cliente e do totem. Serve para o que só o garçom lança na mesa: taxa de embalagem, couvert, “para viagem”."
          />
        </>
      )}
    </>
  );
}

export function NewCategoryButton({ restaurantId, highlight }: { restaurantId: string; highlight?: boolean }) {
  const [state, action] = useActionState<MenuFormState, FormData>(saveMenuCategory, {});
  const [open, show, hide] = useOpenUntilSaved(state);

  if (!open) {
    return (
      <Button variant={highlight ? "primary" : "secondary"} onClick={show}>
        <Plus className="size-4" aria-hidden="true" />
        Nova categoria
      </Button>
    );
  }
  return (
    <Card className="w-full">
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        <CategoryFields state={state} />
        <div className="flex gap-2">
          <SubmitButton>Criar categoria</SubmitButton>
          <Button variant="ghost" onClick={hide}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * Cada categoria é uma gaveta.
 *
 * Um cardápio de verdade tem oito, dez categorias e dezenas de produtos:
 * tudo aberto, achar a categoria certa vira rolagem. Fechadas, a tela
 * mostra o cardápio inteiro de relance e o dono abre só onde vai mexer.
 *
 * O que cada aparelho abriu fica guardado nele: quem volta de um produto
 * recém-salvo encontra a categoria como deixou.
 *
 * No computador a gaveta dá lugar à coluna: a categoria escolhida na lista
 * da esquerda é a que aparece, sempre aberta. Lá a largura existe, e abrir
 * e fechar seria trabalho à toa.
 */
const abertaKey = (id: string) => `mf_cardapio_${id}`;
const EVENTO = "mf-cardapio-gaveta";

const leu = (id: string) => {
  try {
    return localStorage.getItem(abertaKey(id)) === "1";
  } catch {
    return false;
  }
};

function assinar(callback: () => void) {
  window.addEventListener(EVENTO, callback);
  window.addEventListener("storage", callback); // outra aba do painel
  return () => {
    window.removeEventListener(EVENTO, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Aberta ou fechada, sem quebrar a primeira pintura: no servidor a resposta
 * é sempre "fechada", e no aparelho vale o que ficou guardado — ou o
 * endereço, quando alguém chegou por um link que aponta para esta categoria.
 */
function useAberta(id: string) {
  return useSyncExternalStore(
    assinar,
    () => leu(id) || window.location.hash === `#categoria-${id}`,
    () => false,
  );
}

function guardar(id: string, aberta: boolean) {
  try {
    localStorage.setItem(abertaKey(id), aberta ? "1" : "0");
  } catch {
    // sem armazenamento: vale só nesta visita
  }
  // fechando o que o endereço mandou abrir, o endereço sai da frente
  if (!aberta && window.location.hash === `#categoria-${id}`) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  window.dispatchEvent(new Event(EVENTO));
}

/**
 * As ações da categoria, atrás dos três pontinhos.
 *
 * Antes elas eram uma faixa de botões dentro de cada categoria aberta --
 * "Adicionar produto" e "Editar categoria" -- mais duas setas no cabeçalho.
 * Dezoito categorias, dezoito faixas: era o primeiro que se via ao abrir
 * uma seção, antes de qualquer produto.
 */
function MenuDaCategoria({
  restaurantId,
  category,
  first,
  last,
  novoHref,
  aoEditar,
}: {
  restaurantId: string;
  category: Category;
  first: boolean;
  last: boolean;
  novoHref: string;
  aoEditar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // clicar fora fecha, como em qualquer menu
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      window.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const item = "flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm font-bold transition-colors hover:bg-surface-2 disabled:opacity-40";

  return (
    <div ref={caixa} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-label={`Opções de ${category.name}`}
        className="grid size-10 place-items-center rounded-control text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <EllipsisVertical className="size-5" aria-hidden="true" />
      </button>

      {aberto && (
        <div className="absolute top-full right-0 z-30 mt-1 w-56 overflow-hidden rounded-card border border-line bg-bg py-1 shadow-[0_14px_30px_-12px_rgb(0_0_0/0.3)]">
          <Link href={novoHref} className={cn(item, "text-brand")} onClick={() => setAberto(false)}>
            <Plus className="size-4 shrink-0" aria-hidden="true" />
            Adicionar produto
          </Link>
          <button
            type="button"
            className={item}
            onClick={() => {
              setAberto(false);
              aoEditar();
            }}
          >
            <Pencil className="size-4 shrink-0" aria-hidden="true" />
            Editar categoria
          </button>

          <div className="my-1 border-t border-line" />

          <form action={moveMenuCategory}>
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="direction" value="up" />
            <button type="submit" className={item} disabled={first}>
              <ArrowUp className="size-4 shrink-0" aria-hidden="true" />
              Subir no cardápio
            </button>
          </form>
          <form action={moveMenuCategory}>
            <input type="hidden" name="restaurantId" value={restaurantId} />
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="direction" value="down" />
            <button type="submit" className={item} disabled={last}>
              <ArrowDown className="size-4 shrink-0" aria-hidden="true" />
              Descer no cardápio
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function CategoryCard({
  restaurantId,
  category,
  first,
  last,
  children,
}: {
  restaurantId: string;
  category: Category;
  first: boolean;
  last: boolean;
  children: ReactNode;
}) {
  const [state, action] = useActionState<MenuFormState, FormData>(saveMenuCategory, {});
  const [editing, startEditing, stopEditing] = useOpenUntilSaved(state);
  const [deleteState, deleteAction] = useActionState<MenuFormState, FormData>(deleteMenuCategory, {});
  const aberta = useAberta(category.id);
  const { selecionada, escolher, vazia } = useCardapio();
  const newProductHref = `/painel/${restaurantId}/cardapio/produto/novo?categoria=${category.id}`;

  // editar a categoria só faz sentido com ela à vista
  const mostrando = aberta || editing;
  const escolhida = selecionada === category.id;
  // o filtro em vigor não acha nada aqui: a categoria sai da frente
  const some = vazia(category.id);

  return (
    <section
      id={`categoria-${category.id}`}
      data-escolhida={escolhida ? "sim" : "nao"}
      className={cn(
        // sem recorte: o menu dos três pontinhos nasce dentro do cartão e,
        // com a gaveta fechada, o cartão tem a altura do cabeçalho -- um
        // overflow-hidden aqui cortava o menu rente à borda de baixo
        "scroll-mt-24 rounded-card border border-line bg-surface",
        // no computador só a categoria escolhida na coluna da esquerda fica
        some && "hidden",
        "lg:data-[escolhida=nao]:hidden",
      )}
    >
      <header className={cn("flex items-center gap-2 px-2.5 py-2.5", (mostrando || escolhida) && "border-b border-line")}>
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              guardar(category.id, !aberta);
              escolher(category.id);
            }}
            aria-expanded={aberta}
            className="flex w-full items-center gap-2.5 rounded-control px-1.5 py-1 text-left transition-colors hover:bg-surface-2"
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full",
                category.active ? "bg-brand-soft text-brand" : "bg-surface-3 text-faint",
              )}
            >
              <UtensilsCrossed className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 text-base leading-tight font-extrabold">
                {category.name}
                {!category.active && <Badge>Escondida</Badge>}
              </span>
              <span className="block truncate text-sm font-normal text-muted">
                {category.productCount} produto{category.productCount === 1 ? "" : "s"}
                {category.esgotados > 0 ? ` · ${category.esgotados} esgotado${category.esgotados === 1 ? "" : "s"}` : ""}
                {category.description ? ` · ${category.description}` : ""}
              </span>
            </span>
            {/* a seta só existe onde a gaveta existe: no computador a
                categoria escolhida está sempre aberta */}
            <ChevronDown
              className={cn("size-5 shrink-0 text-faint transition-transform duration-200 lg:hidden", aberta && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </h2>

        <MenuDaCategoria
          restaurantId={restaurantId}
          category={category}
          first={first}
          last={last}
          novoHref={newProductHref}
          aoEditar={() => {
            if (!aberta) guardar(category.id, true);
            startEditing();
          }}
        />
      </header>

      <div className={cn(!mostrando && "hidden", escolhida && "lg:block")}>
        {editing && (
          <div className="flex flex-col gap-4 border-b border-line p-4 sm:p-5">
            <form action={action} className="flex flex-col gap-5">
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <input type="hidden" name="id" value={category.id} />
              <CategoryFields category={category} state={state} />
              <div className="flex flex-wrap gap-2">
                <SubmitButton>Salvar categoria</SubmitButton>
                <Button variant="ghost" onClick={stopEditing}>
                  Cancelar
                </Button>
              </div>
            </form>
            <form action={deleteAction} className="flex flex-col gap-2">
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <input type="hidden" name="id" value={category.id} />
              {deleteState.error && <Alert tone="warning">{deleteState.error}</Alert>}
              <div>
                <ConfirmButton confirmText="Excluir de vez" size="sm">
                  Excluir categoria
                </ConfirmButton>
              </div>
            </form>
          </div>
        )}

        {children}

        {/* criar produto fica ao pé da lista também: com a categoria
            aberta, é o passo seguinte mais provável */}
        <div className="border-t border-line p-2.5">
          <Link href={newProductHref} className={buttonClasses("secondary", "sm", "w-full sm:w-auto")}>
            <Plus className="size-4" aria-hidden="true" />
            Adicionar em {category.name}
          </Link>
        </div>
      </div>
    </section>
  );
}
