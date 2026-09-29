import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isOpenNow } from "@/lib/opening-hours";
import { getPublicRestaurant } from "@/server/public/restaurants";

import { TotemCheckout } from "./checkout";

// Fechar o pedido no totem.
//
// Mesmo lugar do fluxo em que o cliente do link vai dar o endereço -- só
// que no balcão as perguntas são outras: comer aqui ou levar, e como
// pagar. Endereço, taxa de entrega e troco não existem aqui.

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false, follow: false } };

export default async function TotemCheckoutPage({ params }: PageProps<"/totem/[slug]/pedido">) {
  const { slug } = await params;
  const dados = await getPublicRestaurant(slug, false);
  if (!dados) notFound();

  const r = dados.restaurant;
  if (!r.totemEnabled) notFound();

  return (
    <TotemCheckout
      restaurant={{ id: r.id, slug: r.slug, name: r.name }}
      minOrderCents={r.minOrderCents}
      aberto={isOpenNow(r.openMode, r.openingHours)}
    />
  );
}
