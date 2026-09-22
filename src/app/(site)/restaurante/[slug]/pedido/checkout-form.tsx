"use client";

import { Banknote, Bike, CreditCard, QrCode, ShoppingBag, Store, X } from "lucide-react";
import Link from "next/link";
import { Fragment, useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cartSubtotal, setQuantity as setCartQuantity, useCart } from "@/components/site/cart-store";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { copyToClipboard } from "@/components/ui/copy-button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CardType, PaymentMethod } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { formatCents } from "@/lib/format";
import { selectionProblems, type OptionGroupData } from "@/lib/options";
import { cardTypeLabel } from "@/lib/payment";

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
  /** formas que o restaurante aceita (Pix só com chave cadastrada) */
  payments: { pix: boolean; card: boolean; cash: boolean };
  /** mostrada antes do pedido e copiada ao fazer o pedido */
  pix: { key: string; display: string; holder: string | null } | null;
  /** produtos que dá para pedir agora e as opções de cada um */
  menu: Record<string, OptionGroupData[]>;
};

const choiceClasses = (selected: boolean, enabled = true) =>
  cn(
    "flex cursor-pointer gap-3 rounded-control border px-4 py-3",
    !enabled && "cursor-not-allowed opacity-50",
    selected ? "border-brand bg-brand-soft" : "border-line bg-surface-2 hover:border-line-strong",
  );

const chipClasses = (selected: boolean) =>
  cn(
    "flex h-11 cursor-pointer items-center gap-2 rounded-control border px-4 font-bold",
    selected ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-muted hover:border-line-strong",
  );

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
  const available = (["PIX", "CARD", "CASH"] as PaymentMethod[]).filter((m) =>
    m === "PIX" ? restaurant.payments.pix : m === "CARD" ? restaurant.payments.card : restaurant.payments.cash,
  );
  const [method, setMethod] = useState<PaymentMethod | undefined>(
    (state.values?.paymentMethod as PaymentMethod | undefined) ?? available[0],
  );
  const [cardType, setCardType] = useState<CardType | undefined>(state.values?.cardType as CardType | undefined);
  const [needsChange, setNeedsChange] = useState<"nao" | "sim" | undefined>(state.values?.needsChange as "nao" | "sim" | undefined);
  // revisão antes de criar o pedido: o formulário só segue depois do "Confirmar pedido"
  const formRef = useRef<HTMLFormElement>(null);
  const reviewRef = useRef<HTMLDialogElement>(null);
  const confirmed = useRef(false);
  const [review, setReview] = useState<{ place: string[]; payment: string; notes: string } | null>(null);

  // erro num campo: rola até ele (no celular o botão fica longe do topo)
  useEffect(() => {
    if (!state.fieldErrors) return;
    document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

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

  // itens que saíram do cardápio, esgotaram ou mudaram de opções depois de irem para o carrinho
  const stale = cart.items.filter((i) => {
    const groups = restaurant.menu[i.productId];
    return !groups || selectionProblems(groups, i.optionIds ?? []).length > 0;
  });
  const staleNotice = stale.length > 0 && (
    <Alert tone="warning" className="flex flex-col items-start gap-2">
      <span>
        {stale.length === 1 ? "Este item saiu do cardápio ou mudou" : "Estes itens saíram do cardápio ou mudaram"}:{" "}
        <strong>{stale.map((i) => i.name).join(", ")}</strong>. Tire do carrinho e, se quiser, escolha de novo no cardápio.
      </span>
      <Button size="sm" variant="secondary" onClick={() => stale.forEach((i) => setCartQuantity(i.key, 0))}>
        Tirar do carrinho
      </Button>
    </Alert>
  );
  const firstError = state.error ?? (state.fieldErrors ? Object.values(state.fieldErrors)[0] : undefined);

  const subtotal = cartSubtotal(cart);
  const fee = type === "DELIVERY" ? restaurant.deliveryFeeCents : 0;
  const total = subtotal + fee;
  const missing = Math.max(0, restaurant.minOrderCents - subtotal);
  const err = state.fieldErrors ?? {};
  const v = (key: string) => state.values?.[key] ?? saved[key] ?? "";
  const items = JSON.stringify(
    cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, notes: i.notes, optionIds: i.optionIds ?? [] })),
  );

  /** o que aparece na revisão: o endereço, o pagamento e a observação recém-preenchidos */
  function reviewFrom(data: FormData) {
    const field = (name: string) => String(data.get(name) ?? "").trim();
    const place =
      type === "DELIVERY"
        ? [
            `${field("street")}, nº ${field("number")}`,
            field("neighborhood"),
            field("complement") && `Complemento: ${field("complement")}`,
            field("reference") && `Referência: ${field("reference")}`,
          ]
        : ["Retirada no local", restaurant.address ?? ""];
    const payment =
      method === "PIX"
        ? "Pix"
        : method === "CARD"
          ? `Cartão${cardType ? ` de ${cardTypeLabel[cardType].toLowerCase()}` : ""}`
          : `Dinheiro${needsChange === "sim" && field("changeFor") ? `, troco para R$ ${field("changeFor")}` : ", sem troco"}`;
    return { place: place.filter(Boolean) as string[], payment, notes: field("notes") };
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    // primeiro toque: mostra a revisão em vez de já criar o pedido
    if (!confirmed.current) {
      event.preventDefault();
      setReview(reviewFrom(new FormData(event.currentTarget)));
      reviewRef.current?.showModal();
      return;
    }
    confirmed.current = false;
    // copia ainda no toque do botão (depois o navegador não deixa): a pessoa
    // sai do WhatsApp para o banco com a chave pronta para colar
    if (method === "PIX" && restaurant.pix) void copyToClipboard(restaurant.pix.key);
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

  function confirmOrder() {
    confirmed.current = true;
    reviewRef.current?.close();
    formRef.current?.requestSubmit();
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
    <>
      <form ref={formRef} action={action} onSubmit={onSubmit} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
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
          {staleNotice}
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
              <h2 className="text-lg font-extrabold">Como você vai pagar?</h2>
              {available.length === 0 ? (
                <Alert tone="warning">Este restaurante ainda não configurou as formas de pagamento.</Alert>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Forma de pagamento">
                  {available.map((m) => {
                    const info = {
                      PIX: { title: "Pix", text: "Pague e mande o comprovante no WhatsApp.", Icon: QrCode },
                      CARD: {
                        title: "Cartão",
                        text: type === "DELIVERY" ? "Crédito ou débito. O entregador leva a maquininha." : "Crédito ou débito, no balcão.",
                        Icon: CreditCard,
                      },
                      CASH: { title: "Dinheiro", text: type === "DELIVERY" ? "Pague ao receber." : "Pague na retirada.", Icon: Banknote },
                    }[m];
                    return (
                      <label key={m} className={choiceClasses(method === m)}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={m}
                          checked={method === m}
                          onChange={() => setMethod(m)}
                          className="mt-1 size-4 accent-brand"
                        />
                        <info.Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                        <span>
                          <span className="block font-bold">{info.title}</span>
                          <span className="block text-sm text-muted">{info.text}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {err.paymentMethod && <p className="text-sm text-danger">{err.paymentMethod}</p>}

              {method === "PIX" && restaurant.pix && (
                <div className="rounded-control border border-line bg-surface-2 p-4">
                  <p className="text-sm text-muted">Chave Pix</p>
                  <p className="mt-0.5 font-mono text-lg font-bold break-all">{restaurant.pix.display}</p>
                  {restaurant.pix.holder && <p className="mt-1 text-sm text-muted">Nome: {restaurant.pix.holder}</p>}
                  <p className="mt-2 text-sm font-semibold text-brand">
                    Ao fazer o pedido, a chave já fica copiada. Pague no app do banco e mande o comprovante na conversa do WhatsApp.
                  </p>
                </div>
              )}

              {method === "CARD" && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold">Crédito ou débito?</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo do cartão">
                    {(["CREDIT", "DEBIT"] as CardType[]).map((c) => (
                      <label key={c} className={chipClasses(cardType === c)}>
                        <input type="radio" name="cardType" value={c} checked={cardType === c} onChange={() => setCardType(c)} className="size-4 accent-brand" />
                        {cardTypeLabel[c]}
                      </label>
                    ))}
                  </div>
                  {err.cardType && <p className="text-sm text-danger">{err.cardType}</p>}
                </div>
              )}

              {method === "CASH" && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-bold">Precisa de troco?</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Troco">
                    {(
                      [
                        ["nao", "Não preciso"],
                        ["sim", "Sim, preciso"],
                      ] as const
                    ).map(([value, label]) => (
                      <label key={value} className={chipClasses(needsChange === value)}>
                        <input
                          type="radio"
                          name="needsChange"
                          value={value}
                          checked={needsChange === value}
                          onChange={() => setNeedsChange(value)}
                          className="size-4 accent-brand"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {err.needsChange && <p className="text-sm text-danger">{err.needsChange}</p>}
                  {needsChange === "sim" && (
                    <Field label="Troco para quanto?" htmlFor="changeFor" error={err.changeFor} hint={`O total é ${formatCents(total)}.`} className="sm:max-w-xs">
                      <MoneyInput id="changeFor" name="changeFor" required defaultValue={state.values?.changeFor ?? ""} placeholder="100,00" aria-invalid={!!err.changeFor} />
                    </Field>
                  )}
                </div>
              )}
            </Card>

            <Card className="flex flex-col gap-4">
              <Field label="Observações do pedido" htmlFor="notes" error={err.notes} hint="Opcional. Ex.: portão, interfone, ponto da carne.">
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
                    {i.optionsText && <span className="block text-ink/80">{i.optionsText}</span>}
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
            {method && (
              <div className="rounded-control border border-line bg-surface-2 p-3 text-sm">
                <p className="font-bold">
                  Pagamento: {method === "PIX" ? "Pix" : method === "CARD" ? `Cartão${cardType ? ` de ${cardTypeLabel[cardType].toLowerCase()}` : ""}` : "Dinheiro"}
                </p>
                <p className="text-muted">
                  {method === "PIX"
                    ? "A chave é copiada ao fazer o pedido."
                    : type === "DELIVERY"
                      ? "Você paga ao receber o pedido."
                      : "Você paga na retirada."}
                </p>
              </div>
            )}
            {missing > 0 && <Alert tone="warning">Faltam {formatCents(missing)} para o pedido mínimo.</Alert>}
            {!restaurant.open && <Alert tone="warning">O restaurante está fechado agora.</Alert>}
            {staleNotice}
            {/* o aviso também fica aqui: no celular, o topo do formulário está longe do botão */}
            {firstError && <Alert tone="danger">{firstError}</Alert>}
            <Alert tone="warning">
              Depois de confirmar, o WhatsApp do restaurante abre com o seu pedido escrito. <strong>Toque em enviar lá no WhatsApp</strong>: é assim que
              o pedido chega ao restaurante.
            </Alert>
            <SubmitButton size="lg" pendingText="Enviando pedido..." disabled={missing > 0 || !restaurant.open || !method || stale.length > 0} className="w-full justify-between">
              <span>Fazer pedido</span>
              <span className="tabular-nums">{formatCents(total)}</span>
            </SubmitButton>
            <p className="text-center text-xs text-faint">Os valores são conferidos pelo restaurante na hora do pedido.</p>
          </Card>
        </aside>
      </form>

      {/* revisão: a mesma folha do cardápio, para conferir tudo antes de confirmar */}
      <dialog
        ref={reviewRef}
        onClick={(e) => e.target === reviewRef.current && reviewRef.current?.close()}
        className="mx-auto mt-auto mb-0 max-h-[94dvh] w-full max-w-lg overflow-hidden rounded-t-[1.75rem] bg-surface p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm open:animate-[sheet-up_0.28s_ease-out] sm:my-auto sm:rounded-card"
        aria-label="Confira seu pedido"
      >
        {review && (
          <div className="flex max-h-[94dvh] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h2 className="text-xl font-extrabold">Confira seu pedido</h2>
              <button
                type="button"
                onClick={() => reviewRef.current?.close()}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink hover:bg-surface-3"
                aria-label="Fechar"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain p-5">
              <ul className="flex flex-col gap-3">
                {cart.items.map((i) => (
                  <li key={i.key} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-bold">{i.name}</span>
                      {i.optionsText && <span className="block text-sm text-ink/80">{i.optionsText}</span>}
                      {i.notes && <span className="block text-sm text-muted">Obs.: {i.notes}</span>}
                      <span className="block text-sm text-muted">
                        {i.quantity}x {formatCents(i.unitPriceCents)}
                      </span>
                    </span>
                    <span className="shrink-0 font-bold tabular-nums">{formatCents(i.unitPriceCents * i.quantity)}</span>
                  </li>
                ))}
              </ul>

              <dl className="flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="tabular-nums">{formatCents(subtotal)}</dd>
                </div>
                {type === "DELIVERY" && (
                  <div className="flex justify-between">
                    <dt className="text-muted">Entrega</dt>
                    <dd className="tabular-nums">{fee > 0 ? formatCents(fee) : "Grátis"}</dd>
                  </div>
                )}
                <div className="flex justify-between text-lg font-extrabold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatCents(total)}</dd>
                </div>
              </dl>

              <div className="rounded-control border border-line bg-surface-2 p-4 text-sm">
                <p className="font-bold">{type === "DELIVERY" ? "Endereço da entrega" : "Retirada"}</p>
                {review.place.map((line) => (
                  <p key={line} className="text-muted">
                    {line}
                  </p>
                ))}
                <p className="mt-2 font-bold">Pagamento</p>
                <p className="text-muted">{review.payment}</p>
                {review.notes && (
                  <>
                    <p className="mt-2 font-bold">Observações</p>
                    <p className="text-muted">{review.notes}</p>
                  </>
                )}
              </div>
            </div>

            {/* ações fixas embaixo, sempre à mão do polegar */}
            <div className="flex flex-col gap-2 border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button size="lg" onClick={confirmOrder} className="w-full justify-between">
                <span>Confirmar pedido</span>
                <span className="tabular-nums">{formatCents(total)}</span>
              </Button>
              <Button size="lg" variant="ghost" onClick={() => reviewRef.current?.close()} className="w-full">
                Voltar e editar
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
