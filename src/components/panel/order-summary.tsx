import { ChevronDown, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { Prisma } from "@/generated/prisma/client";
import { formatCents, formatPhone, formatWhen } from "@/lib/format";
import { orderStatusLabel, orderStatusTone, paymentStatusLabel } from "@/lib/labels";
import { paymentHint, paymentText } from "@/lib/payment";

import type { EditableOrder } from "./order-actions";

// Resumo de um pedido (itens, valores, cliente, entrega, pagamento) e a
// gaveta da lista, iguais no admin e no painel do restaurante.

export const orderSummarySelect = {
  id: true,
  number: true,
  code: true,
  customerName: true,
  customerWhatsapp: true,
  origin: true,
  dineIn: true,
  type: true,
  status: true,
  notes: true,
  deliveryStreet: true,
  deliveryNumber: true,
  deliveryComplement: true,
  deliveryNeighborhood: true,
  deliveryReference: true,
  subtotalCents: true,
  deliveryFeeCents: true,
  totalCents: true,
  createdAt: true,
  paymentMethod: true,
  items: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      productName: true,
      optionsText: true,
      quantity: true,
      totalCents: true,
      notes: true,
      // a seção do cardápio vai na via impressa: nome de prato se repete
      // entre seções, e a cozinha estava trocando um pelo outro
      product: { select: { category: { select: { name: true } } } },
    },
  },
  payment: { select: { status: true, cardType: true, changeForCents: true } },
  // a mesa e o garçom, quando o pedido veio do salão: é o que vai no topo
  // da comanda, no lugar do nome e do endereço de quem pede pelo link
  comanda: { select: { mesa: { select: { numero: true, tipo: true, nome: true } }, garcom: { select: { name: true } } } },
} satisfies Prisma.OrderSelect;

export type OrderSummaryData = Prisma.OrderGetPayload<{ select: typeof orderSummarySelect }>;

/** dados que o formulário "Editar" começa preenchidos */
export function editableOrder(o: OrderSummaryData): EditableOrder {
  return {
    id: o.id,
    type: o.type,
    status: o.status,
    customerName: o.customerName,
    customerWhatsapp: formatPhone(o.customerWhatsapp),
    street: o.deliveryStreet ?? "",
    number: o.deliveryNumber ?? "",
    complement: o.deliveryComplement ?? "",
    neighborhood: o.deliveryNeighborhood ?? "",
    reference: o.deliveryReference ?? "",
    notes: o.notes ?? "",
  };
}

export function OrderSummary({ order: o }: { order: OrderSummaryData }) {
  const delivery = o.type === "DELIVERY";
  const choice = { method: o.paymentMethod, cardType: o.payment?.cardType, changeForCents: o.payment?.changeForCents };
  const hint = paymentHint(choice, o.type, o.totalCents, o.origin);
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold text-muted">Itens</h3>
        <ul className="flex flex-col gap-1.5 text-sm">
          {o.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="font-bold">{i.quantity}x</span> {i.productName}
                {i.optionsText && <span className="block font-semibold text-brand">{i.optionsText}</span>}
                {i.notes && <span className="block text-muted">Obs.: {i.notes}</span>}
              </span>
              <span className="shrink-0 tabular-nums">{formatCents(i.totalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t border-line pt-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatCents(o.subtotalCents)}</dd>
          </div>
          {delivery && (
            <div className="flex justify-between">
              <dt className="text-muted">Taxa de entrega</dt>
              <dd className="tabular-nums">{o.deliveryFeeCents > 0 ? formatCents(o.deliveryFeeCents) : "Grátis"}</dd>
            </div>
          )}
          <div className="flex justify-between font-extrabold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatCents(o.totalCents)}</dd>
          </div>
        </dl>
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
        <div>
          <dt className="font-bold text-muted">Cliente</dt>
          <dd className="font-bold">{o.customerName}</dd>
          {o.customerWhatsapp ? (
            <dd>
              <a href={`https://wa.me/${o.customerWhatsapp}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                {formatPhone(o.customerWhatsapp)}
              </a>
            </dd>
          ) : (
            /* pedido do totem: ninguém digita telefone no balcão */
            <dd className="text-muted">Pedido feito no totem</dd>
          )}
        </div>
        <div>
          <dt className="font-bold text-muted">{delivery ? "Entrega em" : o.origin === "TOTEM" ? "No totem" : "Retirada"}</dt>
          <dd>
            {delivery
              ? `${o.deliveryStreet}, ${o.deliveryNumber} - ${o.deliveryNeighborhood}`
              : o.origin === "TOTEM"
                ? o.dineIn
                  ? "Comer no local"
                  : "Para viagem"
                : "No restaurante"}
          </dd>
          {o.deliveryComplement && <dd className="text-muted">{o.deliveryComplement}</dd>}
          {o.deliveryReference && <dd className="text-muted">Ref.: {o.deliveryReference}</dd>}
        </div>
        <div>
          <dt className="font-bold text-muted">Pagamento</dt>
          <dd>
            {paymentText(choice)} · {o.payment ? paymentStatusLabel[o.payment.status] : "sem registro"}
          </dd>
          {hint && <dd className="mt-1 font-bold text-brand">{hint}</dd>}
        </div>
        {o.notes && (
          <div>
            <dt className="font-bold text-muted">Observações</dt>
            <dd>{o.notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/**
 * Linha da lista, que abre como gaveta com o resumo e as ações dentro.
 *
 * O que o balcão precisa ler de relance é sempre o mesmo: qual pedido, de
 * quem, em que pé está e quanto deu. Por isso o número e o nome ficam na
 * primeira linha, grandes, e o estado, o tipo e a hora na segunda, menores.
 * No computador tudo isso cabe numa linha só.
 *
 * A data só aparece quando o pedido não é de hoje, e o bairro entra quando
 * é entrega: numa lista de nomes parecidos, é o que diz para onde vai.
 */
export function OrderDrawer({
  order: o,
  prefix,
  /** mensagens do cliente esperando resposta (100% Delivery) */
  naoLidas = 0,
  children,
}: {
  order: OrderSummaryData;
  prefix?: string;
  naoLidas?: number;
  children: ReactNode;
}) {
  const delivery = o.type === "DELIVERY";
  // no totem, "retirada" não diz nada: o que o balcão precisa saber é se a
  // pessoa vai comer ali ou levar
  const comoSai = delivery ? "Entrega" : o.origin === "TOTEM" ? (o.dineIn ? "Comer no local" : "Para viagem") : "Retirada";
  const meta = [prefix, comoSai, delivery ? o.deliveryNeighborhood : null, formatWhen(o.createdAt)]
    .filter(Boolean)
    .join(" · ");

  return (
    <details className="drawer group rounded-card border border-line bg-surface open:border-line-strong">
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-card px-4 py-3.5 hover:bg-surface-2/60 sm:items-center sm:gap-4 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="mt-0.5 shrink-0 font-extrabold tabular-nums text-muted sm:mt-0 sm:w-14">#{o.number}</span>

        <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <span className="min-w-0 truncate font-bold sm:max-w-56 sm:shrink-0">{o.customerName}</span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:flex-1 sm:flex-nowrap">
            <Badge tone={orderStatusTone[o.status]} className="shrink-0">
              {orderStatusLabel[o.status]}
            </Badge>
            {/* quem está no balcão precisa saber na hora que ninguém anotou este pedido */}
            {o.origin === "TOTEM" && <Badge tone="brand">Totem</Badge>}
            {/* no 100% Delivery o cliente fala por aqui, não pelo WhatsApp:
                sem este selo, a mensagem dele ficaria sem resposta dentro de
                um pedido fechado na lista */}
            {naoLidas > 0 && (
              <Badge tone="brand">
                <MessageSquare className="size-3.5" aria-hidden="true" />
                {naoLidas}
              </Badge>
            )}
            <span className="truncate text-sm text-muted">{meta}</span>
          </span>
        </span>

        <span className="mt-0.5 shrink-0 font-extrabold tabular-nums sm:mt-0">{formatCents(o.totalCents)}</span>
        <ChevronDown
          className="mt-0.5 size-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180 sm:mt-0"
          aria-hidden="true"
        />
      </summary>
      <div className="flex flex-col gap-5 border-t border-line px-4 py-4 sm:px-5">
        <OrderSummary order={o} />
        {children}
      </div>
    </details>
  );
}
