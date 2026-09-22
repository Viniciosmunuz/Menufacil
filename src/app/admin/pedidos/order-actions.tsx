"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Fragment, useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { OrderStatus } from "@/generated/prisma/enums";
import { ORDER_STATUSES, orderStatusLabel } from "@/lib/labels";

import { deleteOrder, updateOrder, type OrderFormState } from "./actions";

export type EditableOrder = {
  id: string;
  type: "DELIVERY" | "PICKUP";
  status: OrderStatus;
  customerName: string;
  customerWhatsapp: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  reference: string;
  notes: string;
};

export function OrderActions({ order }: { order: EditableOrder }) {
  const [editing, setEditing] = useState(false);

  if (editing) return <OrderEditForm order={order} onDone={() => setEditing(false)} />;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="size-4" aria-hidden="true" />
        Editar
      </Button>
      <form action={deleteOrder}>
        <input type="hidden" name="orderId" value={order.id} />
        <ConfirmButton size="sm" confirmText="Excluir de vez">
          <Trash2 className="size-4" aria-hidden="true" />
          Excluir
        </ConfirmButton>
      </form>
    </div>
  );
}

function OrderEditForm({ order, onDone }: { order: EditableOrder; onDone: () => void }) {
  const [state, action] = useActionState(async (prev: OrderFormState, formData: FormData) => {
    const result = await updateOrder(prev, formData);
    if (result.ok) onDone();
    return result;
  }, {});
  const err = state.fieldErrors ?? {};
  const v = (key: keyof EditableOrder) => state.values?.[key] ?? order[key];
  const id = (key: string) => `${order.id}-${key}`;

  return (
    <form action={action} className="flex flex-col gap-4 rounded-control border border-line bg-surface-2/40 p-4">
      <input type="hidden" name="orderId" value={order.id} />
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.fieldErrors && !state.error && <Alert tone="danger">Confira os campos marcados em vermelho.</Alert>}

      {/* recria os campos a cada resposta: o padrão passa a ser o que foi digitado */}
      <Fragment key={JSON.stringify(state.values ?? null)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <Field label="Status" htmlFor={id("status")} error={err.status} className="sm:col-span-6">
            <Select id={id("status")} name="status" defaultValue={v("status")}>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {orderStatusLabel[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cliente" htmlFor={id("customerName")} error={err.customerName} className="sm:col-span-3">
            <Input id={id("customerName")} name="customerName" required maxLength={80} defaultValue={v("customerName")} aria-invalid={!!err.customerName} />
          </Field>
          <Field label="WhatsApp do cliente" htmlFor={id("customerWhatsapp")} error={err.customerWhatsapp} className="sm:col-span-3">
            <Input
              id={id("customerWhatsapp")}
              name="customerWhatsapp"
              type="tel"
              inputMode="tel"
              required
              defaultValue={v("customerWhatsapp")}
              aria-invalid={!!err.customerWhatsapp}
            />
          </Field>
          {order.type === "DELIVERY" && (
            <>
              <Field label="Rua" htmlFor={id("street")} error={err.street} className="sm:col-span-4">
                <Input id={id("street")} name="street" required maxLength={120} defaultValue={v("street")} aria-invalid={!!err.street} />
              </Field>
              <Field label="Número" htmlFor={id("number")} error={err.number} className="sm:col-span-2">
                <Input id={id("number")} name="number" required maxLength={20} defaultValue={v("number")} aria-invalid={!!err.number} />
              </Field>
              <Field label="Bairro" htmlFor={id("neighborhood")} error={err.neighborhood} className="sm:col-span-3">
                <Input id={id("neighborhood")} name="neighborhood" required maxLength={80} defaultValue={v("neighborhood")} aria-invalid={!!err.neighborhood} />
              </Field>
              <Field label="Complemento" htmlFor={id("complement")} error={err.complement} className="sm:col-span-3">
                <Input id={id("complement")} name="complement" maxLength={80} defaultValue={v("complement")} />
              </Field>
              <Field label="Ponto de referência" htmlFor={id("reference")} error={err.reference} className="sm:col-span-6">
                <Input id={id("reference")} name="reference" maxLength={120} defaultValue={v("reference")} />
              </Field>
            </>
          )}
          <Field label="Observações" htmlFor={id("notes")} error={err.notes} className="sm:col-span-6">
            <Textarea id={id("notes")} name="notes" maxLength={300} rows={2} defaultValue={v("notes")} />
          </Field>
        </div>
      </Fragment>

      <p className="text-sm text-faint">Mudar o status avisa o cliente pelo WhatsApp e atualiza o pagamento.</p>
      <div className="flex flex-wrap gap-2">
        <SubmitButton size="sm">Salvar</SubmitButton>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
