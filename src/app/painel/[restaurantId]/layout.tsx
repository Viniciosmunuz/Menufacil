import { Bike, BookOpen, ClipboardList, Download, Headset, LayoutDashboard, MessageCircle, MonitorCheck, Settings, Store, UtensilsCrossed, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AbertoFechado, EntregaPausada, LedDaIa, SeloDePedidos } from "@/components/panel/barra-de-baixo";
import { ImpressaoDoSalao } from "@/components/panel/impressao-do-salao";
import { LembraATela } from "@/components/panel/lembra-a-tela";
import { PanelShell } from "@/components/panel/panel-shell";
import { db } from "@/lib/db";
import { noAr } from "@/lib/features";
import { isOpenNow, soRetirada } from "@/lib/opening-hours";
import { requireDono } from "@/server/auth/dal";
import { pedidosEsperando } from "@/server/stats";

// os dois grupos do menu lateral
const PRINCIPAL = "Menu principal";
const GESTAO = "Gestão";

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
      select: {
        logoUrl: true,
        openMode: true,
        openingHours: { select: { weekday: true, opensAt: true, closesAt: true, closed: true } },
        atendenteIa: { select: { ativo: true } },
        // a entrega pausada é estado de agora, como o aberto: fica na mesma
        // faixa do alto, em todas as telas do painel
        deliveryEnabled: true,
        pickupOnlyUntil: true,
      },
    }),
    pedidosEsperando(restaurant.id),
  ]);
  // Quem decide se a seção existe é a chave do admin em Recursos. Antes
  // ela dependia do WhatsApp estar conectado, e isso escondia o atendente
  // do cardápio -- que não precisa de WhatsApp nenhum para funcionar.
  const ia = noAr("iaEnabled") && restaurant.iaEnabled ? Boolean(horario?.atendenteIa?.ativo) : null;

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
      larga={["/salao", "/pedidos"]}
      homeHref={base}
      context={context}
      // a foto de perfil do restaurante no lugar do logo do Menu Fácil
      foto={horario?.logoUrl}
      userName={user.name}
      // o cartão no alto do menu: de quem é o painel e se a loja está no ar
      restaurante={{
        nome: restaurant.name,
        status: { label: restaurant.status === "ACTIVE" ? "Ativo" : "Inativo", ok: restaurant.status === "ACTIVE" },
        voltar: viaAdmin ? { href: `/admin/restaurantes/${restaurant.id}`, label: "Voltar ao admin" } : undefined,
      }}
      papel={viaAdmin ? "Administrador MenuFácil" : "Conta do restaurante"}
      // o que existe hoje de "perfil" é a troca de senha
      contaHref="/conta/senha"
      // Dois grupos: o que é o trabalho do dia fica em cima, e o que se
      // acerta de vez em quando fica em Gestão. Os módulos que o admin
      // libera (salão, entregadores, totem) entram no primeiro, porque são
      // movimento, e não cadastro.
      nav={[
        { href: base, label: "Visão geral", icon: <LayoutDashboard />, exact: true, grupo: PRINCIPAL },
        { href: `${base}/pedidos`, label: "Pedidos", icon: <ClipboardList />, grupo: PRINCIPAL },
        // Salão logo abaixo de Pedidos: é a mesma pergunta -- o que está
        // acontecendo agora --, só que nas mesas em vez da entrega
        ...(noAr("salaoEnabled") && restaurant.salaoEnabled ? [{ href: `${base}/salao`, label: "Salão", icon: <UtensilsCrossed />, grupo: PRINCIPAL }] : []),
        // Entregadores logo depois do que acontece agora: quem leva o
        // pedido é assunto do movimento, não do cadastro
        ...(noAr("entregadorEnabled") && restaurant.entregadorEnabled
          ? [{ href: `${base}/entregadores`, label: "Entregadores", icon: <Bike />, grupo: PRINCIPAL }]
          : []),
        { href: `${base}/cardapio`, label: "Cardápio digital", icon: <BookOpen />, grupo: PRINCIPAL },
        { href: `${base}/restaurante`, label: "Meu restaurante", icon: <Store />, grupo: PRINCIPAL },
        // Totem de autoatendimento: modulo isolado, so para quem o admin liberou
        ...(restaurant.totemEnabled ? [{ href: `${base}/totem`, label: "Totem", icon: <MonitorCheck />, grupo: PRINCIPAL }] : []),
        // "Pagamentos": é ali que o restaurante conecta a conta do Mercado
        // Pago. Já se chamou "Entrega" e "Mercado Pago"; ninguém achava
        // procurando por uma bicicleta, e o nome do banco não diz o assunto.
        ...(restaurant.fullDeliveryEnabled ? [{ href: `${base}/entrega`, label: "Pagamentos", icon: <Wallet />, grupo: GESTAO }] : []),
        // "WhatsApp IA", e não um robô: o dono procura pelo lugar onde a
        // Lia atende, que é o WhatsApp dele
        ...(ia !== null ? [{ href: `${base}/ia`, label: "WhatsApp IA", icon: <MessageCircle />, grupo: GESTAO }] : []),
        { href: `${base}/configuracoes`, label: "Configurações", icon: <Settings />, grupo: GESTAO },
        // por último, e para todos: é a porta de quando algo não vai bem
        { href: `${base}/suporte`, label: "Central de suporte", curto: "Suporte", icon: <Headset />, grupo: GESTAO },
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
        topo: horario ? (
          <span className="flex shrink-0 items-center gap-2">
            {ia === true && isOpenNow(horario.openMode, horario.openingHours) && <LedDaIa href={`${base}/ia`} ligada />}
            {horario.deliveryEnabled && soRetirada(horario.pickupOnlyUntil) && horario.pickupOnlyUntil && (
              <EntregaPausada href={base} ate={horario.pickupOnlyUntil} />
            )}
            <AbertoFechado href={base} openMode={horario.openMode} hours={horario.openingHours} />
          </span>
        ) : undefined,
        selos: { [`${base}/pedidos`]: <SeloDePedidos restaurantId={restaurant.id} inicial={esperando} /> },
      }}
    >
      {/* anota a seção, para o atalho da tela inicial voltar aqui */}
      <LembraATela />
      {/* o admin vendo o painel de um restaurante não vira impressora dele:
          a comanda do salão sairia na casa errada */}
      {!viaAdmin && noAr("salaoEnabled") && restaurant.salaoEnabled && <ImpressaoDoSalao restaurantId={restaurant.id} />}
      {children}
    </PanelShell>
  );
}
