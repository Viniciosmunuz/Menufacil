import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { OrderStatus, OrderType, PaymentMethod } from "@/generated/prisma/enums";
import { FINAL_ORDER_STATUSES, nextOrderStep } from "@/lib/order-flow";

// Botão do próximo passo do atendimento e "Cancelar pedido". O "from" leva
// o status que a tela mostrava: se outra pessoa mudou antes, nada acontece.

export function OrderStepActions({
  order,
  action,
  hidden,
  size = "sm",
}: {
  order: { id: string; status: OrderStatus; type: OrderType; paymentMethod: PaymentMethod };
  action: (formData: FormData) => Promise<void>;
  hidden?: Record<string, string>;
  size?: "sm" | "md";
}) {
  if (FINAL_ORDER_STATUSES.includes(order.status)) return null;
  const step = nextOrderStep(order.status, order.type, order.paymentMethod);

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
    <div className="flex flex-wrap items-center gap-2">
      {step && (
        <form action={action}>
          {fields(step.to)}
          <SubmitButton size={size} pendingText="Salvando...">
            {step.label}
          </SubmitButton>
        </form>
      )}
      <form action={action}>
        {fields("CANCELED")}
        <ConfirmButton size={size} confirmText="Sim, cancelar pedido" cancelText="Voltar">
          Cancelar pedido
        </ConfirmButton>
      </form>
    </div>
  );
}
