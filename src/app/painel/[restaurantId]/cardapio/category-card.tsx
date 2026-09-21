"use client";

import { ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useActionState, type ReactNode } from "react";

import { useOpenUntilSaved } from "@/components/panel/use-open-until-saved";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { deleteMenuCategory, moveMenuCategory, saveMenuCategory, type MenuFormState } from "./actions";

type Category = { id: string; name: string; description: string | null; active: boolean; productCount: number };

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
        <Checkbox name="active" defaultChecked={category.active} label="Aparece no cardápio" hint="Desmarque para esconder a categoria inteira." />
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
  const newProductHref = `/painel/${restaurantId}/cardapio/produto/novo?categoria=${category.id}`;

  return (
    <section id={`categoria-${category.id}`} className="scroll-mt-24 overflow-hidden rounded-card border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line bg-surface-2/60 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-extrabold">
            {category.name}
            {!category.active && <Badge>Escondida</Badge>}
          </h2>
          <p className="text-sm text-faint">
            {category.productCount} produto{category.productCount === 1 ? "" : "s"}
            {category.description ? ` · ${category.description}` : ""}
          </p>
        </div>
        <form action={moveMenuCategory}>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="direction" value="up" />
          <Button type="submit" variant="ghost" size="sm" disabled={first} aria-label={`Subir a categoria ${category.name}`}>
            <ChevronUp className="size-5" aria-hidden="true" />
          </Button>
        </form>
        <form action={moveMenuCategory}>
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="direction" value="down" />
          <Button type="submit" variant="ghost" size="sm" disabled={last} aria-label={`Descer a categoria ${category.name}`}>
            <ChevronDown className="size-5" aria-hidden="true" />
          </Button>
        </form>
        {!editing && (
          <Button variant="secondary" size="sm" onClick={startEditing} aria-label={`Editar a categoria ${category.name}`}>
            <Pencil className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
        )}
      </header>

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

      <div className="px-4 py-3 sm:px-5">
        <Link href={newProductHref} className={buttonClasses("ghost", "sm", "text-brand hover:text-brand")}>
          <Plus className="size-4" aria-hidden="true" />
          Adicionar produto em {category.name}
        </Link>
      </div>
    </section>
  );
}
