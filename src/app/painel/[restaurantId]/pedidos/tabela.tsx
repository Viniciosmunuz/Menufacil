import { Banknote, Bike, CreditCard, ExternalLink, QrCode } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

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
  // na rua, com o entregador: verde, como no cartão do celular
  OUT_FOR_DELIVERY: "bg-success/12 text-success",
  // terminou
  COMPLETED: "bg-success/12 text-success",
  CANCELED: "bg-surface-3 text-muted",
};

/** saiu do restaurante: o que falta é o entregador chegar */
const emRota = (p?: { status: OrderStatus }) => p?.status === "OUT_FOR_DELIVERY";

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
          {pedidos.map((p, i) => {
            const forma = PAGAMENTO[p.paymentMethod];
            const Icone = forma.icone;

            return (
              <Fragment key={p.id}>
                {/* A mesma divisória dos cartões do celular: em cima o que a
                    cozinha e o balcão têm de fazer, embaixo o que só espera o
                    entregador chegar. Sem ela, quem olha a tabela às 20h lê o
                    selo de linha em linha para saber qual é qual. */}
                {emRota(p) && !emRota(pedidos[i - 1]) && (
                  <tr>
                    <td colSpan={7} className="px-4 pt-5 pb-2">
                      <p className="flex items-center gap-3 text-xs font-bold tracking-widest text-faint uppercase">
                        <span className="h-px flex-1 bg-line" />
                        <span className="flex items-center gap-1.5 text-success">
                          <Bike className="size-4" aria-hidden="true" />
                          em rota
                        </span>
                        <span className="h-px flex-1 bg-line" />
                      </p>
                    </td>
                  </tr>
                )}
                <LinhaDePedido
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
                    {/* a motinha verde é o que se procura na lista cheia: diz
                        "este já está na rua" antes de ler o nome do status */}
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold", COR[p.status])}>
                      {emRota(p) && <Bike className="size-3.5" aria-hidden="true" />}
                      {orderStatusLabel[p.status]}
                    </span>
                  </td>

                </LinhaDePedido>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
