import { BookOpen, Download, Handshake, LayoutDashboard, LifeBuoy, MonitorCheck, ReceiptText, Store, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AbertoFechado, SeloDePedidos } from "@/components/panel/barra-de-baixo";
import { LembraATela } from "@/components/panel/lembra-a-tela";
import { PanelShell } from "@/components/panel/panel-shell";
import { db } from "@/lib/db";
import { noAr } from "@/lib/features";
import { requireDono } from "@/server/auth/dal";
import { pedidosEsperando } from "@/server/stats";

// salvo na tela inicial do celular, o atalho do painel abre no painel
export const metadata: Metadata = { manifest: "/painel/manifest" };

export default async function RestaurantPanelLayout({
  children,
  params,
}: LayoutProps<"/painel/[restaurantId]">) {
  const { restaurantId } = await params;
  const { user, restaurant, viaAdmin } = await requireDono(restaurantId);

  const base = `/painel/${restaurant.id}`;

  // o que a barra do celular mostra: aberto ou fechado no alto, e quantos
  // pedidos esperam por cima do ícone de Pedidos
  const [horario, esperando] = await Promise.all([
    db.restaurant.findUnique({
      where: { id: restaurant.id },
      select: { openMode: true, openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } } },
    }),
    pedidosEsperando(restaurant.id),
  ]);

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
      // o menu com os nomes fica na tela inicial; das outras em diante ele
      // vira ícones e devolve a largura para o trabalho
      menuAberto={base}
      // o salão é o único que usa a tela inteira: ali o mapa e o cardápio
      // disputam cada centímetro
      larga="/salao"
      homeHref={base}
      context={context}
      userName={user.name}
      nav={[
        { href: base, label: "Início", icon: <LayoutDashboard />, exact: true },
        { href: `${base}/pedidos`, label: "Pedidos", icon: <ReceiptText /> },
        // Salão logo abaixo de Pedidos: é a mesma pergunta -- o que está
        // acontecendo agora --, só que nas mesas em vez da entrega
        ...(noAr("salaoEnabled") && restaurant.salaoEnabled ? [{ href: `${base}/salao`, label: "Salão", icon: <UtensilsCrossed /> }] : []),
        { href: `${base}/cardapio`, label: "Cardápio", icon: <BookOpen /> },
        { href: `${base}/restaurante`, label: "Meu restaurante", icon: <Store /> },
        // Totem de autoatendimento: modulo isolado, so para quem o admin liberou
        ...(restaurant.totemEnabled ? [{ href: `${base}/totem`, label: "Totem", icon: <MonitorCheck /> }] : []),
        // "Mercado Pago", e não "Entrega": é ali que o restaurante conecta a
        // conta dele, e era isso que ninguém achava procurando por uma
        // bicicleta
        ...(restaurant.fullDeliveryEnabled ? [{ href: `${base}/entrega`, label: "Mercado Pago", icon: <Handshake /> }] : []),
        // por último, e para todos: é a porta de quando algo não vai bem
        { href: `${base}/suporte`, label: "Suporte", icon: <LifeBuoy /> },
      ]}
      // baixar o programa do balcão é coisa de uma vez só: vira um ícone ao
      // lado do Sair, e não uma seção do mesmo peso que Pedidos. O admin da
      // plataforma pode ter desligado o recurso para este restaurante.
      atalho={
        restaurant.printEnabled
          ? { href: `${base}/menu-facil-pc`, label: "Menu Fácil PC: baixar e parear o computador", icon: <Download /> }
          : undefined
      }
      // no celular, o menu desce: Início, Pedidos e Cardápio ficam fixos
      // embaixo, e o resto vai para "Mais"
      barraDeBaixo={{
        fixos: [base, `${base}/pedidos`, `${base}/cardapio`],
        nome: restaurant.name,
        topo: horario ? <AbertoFechado href={base} openMode={horario.openMode} hours={horario.openingHours} /> : undefined,
        selos: { [`${base}/pedidos`]: <SeloDePedidos restaurantId={restaurant.id} inicial={esperando} /> },
      }}
    >
      {/* anota a seção, para o atalho da tela inicial voltar aqui */}
      <LembraATela />
      {children}
    </PanelShell>
  );
}
