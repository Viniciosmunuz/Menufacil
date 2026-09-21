import { LayoutDashboard, MessageSquareText, ReceiptText, Store, Tags } from "lucide-react";

import { PanelShell } from "@/components/panel/panel-shell";
import { requireAdmin } from "@/server/auth/dal";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();

  return (
    <PanelShell
      homeHref="/admin"
      context="Administração da plataforma"
      userName={user.name}
      nav={[
        { href: "/admin", label: "Visão geral", icon: <LayoutDashboard />, exact: true },
        { href: "/admin/restaurantes", label: "Restaurantes", icon: <Store /> },
        { href: "/admin/pedidos", label: "Pedidos", icon: <ReceiptText /> },
        { href: "/admin/categorias", label: "Categorias", icon: <Tags /> },
        { href: "/admin/contatos", label: "Contatos", icon: <MessageSquareText /> },
      ]}
    >
      {children}
    </PanelShell>
  );
}
