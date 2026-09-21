"use client";

import { Bike, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { Fragment, useActionState, useState, useSyncExternalStore } from "react";

import { cartSubtotal, useCart } from "@/components/site/cart-store";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";

import { submitOrder, type CheckoutState } from "./actions";

type RestaurantInfo = {
  id: string;
  slug: string;
  name: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFeeCents: number;
  minOrderCents: number;
  deliveryTime: string | null;
  address: string | null;
  open: boolean;
};

// dados do cliente lembrados neste aparelho, para o próximo pedido
const SAVED_KEY = "mf_cliente";
const noop = () => () => {};
const readSaved = () => {
  try {
    return localStorage.getItem(SAVED_KEY);
  } catch {
    return null;
  }
};
const SAVED_FIELDS = ["customerName", "customerWhatsapp", "street", "number", "complement", "neighborhood", "reference"];

export function CheckoutForm({ restaurant }: { restaurant: RestaurantInfo }) {
  const cart = useCart();
  const savedRaw = useSyncExternalStore(noop, readSaved, () => null);
  const saved: Record<string, string> = (() => {
    try {
      return savedRaw ? JSON.parse(savedRaw) : {};
    } catch {
      return {};
    }
  })();
  const [state, action] = useActionState<CheckoutState, FormData>(submitOrder, {});
  const [type, setType] = useState<"DELIVERY" | "PICKUP">(
    (state.values?.type as "DELIVERY" | "PICKUP" | undefined) ?? (restaurant.deliveryEnabled ? "DELIVERY" : "PICKUP"),
  );
  const [remember, setRemember] = useState(true);

  const mine = cart.restaurant?.id === restaurant.id && cart.items.length > 0;
  if (!mine) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <ShoppingBag className="size-10 text-faint" aria-hidden="true" />
        <p className="text-lg font-extrabold">Seu carrinho está vazio</p>
        <Link href={`/restaurante/${restaurant.slug}`} className={buttonClasses("primary")}>
          Ver o cardápio de {restaurant.name}
        </Link>
      </Card>
    );
  }

  const subtotal = cartSubtotal(cart);
  const fee = type === "DELIVERY" ? restaurant.deliveryFeeCents : 0;
  const total = subtotal + fee;
  const missing = Math.max(0, restaurant.minOrderCents - subtotal);
  const err = state.fieldErrors ?? {};
  const v = (key: string) => state.values?.[key] ?? saved[key] ?? "";
  const items = JSON.stringify(cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, notes: i.notes })));

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    try {
      if (!remember) {
        localStorage.removeItem(SAVED_KEY);
        return;
      }
      const data = new FormData(event.currentTarget);
      const toSave = Object.fromEntries(SAVED_FIELDS.map((k) => [k, String(data.get(k) ?? saved[k] ?? "")]));
      localStorage.setItem(SAVED_KEY, JSON.stringify(toSave));
    } catch {
      // sem armazenamento: só não lembra
    }
  }

  const option = (value: "DELIVERY" | "PICKUP", enabled: boolean, title: string, text: string, Icon: typeof Bike) => (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-control border px-4 py-3",
        !enabled && "cursor-not-allowed opacity-50",
        type === value ? "border-brand bg-brand-soft" : "border-line bg-surface-2 hover:border-line-strong",
      )}
    >
      <input
        type="radio"
        name="type"
        value={value}
        checked={type === value}
        disabled={!enabled}
        onChange={() => setType(value)}
        className="mt-1 size-4 accent-brand"
      />
      <Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
      <span>
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-muted">{enabled ? text : "Este restaurante não oferece."}</span>
      </span>
    </label>
  );

  return (
    <form action={action} onSubmit={onSubmit} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <input type="hidden" name="slug" value={restaurant.slug} />
      <input type="hidden" name="items" value={items} />
      {/* armadilha para robôs: pessoas não veem este campo */}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Site
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {state.fieldErrors && !state.error && <Alert tone="danger">Confira os campos marcados em vermelho.</Alert>}

        {/* recria os campos quando o servidor devolve: o reset volta ao que foi digitado */}
        <Fragment key={JSON.stringify(state.values ?? null) + (savedRaw ? "1" : "0")}>
          <Card className="flex flex-col gap-5">
            <h2 className="text-lg font-extrabold">Seus dados</h2>
            <Field label="Seu nome" htmlFor="customerName" error={err.customerName}>
              <Input id="customerName" name="customerName" required maxLength={80} autoComplete="name" defaultValue={v("customerName")} aria-invalid={!!err.customerName} />
            </Field>
            <Field label="Seu WhatsApp" htmlFor="customerWhatsapp" error={err.customerWhatsapp} hint="O restaurante fala com você por ele.">
              <Input
                id="customerWhatsapp"
                name="customerWhatsapp"
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel-national"
                placeholder="(92) 99999-0000"
                defaultValue={v("customerWhatsapp")}
                aria-invalid={!!err.customerWhatsapp}
              />
            </Field>
          </Card>

          <Card className="flex flex-col gap-5">
            <h2 className="text-lg font-extrabold">Como você quer receber?</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Entrega ou retirada">
              {option(
                "DELIVERY",
                restaurant.deliveryEnabled,
                "Entrega",
                `${restaurant.deliveryFeeCents > 0 ? formatCents(restaurant.deliveryFeeCents) : "Grátis"}${restaurant.deliveryTime ? ` · ${restaurant.deliveryTime}` : ""}`,
                Bike,
              )}
              {option("PICKUP", restaurant.pickupEnabled, "Retirada no local", restaurant.address ?? "Busque no restaurante.", Store)}
            </div>
            {err.type && <p className="text-sm text-danger">{err.type}</p>}

            {type === "DELIVERY" && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
                <Field label="Rua" htmlFor="street" error={err.street} className="sm:col-span-4">
                  <Input id="street" name="street" required maxLength={120} autoComplete="address-line1" defaultValue={v("street")} aria-invalid={!!err.street} />
                </Field>
                <Field label="Número" htmlFor="number" error={err.number} className="sm:col-span-2">
                  <Input id="number" name="number" required maxLength={20} defaultValue={v("number")} aria-invalid={!!err.number} />
                </Field>
                <Field label="Bairro" htmlFor="neighborhood" error={err.neighborhood} className="sm:col-span-3">
                  <Input id="neighborhood" name="neighborhood" required maxLength={80} defaultValue={v("neighborhood")} aria-invalid={!!err.neighborhood} />
                </Field>
                <Field label="Complemento" htmlFor="complement" error={err.complement} hint="Opcional." className="sm:col-span-3">
                  <Input id="complement" name="complement" maxLength={80} autoComplete="address-line2" defaultValue={v("complement")} />
                </Field>
                <Field label="Ponto de referência" htmlFor="reference" error={err.reference} hint="Opcional. Ajuda o entregador." className="sm:col-span-6">
                  <Input id="reference" name="reference" maxLength={120} defaultValue={v("reference")} placeholder="Ex.: casa azul ao lado da farmácia" />
                </Field>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-4">
            <Field label="Observações do pedido" htmlFor="notes" error={err.notes} hint="Opcional. Ex.: troco, portão, interfone.">
              <Textarea id="notes" name="notes" maxLength={300} rows={2} defaultValue={state.values?.notes ?? ""} />
            </Field>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-5 accent-brand" />
              Lembrar meus dados neste aparelho
            </label>
          </Card>
        </Fragment>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-[5.75rem]">
        <Card className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-sm text-muted">Pedido em</p>
            <p className="font-extrabold">{restaurant.name}</p>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {cart.items.map((i) => (
              <li key={i.key} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-bold">{i.quantity}x</span> {i.name}
                  {i.notes && <span className="block text-muted">Obs.: {i.notes}</span>}
                </span>
                <span className="shrink-0 tabular-nums">{formatCents(i.unitPriceCents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <Link href={`/restaurante/${restaurant.slug}`} className="text-sm font-bold text-brand hover:underline">
            Adicionar mais itens
          </Link>
          <dl className="flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{formatCents(subtotal)}</dd>
            </div>
            {type === "DELIVERY" && (
              <div className="flex justify-between">
                <dt className="text-muted">Taxa de entrega</dt>
                <dd className="tabular-nums">{fee > 0 ? formatCents(fee) : "Grátis"}</dd>
              </div>
            )}
            <div className="flex justify-between text-lg font-extrabold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatCents(total)}</dd>
            </div>
          </dl>
          <div className="rounded-control border border-line bg-surface-2 p-3 text-sm">
            <p className="font-bold">Pagamento: Pix</p>
            <p className="text-muted">A chave Pix aparece assim que você fizer o pedido.</p>
          </div>
          {missing > 0 && <Alert tone="warning">Faltam {formatCents(missing)} para o pedido mínimo.</Alert>}
          {!restaurant.open && <Alert tone="warning">O restaurante está fechado agora.</Alert>}
          <SubmitButton size="lg" pendingText="Enviando pedido..." disabled={missing > 0 || !restaurant.open} className="w-full justify-between">
            <span>Fazer pedido</span>
            <span className="tabular-nums">{formatCents(total)}</span>
          </SubmitButton>
          <p className="text-center text-xs text-faint">Os valores são conferidos pelo restaurante na hora do pedido.</p>
        </Card>
      </aside>
    </form>
  );
}
