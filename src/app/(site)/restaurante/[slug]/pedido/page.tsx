import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/panel/page-header";
import { deliveryTimeLabel } from "@/components/public/restaurant-card";
import { soRetirada } from "@/lib/opening-hours";
import { formatPixKey } from "@/lib/pix";
import { prontoParaCobrar } from "@/server/pagamentos/conta";
import { getPublicRestaurant } from "@/server/public/restaurants";

import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

export default async function CheckoutPage({ params }: PageProps<"/restaurante/[slug]/pedido">) {
  const { slug } = await params;
  const data = await getPublicRestaurant(slug, false);
  if (!data) notFound();
  const { restaurant: r, open } = data;

  // 100% Delivery: o Pix é cobrado na conta do restaurante pelo Mercado
  // Pago, aqui mesmo. Sem conta ligada não há Pix para oferecer -- e nem
  // chave para mostrar, porque neste modo não existe comprovante por fora.
  const cemPorCento = r.fullDeliveryEnabled && r.deliveryMode === "FULL_DELIVERY";
  const pixOnline = cemPorCento && (await prontoParaCobrar(r.id));

  const address = [r.street && `${r.street}${r.number ? `, ${r.number}` : ""}`, r.neighborhood].filter(Boolean).join(" - ") || null;
  // cardápio atual (só o que dá para pedir): o checkout confere o carrinho antes de enviar
  const menu = Object.fromEntries(
    r.menuCategories.flatMap((c) => c.products.filter((p) => p.available).map((p) => [p.id, p.optionGroups] as const)),
  );

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
          soRetirada: soRetirada(r.pickupOnlyUntil),
          deliveryFeeCents: r.deliveryFeeCents,
          minOrderCents: r.minOrderCents,
          deliveryTime: deliveryTimeLabel(r.deliveryTimeMin, r.deliveryTimeMax),
          address,
          open,
          payments: { pix: cemPorCento ? pixOnline : !!r.pixKey, card: r.acceptsCard, cash: r.acceptsCash },
          fullDelivery: cemPorCento,
          pixOnline,
          pix: !cemPorCento && r.pixKey ? { key: r.pixKey, display: formatPixKey(r.pixKeyType, r.pixKey), holder: r.pixHolderName } : null,
          menu,
        }}
      />
    </div>
  );
}
