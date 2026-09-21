"use client";

import { ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { CATEGORY_ICONS, CategoryIcon } from "@/lib/category-icons";

import { deleteCategory, moveCategory, saveCategory, type CategoryFormState } from "./actions";

type Category = { id: string; name: string; slug: string; icon: string | null; active: boolean; restaurants: number };

function IconPicker({ value }: { value: string | null }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">Ícone</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_ICONS).map(([name, { icon: Icon, label }]) => (
          <label
            key={name}
            title={label}
            className="grid size-11 cursor-pointer place-items-center rounded-control border border-line bg-surface-2 text-muted hover:border-line-strong has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40"
          >
            <input type="radio" name="icon" value={name} defaultChecked={value === name} className="sr-only" />
            <Icon className="size-5" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CategoryFields({ category, state }: { category?: Category; state: CategoryFormState }) {
  const err = state.fieldErrors ?? {};
  return (
    <>
      {category && <input type="hidden" name="id" value={category.id} />}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Nome" htmlFor={`name-${category?.id ?? "new"}`} error={err.name}>
        <Input
          id={`name-${category?.id ?? "new"}`}
          name="name"
          required
          maxLength={40}
          defaultValue={state.values?.name ?? category?.name}
          placeholder="Ex.: Hambúrgueres"
          aria-invalid={!!err.name}
        />
      </Field>
      <IconPicker value={state.values?.icon ?? category?.icon ?? null} />
      {category && (
        <Checkbox name="active" defaultChecked={category.active} label="Aparece no site" hint="Desmarque para esconder sem excluir." />
      )}
    </>
  );
}

// O formulário fica aberto enquanto não houver um salvamento com sucesso
// depois do clique que o abriu.
function useOpenUntilSaved(state: CategoryFormState) {
  const [openedAt, setOpenedAt] = useState<CategoryFormState | null>(null);
  const open = openedAt !== null && (openedAt === state || !state.ok);
  return [open, () => setOpenedAt(state), () => setOpenedAt(null)] as const;
}

export function NewCategoryForm() {
  const [state, action] = useActionState<CategoryFormState, FormData>(saveCategory, {});
  const [open, show, hide] = useOpenUntilSaved(state);

  if (!open) {
    return (
      <Button onClick={show}>
        <Plus className="size-4" aria-hidden="true" />
        Nova categoria
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <form action={action} className="flex flex-col gap-5">
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

export function CategoryRow({ category, first, last }: { category: Category; first: boolean; last: boolean }) {
  const [state, action] = useActionState<CategoryFormState, FormData>(saveCategory, {});
  const [editing, startEditing, stopEditing] = useOpenUntilSaved(state);
  const [deleteState, deleteAction] = useActionState<CategoryFormState, FormData>(deleteCategory, {});

  return (
    <li className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-control bg-brand-soft text-brand">
          <CategoryIcon name={category.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-extrabold">
            {category.name}
            {!category.active && <Badge>Escondida</Badge>}
          </p>
          <p className="text-sm text-faint">
            {category.restaurants} restaurante{category.restaurants === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <form action={moveCategory}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="direction" value="up" />
            <Button type="submit" variant="ghost" size="sm" disabled={first} aria-label={`Subir ${category.name}`}>
              <ChevronUp className="size-5" aria-hidden="true" />
            </Button>
          </form>
          <form action={moveCategory}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="direction" value="down" />
            <Button type="submit" variant="ghost" size="sm" disabled={last} aria-label={`Descer ${category.name}`}>
              <ChevronDown className="size-5" aria-hidden="true" />
            </Button>
          </form>
          {!editing && (
            <Button variant="secondary" size="sm" onClick={startEditing} aria-label={`Editar ${category.name}`}>
              <Pencil className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
          <form action={action} className="flex flex-col gap-5">
            <CategoryFields category={category} state={state} />
            <div className="flex flex-wrap gap-2">
              <SubmitButton>Salvar</SubmitButton>
              <Button variant="ghost" onClick={stopEditing}>
                Cancelar
              </Button>
            </div>
          </form>
          <form action={deleteAction} className="flex flex-col gap-2">
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
    </li>
  );
}
