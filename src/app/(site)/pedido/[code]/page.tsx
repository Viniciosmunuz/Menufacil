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
import { fullDeliverySteps } from "@/lib/order-flow";
import { paymentText } from "@/lib/payment";
import { formatPixKey, pixKeyTypeLabel } from "@/lib/pix";
import { conversaDoPedido } from "@/server/chat/chat";
import { pixDoPedido } from "@/server/pagamentos/pix";
import { orderFromCustomer, waAppLink, waMeLink } from "@/server/whatsapp/messages";

import { gerarOutroPix, markPaymentSent } from "./actions";
import { PedidoAoVivo } from "./ao-vivo";
import { ChatDoCliente } from "./chat-cliente";
import { ClearCartAfterOrder, OpenWhatsAppOnce, PixActions, RememberOrder, SendOrderCta } from "./order-live";
import { PixCard, PixPago } from "./pix-card";

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false, follow: false } };

const FINAL: OrderStatus[] = ["COMPLETED", "CANCELED"];

function steps(type: "DELIVERY" | "PICKUP", pix: boolean): { status: OrderStatus[]; label: string }[] {
  return [
    { status: ["NEW", "AWAITING_PAYMENT"], label: "Pedido recebido" },
    // cartão e dinheiro: sem etapa de pagamento antes, ele acontece na entrega
    ...(pix
      ? [
          { status: ["PAYMENT_SENT"] as OrderStatus[], label: "Pagamento enviado" },
          { status: ["CONFIRMED"] as OrderStatus[], label: "Pagamento confirmado" },
        ]
      : [{ status: ["CONFIRMED"] as OrderStatus[], label: "Pedido aceito" }]),
    // o preparo acontece entre um passo e outro: o cliente acompanha o que
    // muda para ele, que é o pedido sair ou ficar pronto para buscar
    type === "DELIVERY"
      ? { status: ["PREPARING", "READY", "OUT_FOR_DELIVERY"], label: "Saiu para entrega" }
      : { status: ["PREPARING", "READY"], label: "Pronto para retirar" },
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
  const pix = order.paymentMethod === "PIX";
  // 100% Delivery: o pedido se resolve inteiro aqui dentro. Nada de WhatsApp
  // no caminho, o Pix é cobrado pelo Mercado Pago e a tela se atualiza
  // sozinha a cada passo do balcão.
  const cemPorCento = order.origin === "FULL_DELIVERY";
  const canceled = order.status === "CANCELED";
  const flow = cemPorCento ? fullDeliverySteps(order.type, !pix) : steps(order.type, pix);
  const currentIndex = flow.findIndex((s) => s.status.includes(order.status));
  // o Pix da chave copiada é do fluxo do WhatsApp; no 100% Delivery não há
  // chave nenhuma na tela
  const showPix = pix && !cemPorCento && !canceled && !!pay?.pixKey && (pay.status === "PENDING" || pay.status === "PROOF_SENT");
  const payOnReceive = !pix && !canceled && !FINAL.includes(order.status);

  // o QR nasce (ou volta) aqui: a função devolve o mesmo código enquanto ele
  // vale, então recarregar a página não cobra duas vezes
  const esperandoPix = cemPorCento && pix && !canceled && order.status === "AWAITING_PAYMENT" && pay?.status !== "CONFIRMED";
  const pixDaVez = esperandoPix ? await pixDoPedido(order.id) : null;
  const pixPago = cemPorCento && pix && pay?.status === "CONFIRMED";

  // a conversa só existe no 100% Delivery, e some com o pedido encerrado
  const conversa = cemPorCento ? await conversaDoPedido(order.id) : null;
  const choice = { method: order.paymentMethod, cardType: pay?.cardType, changeForCents: pay?.changeForCents };
  const reachedAt = (status: OrderStatus[]) => order.statusEvents.find((e) => status.includes(e.status))?.createdAt;

  const proofText = encodeURIComponent(`Olá! Segue o comprovante do Pix do pedido #${order.number} (${formatCents(order.totalCents)}).`);
  const whatsappLink = r.whatsapp ? `https://wa.me/${r.whatsapp}?text=${proofText}` : null;
  // o pedido chega ao restaurante pelo WhatsApp do próprio cliente, já escrito
  const orderText = orderFromCustomer(order, r);
  const sendOrderLink = r.whatsapp ? waMeLink(r.whatsapp, orderText) : null;
  const sendOrderAppLink = r.whatsapp ? waAppLink(r.whatsapp, orderText) : null;
  // conversa sem texto: quem já enviou o pedido não manda de novo sem querer
  const chatLink = r.whatsapp ? `https://wa.me/${r.whatsapp}` : null;
  const justPlaced = !cemPorCento && sp.novo === "1" && !!sendOrderLink && !!sendOrderAppLink && (showPix || payOnReceive);
  // o restaurante mexeu no pedido pelo painel: prova de que a mensagem chegou
  const accepted = !["NEW", "AWAITING_PAYMENT", "PAYMENT_SENT"].includes(order.status);
  // enquanto o pedido está em pé, a pessoa vê em que pé está o envio
  const showSendCta = !cemPorCento && !canceled && !!sendOrderLink && !FINAL.includes(order.status);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      {sp.novo === "1" && <ClearCartAfterOrder restaurantId={r.id} />}
      <RememberOrder
        code={order.code}
        number={order.number}
        restaurantName={r.name}
        restaurantSlug={r.slug}
        createdAt={order.createdAt.toISOString()}
      />
      {/* no 100% Delivery a tela tem canal próprio: ele traz o pagamento, o
          passo do balcão e a resposta da conversa. Nos outros, continua o
          recarregamento de tempos em tempos, como sempre foi */}
      {!FINAL.includes(order.status) &&
        (cemPorCento ? <PedidoAoVivo code={order.code} esperandoPagamento={!!esperandoPix} /> : <AutoRefresh />)}

      {/* Esperando o Pix, a primeira coisa da tela é o QR.
          Ele estava embaixo do cartão de "pedido criado", que no celular
          toma a tela inteira -- a pessoa abria e tinha de rolar para achar o
          que ela foi ali fazer. E o certinho verde grande dizendo "criado!"
          antes de alguém pagar ensinava justamente o contrário do que
          precisa acontecer. */}
      {pixDaVez?.ok && pay && (
        <PixCard
          code={order.code}
          totalCents={pixDaVez.pix.totalCents}
          copiaECola={pixDaVez.pix.copiaECola}
          qrBase64={pixDaVez.pix.qrBase64}
          venceEm={pixDaVez.pix.venceEm?.toISOString() ?? null}
          gerarOutro={gerarOutroPix}
        />
      )}

      {/* o Mercado Pago recusou, ou o restaurante desligou a conta no meio do
          caminho: o cliente precisa saber o que fazer, não ficar olhando uma
          tela sem botão */}
      {esperandoPix && pixDaVez && !pixDaVez.ok && (
        <Card className="flex flex-col gap-3 border-danger/50">
          <h2 className="text-xl font-extrabold">Não consegui gerar o Pix</h2>
          <p className="text-muted">{pixDaVez.erro}</p>
          {r.whatsapp && (
            <a
              href={`https://wa.me/${r.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-brand underline-offset-4 hover:underline"
            >
              Falar com o restaurante no WhatsApp
            </a>
          )}
        </Card>
      )}

      <Card className="flex flex-col gap-2 text-center">
        {/* o certinho verde é a comemoração de "deu certo"; enquanto o
            pagamento não entrou, não há o que comemorar */}
        {canceled ? (
          <CircleX className="mx-auto size-12 text-danger" aria-hidden="true" />
        ) : esperandoPix ? null : (
          <CircleCheck className="mx-auto size-12 text-success" aria-hidden="true" />
        )}
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          {sp.novo === "1" && !esperandoPix ? `Pedido #${order.number} criado!` : `Pedido #${order.number}`}
        </h1>
        {justPlaced && sendOrderAppLink && sendOrderLink && <OpenWhatsAppOnce code={order.code} appUrl={sendOrderAppLink} webUrl={sendOrderLink} />}
        {(sp.novo === "1" || esperandoPix) && (
          <p className="text-muted">
            {esperandoPix
              ? "Assim que o pagamento cair, o restaurante recebe e esta página avisa sozinha."
              : "O restaurante já recebeu. Acompanhe por esta página — ela se atualiza sozinha a cada passo."}
          </p>
        )}
        {showSendCta && sendOrderLink && (
          <SendOrderCta code={order.code} url={sendOrderLink} chatUrl={chatLink ?? sendOrderLink} accepted={accepted} pixNote={showPix} />
        )}
        {sp.novo === "1" && !esperandoPix && (
          <Link href={`/restaurante/${r.slug}`} className="text-sm font-bold text-muted hover:text-ink">
            Voltar para o início
          </Link>
        )}
        <p className="text-muted">
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

      {payOnReceive && (
        <Card className="flex flex-col gap-4 border-brand/50">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold">{order.type === "DELIVERY" ? "Pagamento na entrega" : "Pagamento na retirada"}</h2>
            <p className="text-2xl font-extrabold text-brand tabular-nums">{formatCents(order.totalCents)}</p>
          </div>
          <div className="rounded-control border border-line bg-surface-2 p-4">
            <p className="text-lg font-bold">{paymentText(choice)}</p>
            <p className="mt-1 text-sm text-muted">
              {order.paymentMethod === "CARD"
                ? order.type === "DELIVERY"
                  ? "O entregador leva a maquininha."
                  : "Pague no balcão, ao buscar."
                : pay?.changeForCents
                  ? `Seu troco: ${formatCents(pay.changeForCents - order.totalCents)}.`
                  : "Sem troco."}
            </p>
          </div>
        </Card>
      )}

      {pixPago && pay && <PixPago totalCents={pay.amountCents} />}

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
            {sendOrderLink && !justPlaced ? (
              <PixActions code={order.code} pixKey={pay.pixKey!} whatsappUrl={sendOrderLink} className="mt-4 w-full" />
            ) : (
              <CopyButton text={pay.pixKey!} label="Copiar chave Pix" copiedLabel="Chave copiada!" variant="primary" size="lg" className="mt-4 w-full" />
            )}
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
        <h2 className="text-lg font-extrabold">Andamento</h2>
        {/* é por esta página que o cliente segue o pedido: o restaurante só
            manda mensagem quando sai para entrega */}
        <p className="mb-4 text-sm text-muted">
          {cemPorCento
            ? "Cada passo do restaurante aparece aqui na hora, sem você fazer nada. Pode deixar a página aberta ou voltar pelo link quando quiser."
            : "Esta página é onde você acompanha o seu pedido. Ela se atualiza sozinha — pode deixar aberta ou voltar pelo link quando quiser."}
        </p>
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

      {/* a conversa não ocupa lugar na página: ela vive no botão Chat da
          barra de baixo e abre como folha por cima (ver ChatDoCliente) */}
      {conversa && (
        <ChatDoCliente
          code={order.code}
          restaurante={r.name}
          numero={order.number}
          mensagens={conversa.mensagens.map((m) => ({ ...m, em: m.em.toISOString() }))}
          naoLidas={conversa.naoLidasDoCliente}
          fechada={FINAL.includes(order.status)}
        />
      )}

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">Resumo</h2>
        <ul className="flex flex-col gap-2">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>
                <span className="font-bold">{i.quantity}x</span> {i.productName}
                {i.optionsText && <span className="block text-sm text-ink/80">{i.optionsText}</span>}
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

      <p className="text-center text-sm text-faint">
        {cemPorCento
          ? "Guarde este link: é por ele que você acompanha o pedido e fala com o restaurante."
          : "Guarde este link para acompanhar o pedido. Ele atualiza sozinho."}
      </p>
    </div>
  );
}
