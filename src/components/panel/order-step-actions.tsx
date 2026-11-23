import { ConfirmButton } from "@/components/ui/confirm-button";
import type { OrderOrigin, OrderStatus, OrderType, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import { confirmacaoDoPasso, FINAL_ORDER_STATUSES, nextOrderStep, pagamentoConfirmado } from "@/lib/order-flow";

import { StepButton, type StatusNotice } from "./step-button";

// Botão do próximo passo do atendimento e "Cancelar pedido". O "from" leva
// o status que a tela mostrava: se outra pessoa mudou antes, nada acontece.

export function OrderStepActions({
  order,
  action,
  hidden,
  size = "sm",
  notify,
  lojaFechada,
}: {
  // a origem manda no caminho: o pedido do 100% Delivery tem passo a mais
  // (recebido, em preparo) porque o cliente acompanha cada um deles
  // o pagamento decide o nome do botão no Pix: confirmado pelo Mercado
  // Pago, o que falta é aceitar o pedido, não confirmar o dinheiro
  order: {
    id: string;
    status: OrderStatus;
    type: OrderType;
    paymentMethod: PaymentMethod;
    origin?: OrderOrigin | null;
    payment?: { status: PaymentStatus } | null;
  };
  action: (formData: FormData) => Promise<void>;
  hidden?: Record<string, string>;
  size?: "sm" | "md";
  /** aviso pronto para o cliente, aberto junto com a mudança de status */
  notify?: StatusNotice | null;
  /**
   * A loja está fechada agora.
   *
   * Com ela fechada e pedido ainda em preparo, o dono está acertando o
   * status fora do movimento -- às vezes de um pedido de horas antes. O
   * passo que fala com o cliente passa a pedir confirmação, porque um
   * "saiu para entrega" naquela hora assusta quem já recebeu. A mensagem
   * continua saindo: o que muda é que ele diz sim antes.
   */
  lojaFechada?: boolean;
}) {
  if (FINAL_ORDER_STATUSES.includes(order.status)) return null;
  const step = nextOrderStep(order.status, order.type, order.paymentMethod, order.origin, pagamentoConfirmado(order.payment));
  const confirmar = step ? confirmacaoDoPasso(lojaFechada, step.to, order.type) : null;

  const fields = (to: OrderStatus) => (
    <>
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="from" value={order.status} />
      <input type="hidden" name="to" value={to} />
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );

  return (
    // No celular os dois ficam lado a lado, cada um na metade da linha: um
    // embaixo do outro empurrava o resto do pedido para fora da tela, e o
    // balcão rola para achar o botão que usa o tempo todo. Da largura de
    // tablet em diante voltam a ter o tamanho do próprio texto.
    //
    // Quando o cancelar pede confirmação ele passa a ocupar a linha inteira
    // (é aí que nasce o <span> com os dois botões), senão "Sim, cancelar
    // pedido" não caberia em meia tela -- botão aqui não quebra linha.
    <div className="grid grid-cols-2 items-start gap-2 [&>form>button]:w-full sm:flex sm:flex-wrap sm:items-center sm:[&>form>button]:w-auto">
      {step && (
        <form action={action} className="has-[span]:col-span-2 sm:col-auto">
          {fields(step.to)}
          <StepButton label={step.label} notify={notify} size={size} confirmar={confirmar} />
        </form>
      )}
      <form action={action} className={step ? "has-[span]:col-span-2 sm:col-auto" : "col-span-2 sm:col-auto"}>
        {fields("CANCELED")}
        <ConfirmButton size={size} confirmText="Sim, cancelar pedido" cancelText="Voltar">
          Cancelar pedido
        </ConfirmButton>
      </form>
    </div>
  );
}
