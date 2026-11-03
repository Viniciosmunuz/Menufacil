import { ArrowLeft, Banknote, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { formatCents, formatPhone, formatTime } from "@/lib/format";
import { paymentHint, paymentText } from "@/lib/payment";
import { requireEntregador } from "@/server/auth/dal";
import { enderecoEmLinha, linkDaRota, pedidoDoEntregador } from "@/server/entregadores/entregas";

import { MandaPosicao } from "../../posicao";
import { Assumir, NaMinhaMao } from "./acoes";

export const metadata: Metadata = { title: "Pedido" };

// O pedido na mão do entregador.
//
// A ordem é a da rua: para onde vou, com quem falo, o que estou levando e
// quanto recebo. Os itens vêm depois do endereço de propósito -- ele já
// pegou a sacola; o que ele precisa agora é chegar.

export default async function PedidoDoEntregadorPage({ params }: PageProps<"/entregador/[restaurantId]/pedido/[orderId]">) {
  const { restaurantId, orderId } = await params;
  const { entregador, restaurant } = await requireEntregador();
  if (restaurantId !== restaurant.id) notFound();
  const base = `/entregador/${restaurant.id}`;

  const pedido = await pedidoDoEntregador(restaurant.id, entregador.id, orderId);
  if (!pedido) notFound();

  const endereco = enderecoEmLinha(pedido);
  const meu = pedido.entregadorId === entregador.id;
  const escolha = {
    method: pedido.paymentMethod,
    cardType: pedido.payment?.cardType,
    changeForCents: pedido.payment?.changeForCents,
    status: pedido.payment?.status,
  };
  const aviso = paymentHint(escolha, "DELIVERY", pedido.totalCents, null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-4 pt-5 pb-8">
      <MandaPosicao ativo={meu} />

      <div className="flex items-center justify-between gap-3">
        <Link href={base} className="flex items-center gap-1.5 text-sm font-bold text-muted">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar
        </Link>
        {meu ? <Badge tone="info">Com você</Badge> : <Badge tone="warning">Livre</Badge>}
      </div>

      <h1 className="text-2xl font-extrabold tabular-nums">
        Pedido #{pedido.number}
        <span className="ml-2 text-sm font-semibold text-muted">das {formatTime(pedido.createdAt)}</span>
      </h1>

      {/* Para onde vou: primeiro, e com o botão que abre o mapa do celular.
          Não se desenha mapa aqui -- o Google Maps dele já tem a voz, o
          trânsito e os atalhos que ele conhece. */}
      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <p className="flex items-start gap-2 font-bold">
          <MapPin className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
          <span>
            {endereco || "sem endereço no pedido"}
            {pedido.deliveryComplement && <span className="block font-semibold text-muted">{pedido.deliveryComplement}</span>}
            {pedido.deliveryReference && <span className="block font-semibold text-muted">Ref.: {pedido.deliveryReference}</span>}
          </span>
        </p>
        {endereco && (
          <a
            href={linkDaRota(endereco, pedido.restaurant.city)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("primary", "lg")}
          >
            <Navigation className="size-5" aria-hidden="true" />
            Abrir a rota no mapa
          </a>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <p className="font-bold">{pedido.customerName}</p>
        {pedido.customerWhatsapp ? (
          <div className="flex flex-wrap gap-2">
            <a href={`tel:+${pedido.customerWhatsapp}`} className={buttonClasses("secondary", "md")}>
              <Phone className="size-4" aria-hidden="true" />
              {formatPhone(pedido.customerWhatsapp)}
            </a>
            <a
              href={`https://wa.me/${pedido.customerWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("ghost", "md")}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted">Este pedido não tem telefone.</p>
        )}
      </section>

      {/* O dinheiro é o que dá problema na porta: destacado, com o troco. */}
      <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-bold">
            <Banknote className="size-5 text-muted" aria-hidden="true" />
            {paymentText(escolha)}
          </span>
          <span className="text-xl font-extrabold tabular-nums">{formatCents(pedido.totalCents)}</span>
        </div>
        {aviso && <p className="font-bold text-brand">{aviso}</p>}
        {pedido.deliveryFeeCents > 0 && (
          <p className="text-sm text-muted">
            Sendo {formatCents(pedido.subtotalCents)} do pedido e {formatCents(pedido.deliveryFeeCents)} de entrega.
          </p>
        )}
      </section>

      {/* Os botões antes dos itens: quem abre esta tela na porta do
          cliente veio confirmar, não conferir a sacola de novo. */}
      {meu ? <NaMinhaMao orderId={pedido.id} /> : <Assumir orderId={pedido.id} />}

      <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
        <h2 className="text-sm font-extrabold tracking-wide text-muted uppercase">O que você está levando</h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {pedido.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="font-bold">{i.quantity}x</span> {i.productName}
                {i.optionsText && <span className="block text-brand">{i.optionsText}</span>}
                {i.notes && <span className="block text-muted">Obs.: {i.notes}</span>}
              </span>
              <span className="shrink-0 tabular-nums">{formatCents(i.totalCents)}</span>
            </li>
          ))}
        </ul>
        {pedido.notes && <p className="border-t border-line pt-2 text-sm text-muted">Observação do cliente: {pedido.notes}</p>}
      </section>
    </main>
  );
}
