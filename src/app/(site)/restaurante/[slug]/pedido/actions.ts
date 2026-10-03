"use server";

import { redirect } from "next/navigation";

import { fieldErrors, formObject, type FieldErrors } from "@/lib/validation";
import { OrderError, checkoutSchema, parseItems, placeOrder } from "@/server/orders/place-order";
import { agendarAvisoDePedido } from "@/server/push/agendar";
import { scheduleWhatsAppDelivery } from "@/server/whatsapp/service";

export type CheckoutState = {
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

// Endpoint público: qualquer pessoa pode chamar. Por isso o place-order
// confere tudo de novo com o banco e limita pedidos seguidos.
export async function submitOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const values = formObject(formData);
  delete values.items;

  // campo invisível: pessoa não preenche, robô costuma preencher
  if (values.website) return { error: "Não foi possível enviar o pedido. Atualize a página e tente de novo.", values };

  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  let code: string;
  try {
    const items = parseItems(formData.get("items"));
    const order = await placeOrder({ slug: String(formData.get("slug") ?? ""), input: parsed.data, items });
    scheduleWhatsAppDelivery(order.id);
    // apita no celular do restaurante mesmo com o painel fechado.
    //
    // No 100% Delivery, o pedido que está esperando o Pix não apita: quem
    // apita é a confirmação do Mercado Pago (ver o webhook). Avisar aqui
    // faria o celular do balcão tocar a cada carrinho abandonado.
    const esperandoPagamento = order.origin === "FULL_DELIVERY" && order.status === "AWAITING_PAYMENT";
    if (!esperandoPagamento) agendarAvisoDePedido(order);
    code = order.code;
  } catch (error) {
    if (error instanceof OrderError) {
      return error.field ? { fieldErrors: { [error.field]: error.message }, values } : { error: error.message, values };
    }
    throw error;
  }
  redirect(`/pedido/${code}?novo=1`);
}
