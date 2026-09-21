"use client";

import Link from "next/link";
import { Fragment, useActionState } from "react";

import { ImageField } from "@/components/panel/image-field";
import { SectionTitle } from "@/components/panel/page-header";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { MoneyInput, centsToInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";

import { deleteProduct, saveProduct, type MenuFormState } from "../actions";

export type ProductFormData = {
  id?: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number | null;
  promoPriceCents: number | null;
  available: boolean;
  featured: boolean;
};

export function ProductForm({
  restaurantId,
  product,
  categories,
}: {
  restaurantId: string;
  product: ProductFormData;
  categories: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<MenuFormState, FormData>(saveProduct, {});
  const [deleteState, deleteAction] = useActionState<MenuFormState, FormData>(deleteProduct, {});
  const v = state.values;
  const err = state.fieldErrors ?? {};
  const pick = (key: string, saved: string) => (v && key in v ? v[key] : saved);
  const backHref = `/painel/${restaurantId}/cardapio#categoria-${product.categoryId}`;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <form action={action} className="flex flex-col gap-6">
        <input type="hidden" name="restaurantId" value={restaurantId} />
        {product.id && <input type="hidden" name="id" value={product.id} />}
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {state.fieldErrors && !state.error && <Alert tone="danger">Confira os campos marcados em vermelho.</Alert>}

        {/* recria os campos a cada resposta: o reset do formulário volta ao valor digitado */}
        <Fragment key={JSON.stringify(v ?? null)}>
        <Card className="flex flex-col gap-5">
          <Field label="Nome do produto" htmlFor="name" error={err.name}>
            <Input id="name" name="name" required maxLength={80} defaultValue={pick("name", product.name)} placeholder="Ex.: Pizza Calabresa" aria-invalid={!!err.name} />
          </Field>
          <Field label="Categoria" htmlFor="categoryId" error={err.categoryId}>
            <Select id="categoryId" name="categoryId" required defaultValue={pick("categoryId", product.categoryId)} aria-invalid={!!err.categoryId}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descrição" htmlFor="description" error={err.description} hint="Opcional. O que vem, tamanho, se serve quantas pessoas.">
            <Textarea id="description" name="description" maxLength={400} rows={3} defaultValue={pick("description", product.description ?? "")} placeholder="Ex.: Molho de tomate, muçarela, calabresa e cebola. 8 fatias." />
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Preço" htmlFor="price" error={err.price}>
              <MoneyInput id="price" name="price" required defaultValue={pick("price", centsToInput(product.priceCents))} aria-invalid={!!err.price} />
            </Field>
            <Field
              label="Preço promocional"
              htmlFor="promoPrice"
              error={err.promoPrice}
              hint="Opcional. O preço normal aparece riscado ao lado."
            >
              <MoneyInput id="promoPrice" name="promoPrice" defaultValue={pick("promoPrice", centsToInput(product.promoPriceCents))} aria-invalid={!!err.promoPrice} />
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <SectionTitle>Foto</SectionTitle>
          <ImageField
            name="image"
            removeName="removeImage"
            label="Foto do produto"
            currentUrl={product.imageUrl}
            shape="square"
            maxSide={1200}
            hint="Tire de cima ou de lado, com boa luz. Sem foto, o produto aparece só com o nome."
          />
        </Card>

        <Card className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Checkbox
            name="available"
            defaultChecked={v ? v.available === "on" : product.available}
            label="Disponível"
            hint="Desmarque quando acabar. Continua no cardápio como esgotado."
          />
          <Checkbox
            name="featured"
            defaultChecked={v ? v.featured === "on" : product.featured}
            label="Destaque"
            hint="Aparece no topo da sua página, em Destaques."
          />
        </Card>
        </Fragment>

        <div className="flex flex-wrap gap-2">
          <SubmitButton size="lg" pendingText="Salvando...">
            {product.id ? "Salvar produto" : "Adicionar ao cardápio"}
          </SubmitButton>
          <Link href={backHref} className={buttonClasses("ghost", "lg")}>
            Cancelar
          </Link>
        </div>
      </form>

      {product.id && (
        <form action={deleteAction} className="flex flex-col gap-2 border-t border-line pt-6">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="id" value={product.id} />
          {deleteState.error && <Alert tone="danger">{deleteState.error}</Alert>}
          <p className="text-sm text-muted">Excluir tira o produto do cardápio. Os pedidos antigos continuam com o nome e o preço da época.</p>
          <div>
            <ConfirmButton confirmText="Excluir de vez">Excluir produto</ConfirmButton>
          </div>
        </form>
      )}
    </div>
  );
}
