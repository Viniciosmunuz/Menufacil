import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { deliveryTimeLabel } from "@/components/public/restaurant-card";
import { getPublicRestaurant } from "@/server/public/restaurants";

import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

export default async function CheckoutPage({ params }: PageProps<"/restaurante/[slug]/pedido">) {
  const { slug } = await params;
  const data = await getPublicRestaurant(slug, false);
  if (!data) notFound();
  const { restaurant: r, open } = data;

  const address = [r.street && `${r.street}${r.number ? `, ${r.number}` : ""}`, r.neighborhood].filter(Boolean).join(" - ") || null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: `/restaurante/${r.slug}`, label: r.name }} title="Finalizar pedido" />
      <CheckoutForm
        restaurant={{
          id: r.id,
          slug: r.slug,
          name: r.name,
          deliveryEnabled: r.deliveryEnabled,
          pickupEnabled: r.pickupEnabled,
          deliveryFeeCents: r.deliveryFeeCents,
          minOrderCents: r.minOrderCents,
          deliveryTime: deliveryTimeLabel(r.deliveryTimeMin, r.deliveryTimeMax),
          address,
          open,
        }}
      />
    </div>
  );
}
