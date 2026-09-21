import { BookOpen, LayoutDashboard, ReceiptText, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PanelShell } from "@/components/panel/panel-shell";
import { requireRestaurantAccess } from "@/server/auth/dal";

export default async function RestaurantPanelLayout({
  children,
  params,
}: LayoutProps<"/painel/[restaurantId]">) {
  const { restaurantId } = await params;
  const { user, restaurant, viaAdmin } = await requireRestaurantAccess(restaurantId);
  if (user.mustChangePassword) redirect("/conta/senha");

  const base = `/painel/${restaurant.id}`;

  // O admin da plataforma entra com a própria conta. A faixa deixa claro,
  // o tempo todo, que ele está mexendo no restaurante de um cliente.
  const adminBanner = viaAdmin ? (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand/40 bg-brand-soft px-4 py-2.5 text-sm sm:px-6">
      <p className="flex items-center gap-2 font-semibold text-brand">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        Você está gerenciando <strong className="font-extrabold">{restaurant.name}</strong> como administrador.
      </p>
      <Link href={`/admin/restaurantes/${restaurant.id}`} className="font-bold text-ink underline-offset-4 hover:underline">
        Voltar ao admin
      </Link>
    </div>
  ) : null;

  return (
    <PanelShell
      homeHref={base}
      context={restaurant.name}
      userName={user.name}
      banner={adminBanner}
      nav={[
        { href: base, label: "Início", icon: <LayoutDashboard />, exact: true },
        { href: `${base}/pedidos`, label: "Pedidos", icon: <ReceiptText /> },
        { href: `${base}/cardapio`, label: "Cardápio", icon: <BookOpen /> },
        { href: `${base}/restaurante`, label: "Meu restaurante", icon: <Store /> },
      ]}
    >
      {children}
    </PanelShell>
  );
}
