"use client";

import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Logo, LogoIcon } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { logout } from "@/server/auth/actions";

import { BarraDeBaixo } from "./barra-de-baixo";
import { SidebarNav, TabsNav, type NavItem } from "./nav-link";

// Casca dos dois painéis (admin e restaurante): menu lateral no
// computador, cabeçalho com abas no celular.
//
// Em algumas telas o menu encolhe para só os ícones e o conteúdo perde o
// limite de largura. É o caso do salão: o mapa de mesas e o cardápio lado
// a lado disputam cada centímetro, e dezessete rem de rótulos repetidos
// custam uma coluna inteira de mesas. Quem entra ali está trabalhando
// naquilo, não navegando entre seções.
export function PanelShell({
  homeHref,
  context,
  nav,
  userName,
  banner,
  children,
  menuAberto,
  larga,
  atalho,
  barraDeBaixo,
  foto,
}: {
  homeHref: string;
  /** o que está sendo gerenciado: "Administração" ou o nome do restaurante */
  context: ReactNode;
  nav: NavItem[];
  userName: string;
  banner?: ReactNode;
  children: ReactNode;
  /**
   * Um destino que não é seção: fica como ícone ao lado do Sair.
   *
   * O Menu Fácil PC é disso: ninguém "navega" até lá no dia a dia -- entra
   * uma vez para baixar o programa e parear o computador. Na lista de
   * seções ele pesava igual a Pedidos e Cardápio, que são o trabalho.
   */
  atalho?: { href: string; label: string; icon: ReactNode };
  /**
   * No celular, o menu embaixo em vez das abas no alto.
   *
   * Os hrefs de `fixos` ficam na barra; o resto vai para "Mais". `topo`
   * entra na linha fina que sobra em cima (o aberto/fechado), `nome` é o
   * que aparece ao lado do logo, e `selos` ficam por cima dos ícones. Sem
   * isto, o celular continua com as abas no alto.
   */
  barraDeBaixo?: { fixos: string[]; nome: string; topo?: ReactNode; selos?: Record<string, ReactNode> };
  /**
   * A tela em que o menu fica aberto, com os nomes das seções.
   *
   * É a inicial, e só ela: ali a pessoa está escolhendo para onde ir. Nas
   * outras ela já está trabalhando naquilo, e o menu de 17rem levava um
   * terço da tela do balcão -- no salão, uma coluna inteira de mesas.
   * Passando nada, o menu fica aberto em todas, como era antes.
   */
  menuAberto?: string;
  /** trecho do endereço em que o conteúdo usa a largura toda (o salão) */
  larga?: string;
  /**
   * A foto de perfil do restaurante, no lugar do logo do Menu Fácil.
   *
   * O painel é dele: ver a própria marca ao lado do nome é o que faz a
   * tela parecer do restaurante, e não de um sistema emprestado. Sem foto
   * cadastrada, fica o logo de sempre.
   */
  foto?: string | null;
}) {
  const pathname = usePathname();
  const compacto = !!menuAberto && pathname !== menuAberto;
  // o menu em ícones devolve largura para o conteúdo, mas quem usa a tela
  // inteira é só o salão: num formulário, linha de 1600px não se lê
  const larguraToda = !!larga && pathname.includes(larga);

  // a foto redonda, do tamanho do ícone que ela substitui
  const marca = foto ? (
    <span className="relative block size-9 shrink-0 overflow-hidden rounded-full border border-line bg-surface-2">
      <Image src={foto} alt="" fill sizes="36px" className="object-cover" />
    </span>
  ) : (
    <LogoIcon className="size-8 text-brand" />
  );

  const atalhoButton = atalho ? (
    <Link
      href={atalho.href}
      aria-label={atalho.label}
      title={atalho.label}
      className="grid size-10 shrink-0 place-items-center rounded-control text-muted hover:bg-surface-2 hover:text-ink [&_svg]:size-4"
    >
      {atalho.icon}
    </Link>
  ) : null;

  const logoutButton = (
    <form action={logout}>
      <button
        type="submit"
        className="flex h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sair
      </button>
    </form>
  );

  return (
    // Dentro do painel o creme e o branco trocam de lugar.
    //
    // No site, o cartão creme sobre papel branco é a marca. No painel isso
    // se vira contra ele: a tela é quase toda cartão, e o branco sumia em
    // tiras finas entre blocos cremes -- lido de relance, vira uma parede
    // só. Aqui o fundo é o off-white, o cartão é o papel branco, e as
    // linhas são o creme mais claro separando um do outro.
    //
    // Só aqui dentro: o site público continua como está.
    <div
      className={cn(
        "min-h-dvh [--color-bg:#faf8f4] [--color-line:#ece7df] [--color-line-strong:#d9d2c6] [--color-surface-2:#f4f1ec] [--color-surface-3:#e9e4db] [--color-surface:#ffffff] bg-bg lg:grid",
        compacto ? "lg:grid-cols-[5rem_minmax(0,1fr)]" : "lg:grid-cols-[17rem_minmax(0,1fr)]",
      )}
    >
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface py-6 lg:flex",
          compacto ? "items-stretch px-3" : "px-4",
        )}
      >
        {foto && !compacto ? (
          // com foto, ela e o nome lado a lado tomam o lugar do logo
          <div className="mb-6 flex items-center gap-3 px-2">
            <Link href={homeHref} aria-label="Início" className="shrink-0">
              {marca}
            </Link>
            <div className="min-w-0 text-sm font-bold">{context}</div>
          </div>
        ) : (
          <>
            <Link href={homeHref} className={cn("mb-2", compacto ? "grid place-items-center" : "px-2")} aria-label="Início">
              {compacto ? marca : <Logo />}
            </Link>
            {!compacto && <div className="mb-6 px-2 text-sm font-semibold text-faint">{context}</div>}
            {compacto && <div className="mb-6" />}
          </>
        )}
        <SidebarNav items={nav} compacto={compacto} />
        <div className="mt-auto border-t border-line pt-4">
          {!compacto && <p className="truncate px-3 pb-2 text-sm text-faint">{userName}</p>}
          <div className={cn("flex items-center gap-1", compacto && "flex-col")}>
            {logoutButton}
            {atalhoButton}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {banner}
        {barraDeBaixo ? (
          // uma linha só: o logo, o restaurante e se ele está aberto. O resto
          // do menu desceu para onde o polegar alcança.
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur lg:hidden">
            <Link href={homeHref} aria-label="Início" className="shrink-0">
              {marca}
            </Link>
            <p className="min-w-0 flex-1 truncate font-extrabold">{barraDeBaixo.nome}</p>
            {barraDeBaixo.topo}
          </header>
        ) : (
        <header className="border-b border-line bg-surface px-4 pt-4 pb-3 lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Link href={homeHref}>
              <Logo />
            </Link>
            <div className="flex items-center gap-1">
              {logoutButton}
              {atalhoButton}
            </div>
          </div>
          <div className="mb-3 truncate text-sm font-semibold text-faint">{context}</div>
          <TabsNav items={nav} />
        </header>
        )}
        <main
          className={cn(
            "w-full px-4 py-6 sm:px-6",
            barraDeBaixo && "pb-28",
            larguraToda ? "lg:px-6 lg:py-6" : "mx-auto max-w-6xl lg:px-10 lg:py-10",
          )}
        >
          {children}
        </main>
        {barraDeBaixo && (
          <BarraDeBaixo items={nav} fixos={barraDeBaixo.fixos} selos={barraDeBaixo.selos} atalho={atalho} contexto={context} />
        )}
      </div>
    </div>
  );
}
