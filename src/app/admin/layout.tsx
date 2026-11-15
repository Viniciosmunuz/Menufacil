import { LayoutDashboard, MessageSquareText, ReceiptText, Sparkles, Store } from "lucide-react";

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
        { href: "/admin/contatos", label: "Contatos", icon: <MessageSquareText /> },
        // o que a IA dos restaurantes já gastou na Anthropic
        { href: "/admin/anthropic", label: "Anthropic", icon: <Sparkles /> },
      ]}
      // no celular, o mesmo jeito do painel do dono: o dia a dia fica
      // embaixo, e Contatos vai para "Mais"
      barraDeBaixo={{ fixos: ["/admin", "/admin/restaurantes", "/admin/pedidos"], nome: "Administração" }}
    >
      {children}
    </PanelShell>
  );
}
