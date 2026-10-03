import { BookOpen, Bike, LayoutDashboard, MonitorCheck, ReceiptText, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CloudPrinterIcon } from "@/components/panel/cloud-printer-icon";
import { PanelShell } from "@/components/panel/panel-shell";
import { requireRestaurantAccess } from "@/server/auth/dal";

// salvo na tela inicial do celular, o atalho do painel abre no painel
export const metadata: Metadata = { manifest: "/painel/manifest" };

export default async function RestaurantPanelLayout({
  children,
  params,
}: LayoutProps<"/painel/[restaurantId]">) {
  const { restaurantId } = await params;
  const { user, restaurant, viaAdmin } = await requireRestaurantAccess(restaurantId);

  const base = `/painel/${restaurant.id}`;

  // o admin entra com a própria conta: só um link discreto de volta, ao lado do nome
  const context = viaAdmin ? (
    <span className="flex flex-wrap items-center gap-x-2">
      {restaurant.name}
      <Link href={`/admin/restaurantes/${restaurant.id}`} className="font-bold text-brand underline-offset-4 hover:underline">
        · Voltar ao admin
      </Link>
    </span>
  ) : (
    restaurant.name
  );

  return (
    <PanelShell
      homeHref={base}
      context={context}
      userName={user.name}
      nav={[
        { href: base, label: "Início", icon: <LayoutDashboard />, exact: true },
        { href: `${base}/pedidos`, label: "Pedidos", icon: <ReceiptText /> },
        { href: `${base}/cardapio`, label: "Cardápio", icon: <BookOpen /> },
        { href: `${base}/restaurante`, label: "Meu restaurante", icon: <Store /> },
        // o admin da plataforma pode ter desligado o recurso para este restaurante
        ...(restaurant.printEnabled
          ? [{ href: `${base}/menu-facil-pc`, label: "Menu Fácil PC", icon: <CloudPrinterIcon /> }]
          : []),
        // Totem de autoatendimento: modulo isolado, so para quem o admin liberou
        ...(restaurant.totemEnabled ? [{ href: `${base}/totem`, label: "Totem", icon: <MonitorCheck /> }] : []),
        // 100% Delivery: idem. Quem nao tem o recurso liberado nao ve a
        // secao nem sabe que ela existe
        ...(restaurant.fullDeliveryEnabled ? [{ href: `${base}/entrega`, label: "Entrega", icon: <Bike /> }] : []),
      ]}
    >
      {children}
    </PanelShell>
  );
}
