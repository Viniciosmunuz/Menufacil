import { Check, CircleCheck, CircleX, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { SubmitButton } from "@/components/ui/submit-button";
import type { OrderStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatCents, formatDateTime, formatPhone, formatTime } from "@/lib/format";
import { orderStatusLabel, orderStatusTone } from "@/lib/labels";
import { formatPixKey, pixKeyTypeLabel } from "@/lib/pix";

import { markPaymentSent, sendOrderToRestaurant } from "./actions";
import { ClearCartAfterOrder } from "./order-live";

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false, follow: false } };

const FINAL: OrderStatus[] = ["COMPLETED", "CANCELED"];

function steps(type: "DELIVERY" | "PICKUP"): { status: OrderStatus[]; label: string }[] {
  return [
    { status: ["NEW", "AWAITING_PAYMENT"], label: "Pedido recebido" },
    { status: ["PAYMENT_SENT"], label: "Pagamento enviado" },
    { status: ["CONFIRMED"], label: "Pagamento confirmado" },
    { status: ["PREPARING"], label: "Em preparo" },
    { status: ["READY"], label: type === "PICKUP" ? "Pronto para retirar" : "Pronto" },
    ...(type === "DELIVERY" ? [{ status: ["OUT_FOR_DELIVERY"] as OrderStatus[], label: "Saiu para entrega" }] : []),
    { status: ["COMPLETED"], label: "Concluído" },
  ];
}

export default async function OrderPage({ params, searchParams }: PageProps<"/pedido/[code]">) {
  const { code } = await params;
  const sp = await searchParams;
  const order = await db.order.findUnique({
    where: { code },
    include: {
      items: { orderBy: { id: "asc" } },
      payment: true,
      statusEvents: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
      restaurant: { select: { id: true, name: true, slug: true, whatsapp: true, pixHolderName: true, paymentInstructions: true } },
    },
  });
  if (!order) notFound();

  const r = order.restaurant;
  const pay = order.payment;
  const flow = steps(order.type);
  const currentIndex = flow.findIndex((s) => s.status.includes(order.status));
  const canceled = order.status === "CANCELED";
  const showPix = !canceled && !!pay?.pixKey && (pay.status === "PENDING" || pay.status === "PROOF_SENT");
  const reachedAt = (status: OrderStatus[]) => order.statusEvents.find((e) => status.includes(e.status))?.createdAt;

  const proofText = encodeURIComponent(`Olá! Segue o comprovante do Pix do pedido #${order.number} (${formatCents(order.totalCents)}).`);
  const whatsappLink = r.whatsapp ? `https://wa.me/${r.whatsapp}?text=${proofText}` : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      {sp.novo === "1" && <ClearCartAfterOrder restaurantId={r.id} />}
      {!FINAL.includes(order.status) && <AutoRefresh />}

      <Card className="flex flex-col gap-2 text-center">
        {canceled ? (
          <CircleX className="mx-auto size-12 text-danger" aria-hidden="true" />
        ) : (
          <CircleCheck className="mx-auto size-12 text-success" aria-hidden="true" />
        )}
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          {sp.novo === "1" ? "Pedido feito!" : `Pedido #${order.number}`}
        </h1>
        {sp.novo === "1" && showPix && (
          <p className="font-bold text-brand">Copie a chave Pix abaixo: o pedido vai direto para o WhatsApp do restaurante.</p>
        )}
        <p className="text-muted">
          {sp.novo === "1" ? `Pedido #${order.number} em ` : ""}
          <Link href={`/restaurante/${r.slug}`} className="font-bold text-ink hover:text-brand">
            {r.name}
          </Link>
          {" · "}
          {formatDateTime(order.createdAt)}
        </p>
        <div className="mt-1 flex justify-center">
          <Badge tone={orderStatusTone[order.status]} className="h-8 px-4 text-sm">
            {orderStatusLabel[order.status]}
          </Badge>
        </div>
      </Card>

      {showPix && pay && (
        <Card className="flex flex-col gap-4 border-brand/50">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold">Pague com Pix</h2>
            <p className="text-2xl font-extrabold text-brand tabular-nums">{formatCents(pay.amountCents)}</p>
          </div>
          <div className="rounded-control border border-line bg-surface-2 p-4">
            <p className="text-sm text-muted">{pay.pixKeyType ? pixKeyTypeLabel[pay.pixKeyType] : "Chave Pix"}</p>
            <p className="mt-0.5 font-mono text-lg font-bold break-all">{formatPixKey(pay.pixKeyType, pay.pixKey!)}</p>
            {r.pixHolderName && <p className="mt-1 text-sm text-muted">Nome: {r.pixHolderName}</p>}
            <CopyButton
              text={pay.pixKey!}
              label="Copiar chave Pix"
              copiedLabel="Chave copiada!"
              variant="primary"
              size="lg"
              className="mt-4 w-full"
              onCopyAction={sendOrderToRestaurant.bind(null, order.code)}
            />
          </div>
          {r.paymentInstructions && <p className="text-sm text-muted">{r.paymentInstructions}</p>}
          <p className="rounded-control bg-brand-soft px-4 py-3 font-bold text-brand">
            Após realizar o pagamento, envie o comprovante pelo WhatsApp.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-success/90 px-5 font-bold text-bg hover:bg-success"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
                Enviar comprovante
              </a>
            )}
            {order.status === "AWAITING_PAYMENT" ? (
              <form action={markPaymentSent}>
                <input type="hidden" name="code" value={order.code} />
                <SubmitButton variant="secondary" size="lg" pendingText="Avisando..." className="w-full">
                  Já paguei
                </SubmitButton>
              </form>
            ) : (
              <p className="flex h-12 items-center justify-center gap-2 rounded-control border border-success/40 text-sm font-bold text-success">
                <Check className="size-4" aria-hidden="true" />
                Você avisou que pagou
              </p>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 text-lg font-extrabold">Andamento</h2>
        {canceled ? (
          <p className="text-danger">Este pedido foi cancelado. Se tiver dúvida, fale com o restaurante.</p>
        ) : (
          <ol className="flex flex-col">
            {flow.map((step, i) => {
              const done = i <= currentIndex;
              const at = reachedAt(step.status);
              return (
                <li key={step.label} className="flex gap-3">
                  <span className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full border-2",
                        done ? "border-success bg-success text-bg" : "border-line-strong text-faint",
                        i === currentIndex && "ring-4 ring-success/20",
                      )}
                    >
                      {done && <Check className="size-4" aria-hidden="true" />}
                    </span>
                    {i < flow.length - 1 && <span className={cn("w-0.5 flex-1", i < currentIndex ? "bg-success" : "bg-line")} />}
                  </span>
                  <span className="pb-5">
                    <span className={cn("block font-bold", !done && "text-muted")}>{step.label}</span>
                    {done && at && <span className="text-sm text-faint">{formatTime(at)}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">Resumo</h2>
        <ul className="flex flex-col gap-2">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>
                <span className="font-bold">{i.quantity}x</span> {i.productName}
                {i.notes && <span className="block text-sm text-muted">Obs.: {i.notes}</span>}
              </span>
              <span className="shrink-0 tabular-nums">{formatCents(i.totalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatCents(order.subtotalCents)}</dd>
          </div>
          {order.type === "DELIVERY" && (
            <div className="flex justify-between">
              <dt className="text-muted">Taxa de entrega</dt>
              <dd className="tabular-nums">{order.deliveryFeeCents > 0 ? formatCents(order.deliveryFeeCents) : "Grátis"}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatCents(order.totalCents)}</dd>
          </div>
        </dl>
        <div className="grid gap-3 border-t border-line pt-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted">{order.type === "DELIVERY" ? "Entrega em" : "Retirada"}</p>
            <p className="font-bold">
              {order.type === "DELIVERY"
                ? `${order.deliveryStreet}, ${order.deliveryNumber} - ${order.deliveryNeighborhood}`
                : "No restaurante"}
            </p>
            {order.deliveryComplement && <p className="text-muted">{order.deliveryComplement}</p>}
            {order.deliveryReference && <p className="text-muted">Ref.: {order.deliveryReference}</p>}
          </div>
          <div>
            <p className="text-muted">Cliente</p>
            <p className="font-bold">{order.customerName}</p>
            <p className="text-muted">{formatPhone(order.customerWhatsapp)}</p>
          </div>
        </div>
        {order.notes && <p className="rounded-control bg-surface-2 p-3 text-sm">Obs.: {order.notes}</p>}
      </Card>

      <p className="text-center text-sm text-faint">Guarde este link para acompanhar o pedido. Ele atualiza sozinho.</p>
    </div>
  );
}
