import { Banknote, CreditCard, ExternalLink, QrCode } from "lucide-react";
import Link from "next/link";

import { StepButton, type StatusNotice } from "@/components/panel/step-button";

import { LinhaDePedido } from "./linha";
import { buttonClasses } from "@/components/ui/button";
import type { OrderOrigin, OrderStatus, OrderType, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";
import { formatCents, formatPhone, formatTime } from "@/lib/format";
import { orderStatusLabel } from "@/lib/labels";
import { FINAL_ORDER_STATUSES, nextOrderStep, pagamentoConfirmado } from "@/lib/order-flow";

// A lista de pedidos em tabela, no computador.
//
// A mesma informação dos cartões do celular, em colunas: no monitor do
// balcão cabem sete pedidos de uma vez sem rolar, e comparar dois é olhar
// duas linhas em vez de abrir dois cartões.
//
// O celular continua com os cartões. Sete colunas em 390px não viram
// tabela, viram sopa.

/** a cor de cada status, nos tons que o painel já usa */
const COR: Record<OrderStatus, string> = {
  // esperando o restaurante: laranja é a cor do que pede a mão dele
  NEW: "bg-brand-soft text-brand",
  PAID: "bg-brand-soft text-brand",
  PAYMENT_SENT: "bg-brand-soft text-brand",
  CONFIRMED: "bg-brand-soft text-brand",
  // esperando o cliente pagar: nada a fazer no balcão ainda
  AWAITING_PAYMENT: "bg-warning/12 text-warning",
  // andando na cozinha
  PREPARING: "bg-info/12 text-info",
  READY: "bg-info/12 text-info",
  OUT_FOR_DELIVERY: "bg-brand-soft text-brand",
  // terminou
  COMPLETED: "bg-success/12 text-success",
  CANCELED: "bg-surface-3 text-muted",
};

/** o próximo passo deste pedido, ou nada quando ele já terminou */
const passo = (p: Pedido) =>
  FINAL_ORDER_STATUSES.includes(p.status) ? null : nextOrderStep(p.status, p.type, p.paymentMethod, p.origin, pagamentoConfirmado(p.payment));

const PAGAMENTO: Record<PaymentMethod, { nome: string; icone: typeof QrCode; cor: string }> = {
  PIX: { nome: "Pix", icone: QrCode, cor: "bg-success/10 text-success" },
  CARD: { nome: "Cartão", icone: CreditCard, cor: "bg-info/10 text-info" },
  CASH: { nome: "Dinheiro", icone: Banknote, cor: "bg-surface-3 text-ink" },
};

type Pedido = {
  id: string;
  number: number;
  customerName: string;
  customerWhatsapp: string | null;
  status: OrderStatus;
  type: OrderType;
  paymentMethod: PaymentMethod;
  origin?: OrderOrigin | null;
  totalCents: number;
  createdAt: Date;
  payment?: { status: PaymentStatus } | null;
};

// genérico porque o aviso para o cliente é montado com o pedido inteiro,
// e a tabela só conhece o pedaço que ela mostra
export function TabelaDePedidos<T extends Pedido>({
  pedidos,
  base,
  action,
  hidden,
  notify,
  relogio,
  detalhe,
}: {
  pedidos: T[];
  base: string;
  action: (formData: FormData) => Promise<void>;
  hidden?: Record<string, string>;
  /** o aviso que vai para o cliente no próximo passo de cada pedido */
  notify: (p: T) => StatusNotice | null;
  /** o contador de tempo; vem de fora porque é componente de navegador */
  relogio: (desde: Date) => React.ReactNode;
  /** o que aparece quando a linha abre: o mesmo resumo do cartão antigo */
  detalhe: (p: T) => React.ReactNode;
}) {
  const cabecalho = "px-4 py-3 text-left text-xs font-extrabold tracking-wide text-muted uppercase";

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <table className="w-full border-collapse">
        <thead className="border-b border-line bg-surface-2/60">
          <tr>
            <th scope="col" className={cabecalho}>Pedido</th>
            <th scope="col" className={cabecalho}>Cliente</th>
            <th scope="col" className={cabecalho}>Pagamento</th>
            <th scope="col" className={cn(cabecalho, "text-right")}>Valor</th>
            <th scope="col" className={cabecalho}>Tempo</th>
            <th scope="col" className={cabecalho}>Status</th>
            <th scope="col" className={cn(cabecalho, "text-right")}>Ações</th>
          </tr>
        </thead>

        <tbody>
          {pedidos.map((p) => {
            const forma = PAGAMENTO[p.paymentMethod];
            const Icone = forma.icone;

            return (
              <LinhaDePedido
                key={p.id}
                colunas={7}
                rotulo={`o pedido #${p.number}`}
                acoes={
                  // Só o passo do dia a dia: aceitar, pronto, saiu para
                  // entrega. Cancelar não entra aqui -- é decisão de parar e
                  // olhar o pedido, não de tocar de passagem numa linha de
                  // tabela, onde o dedo erra de alvo.
                  passo(p) ? (
                    <form action={action}>
                      <input type="hidden" name="orderId" value={p.id} />
                      <input type="hidden" name="from" value={p.status} />
                      <input type="hidden" name="to" value={passo(p)!.to} />
                      {Object.entries(hidden ?? {}).map(([nome, valor]) => (
                        <input key={nome} type="hidden" name={nome} value={valor} />
                      ))}
                      <StepButton label={passo(p)!.label} notify={notify(p)} size="sm" />
                    </form>
                  ) : null
                }
                detalhe={
                  <>
                    {detalhe(p)}
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`${base}/${p.id}`} className={buttonClasses("secondary", "sm")}>
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Abrir o pedido inteiro
                      </Link>
                    </div>
                  </>
                }
              >
                <td className="px-4 py-3 align-middle">
                  <p className="font-extrabold tabular-nums">#{p.number}</p>
                  <p className="text-xs text-muted">
                    {formatTime(p.createdAt)} · {p.type === "DELIVERY" ? "Entrega" : "Retirada"}
                  </p>
                </td>

                <td className="px-4 py-3 align-middle">
                  <p className="max-w-56 truncate font-bold">{p.customerName}</p>
                  {p.customerWhatsapp && <p className="text-xs text-muted">{formatPhone(p.customerWhatsapp)}</p>}
                </td>

                <td className="px-4 py-3 align-middle">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", forma.cor)}>
                    <Icone className="size-3.5" aria-hidden="true" />
                    {forma.nome}
                  </span>
                </td>

                <td className="px-4 py-3 text-right align-middle font-extrabold tabular-nums">
                  {formatCents(p.totalCents)}
                </td>

                <td className="px-4 py-3 align-middle text-sm text-muted">{relogio(p.createdAt)}</td>

                <td className="px-4 py-3 align-middle">
                  <span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-extrabold", COR[p.status])}>
                    {orderStatusLabel[p.status]}
                  </span>
                </td>

              </LinhaDePedido>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
