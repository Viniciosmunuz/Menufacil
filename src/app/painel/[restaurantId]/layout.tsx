import { BookOpen, LayoutDashboard, ReceiptText, Store } from "lucide-react";
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
        { href: `${base}/print-facil`, label: "Print Fácil", icon: <CloudPrinterIcon /> },
      ]}
    >
      {children}
    </PanelShell>
  );
}
