"use client";

import { ArrowDown, ArrowUp, ChevronDown, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useActionState, useSyncExternalStore, type ReactNode } from "react";

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

type Category = { id: string; name: string; description: string | null; active: boolean; addons: boolean; productCount: number };

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
            label="É uma categoria de acompanhamentos"
            hint="Ex.: Arroz, feijão, farofa, purê. Continuam à venda sozinhos e passam a poder ser somados dentro de um prato."
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
  const newProductHref = `/painel/${restaurantId}/cardapio/produto/novo?categoria=${category.id}`;

  // editar a categoria só faz sentido com ela à vista
  const mostrando = aberta || editing;

  return (
    <section id={`categoria-${category.id}`} className="scroll-mt-24 overflow-hidden rounded-card border border-line bg-surface">
      <header className={cn("flex items-center gap-1 bg-surface-2/60 px-2 py-2 sm:px-3", mostrando && "border-b border-line")}>
        <h2 className="min-w-0 flex-1 text-lg font-extrabold">
          <button
            type="button"
            onClick={() => guardar(category.id, !aberta)}
            aria-expanded={aberta}
            className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left hover:bg-surface-3/60"
          >
            <ChevronDown
              className={cn("size-5 shrink-0 text-muted transition-transform duration-200", aberta && "rotate-180")}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                {category.name}
                {!category.active && <Badge>Escondida</Badge>}
              </span>
              <span className="block truncate text-sm font-normal text-faint">
                {category.productCount} produto{category.productCount === 1 ? "" : "s"}
                {category.description ? ` · ${category.description}` : ""}
              </span>
            </span>
          </button>
        </h2>
        <form action={moveMenuCategory}>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="direction" value="up" />
          <Button type="submit" variant="ghost" size="sm" disabled={first} aria-label={`Subir a categoria ${category.name}`}>
            <ArrowUp className="size-4" aria-hidden="true" />
          </Button>
        </form>
        <form action={moveMenuCategory}>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="direction" value="down" />
          <Button type="submit" variant="ghost" size="sm" disabled={last} aria-label={`Descer a categoria ${category.name}`}>
            <ArrowDown className="size-4" aria-hidden="true" />
          </Button>
        </form>
      </header>

      {!mostrando ? null : (
        <>
          {/* as ações da categoria no alto: com dez produtos, procurar o botão
              lá embaixo da lista custa uma rolagem que não precisa existir */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
            <Link href={newProductHref} className={buttonClasses("primary", "sm")}>
              <Plus className="size-4" aria-hidden="true" />
              Adicionar produto
            </Link>
            {!editing && (
              <Button variant="secondary" size="sm" onClick={startEditing}>
                <Pencil className="size-4" aria-hidden="true" />
                Editar categoria
              </Button>
            )}
          </div>

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
        </>
      )}
    </section>
  );
}
