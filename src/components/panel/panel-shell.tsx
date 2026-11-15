"use client";

import { ArrowLeft, ChevronRight, LogOut, PanelLeftClose, PanelLeftOpen, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import { Logo, LogoIcon } from "@/components/brand/logo";
import { cn } from "@/lib/cn";
import { logout } from "@/server/auth/actions";

import { BarraDeBaixo } from "./barra-de-baixo";
import { SidebarNav, TabsNav, type NavItem } from "./nav-link";

// A escolha do dono: menu aberto ou recolhido, guardada neste aparelho.
// Sem escolha, vale o automático (recolhe só onde a tela pede largura).
const PREF_MENU = "mf_menu";
const EVENTO_MENU = "mf-menu";

function lerMenu() {
  try {
    return localStorage.getItem(PREF_MENU);
  } catch {
    return null;
  }
}

function assinarMenu(avisar: () => void) {
  window.addEventListener(EVENTO_MENU, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO_MENU, avisar);
    window.removeEventListener("storage", avisar);
  };
}

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
  menuEncolhe,
  larga,
  atalho,
  barraDeBaixo,
  foto,
  restaurante,
  papel,
  contaHref,
  semRodape,
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
   * Trechos do endereço em que o menu encolhe para só os ícones.
   *
   * São as telas de trabalho largo: os pedidos e o salão, onde o menu de
   * 17rem custava uma coluna inteira. Em todas as outras ele fica aberto,
   * com os nomes. Até 15/11/2026 era o contrário -- aberto só na tela
   * inicial --, e ele estranhou o menu encolhendo a cada clique.
   */
  menuEncolhe?: string[];
  /** trechos do endereço em que o conteúdo usa a largura toda */
  larga?: string | string[];
  /**
   * A foto de perfil do restaurante, no lugar do logo do Menu Fácil.
   *
   * O painel é dele: ver a própria marca ao lado do nome é o que faz a
   * tela parecer do restaurante, e não de um sistema emprestado. Sem foto
   * cadastrada, fica o logo de sempre.
   */
  foto?: string | null;
  /**
   * O cartão do restaurante, logo abaixo do logo do Menu Fácil.
   *
   * Só o painel do restaurante passa: a foto (a de `foto`), o nome, se a
   * loja está ativa na plataforma e, para o admin que entrou com a própria
   * conta, o caminho de volta. Sem isto o topo fica como no admin: o logo e
   * a linha de contexto.
   */
  restaurante?: { nome: string; status?: { label: string; ok: boolean }; voltar?: { href: string; label: string } };
  /** a linha de baixo da conta, no rodapé do menu: "Conta do restaurante" */
  papel?: string;
  /**
   * Tira o rodapé do menu lateral, com o Sair.
   *
   * No painel do restaurante o Sair mora em Configurações desde
   * 15/11/2026, a pedido dele. O admin não tem essa tela e continua com o
   * botão no menu.
   */
  semRodape?: boolean;
  /** para onde o cartão da conta leva (hoje, trocar a senha) */
  contaHref?: string;
}) {
  const pathname = usePathname();
  // O automático recolhe nas telas largas (Pedidos, salão). Desde
  // 15/11/2026 o dono pode decidir: o botão no pé do menu grava a escolha
  // neste aparelho, e ela vale em todas as telas até ele trocar de novo.
  const escolha = useSyncExternalStore(assinarMenu, lerMenu, () => null);
  const automatico = (menuEncolhe ?? []).some((t) => pathname.includes(t));
  const compacto = escolha === "fechado" ? true : escolha === "aberto" ? false : automatico;

  function alternarMenu() {
    try {
      localStorage.setItem(PREF_MENU, compacto ? "aberto" : "fechado");
    } catch {
      // sem armazenamento: não há onde guardar a escolha
    }
    window.dispatchEvent(new Event(EVENTO_MENU));
  }

  const botaoMenu = (
    <button
      type="button"
      onClick={alternarMenu}
      title={compacto ? "Abrir o menu" : "Recolher o menu"}
      aria-label={compacto ? "Abrir o menu" : "Recolher o menu"}
      className={cn(
        "flex h-10 items-center gap-2 rounded-control text-sm font-bold text-muted transition-colors hover:bg-surface-2 hover:text-ink [&_svg]:size-5",
        compacto ? "justify-center" : "px-3.5",
      )}
    >
      {compacto ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
      {!compacto && "Recolher menu"}
    </button>
  );
  // O menu em ícones devolve largura para o conteúdo, mas nem toda tela
  // quer: num formulário, linha de 1600px não se lê. Quem usa a tela
  // inteira é quem tem tabela -- o salão e os pedidos.
  const larguraToda = (Array.isArray(larga) ? larga : larga ? [larga] : []).some((t) => pathname.includes(t));

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

  // o rodapé do menu: de quem é a conta e o Sair
  const contaMiolo = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
        <UserRound className="size-5" aria-hidden="true" />
      </span>
      {!compacto && (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-extrabold text-ink">{userName}</span>
            {papel && <span className="block truncate text-xs text-faint">{papel}</span>}
          </span>
          {contaHref && <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden="true" />}
        </>
      )}
    </>
  );
  const contaClasses = cn("flex items-center gap-3 rounded-control", compacto ? "justify-center" : "px-1.5 py-1.5");
  const conta = contaHref ? (
    <Link href={contaHref} title="Trocar a senha" aria-label={"Conta de " + userName + ": trocar a senha"} className={cn(contaClasses, "hover:bg-surface-2")}>
      {contaMiolo}
    </Link>
  ) : (
    <div className={contaClasses} title={compacto ? userName : undefined}>
      {contaMiolo}
    </div>
  );

  const sairDoMenu = (
    <form action={logout} className={cn(!compacto && "flex-1")}>
      <button
        type="submit"
        title={compacto ? "Sair" : undefined}
        className={cn(
          "flex h-10 items-center justify-center gap-2 rounded-control border border-line text-sm font-bold text-muted transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink",
          compacto ? "w-10" : "w-full px-3",
        )}
      >
        <LogOut className="size-4" aria-hidden="true" />
        {compacto ? <span className="sr-only">Sair</span> : "Sair"}
      </button>
    </form>
  );

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
    // O painel usa a mesma paleta do cardápio: fundo branco, cartão branco
    // com borda e o creme só no miúdo. Até 15/11/2026 o fundo daqui era
    // creme; ele pediu o branco predominando. A classe `.tema-painel`
    // continua no globals.css, mas não inverte mais nada.
    <div
      className={cn(
        "tema-painel min-h-dvh bg-bg lg:grid",
        compacto ? "lg:grid-cols-[5rem_minmax(0,1fr)]" : "lg:grid-cols-[17rem_minmax(0,1fr)]",
      )}
    >
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface py-5 lg:flex",
          compacto ? "items-stretch px-3" : "px-4",
        )}
      >
        {restaurante && compacto ? (
          // Recolhido, o topo guarda a mesma altura do aberto: a cúpula no
          // lugar do logo e a foto no lugar do cartão. Sem isso os ícones
          // subiam, e trocar de tela parecia mexer o menu inteiro.
          <div className="flex h-44 shrink-0 flex-col items-center">
            <Link href={homeHref} className="mb-5 grid h-8 place-items-center" aria-label="Início">
              <LogoIcon className="h-6 w-auto text-brand" />
            </Link>
            <span className="grid h-[4.5rem] place-items-center" title={restaurante.nome}>
              {marca}
            </span>
          </div>
        ) : restaurante ? (
          // O logo do Menu Fácil em cima e, logo abaixo, o cartão de quem é
          // o painel: a foto, o nome e se a loja está ativa na plataforma.
          <div className="flex h-44 shrink-0 flex-col">
            <Link href={homeHref} className="mb-5 flex h-8 items-center px-2" aria-label="Início">
              <Logo />
            </Link>
            <div className="mb-3 flex h-[4.5rem] items-center gap-3 rounded-card border border-line p-2.5">
              <span className="relative block size-12 shrink-0 overflow-hidden rounded-full border border-line bg-surface-2">
                {foto ? (
                  <Image src={foto} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                  <span className="grid size-full place-items-center">
                    <LogoIcon className="size-6 text-brand" />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 truncate text-sm font-extrabold">{restaurante.nome}</p>
                  {restaurante.status && (
                    <span
                      className={cn(
                        "flex h-5 shrink-0 items-center gap-1 rounded-full px-1.5 text-[0.65rem] font-extrabold",
                        restaurante.status.ok ? "bg-success-soft text-success-ink" : "bg-surface-3 text-muted",
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", restaurante.status.ok ? "bg-success" : "bg-faint")} aria-hidden="true" />
                      {restaurante.status.label}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-faint">Painel do restaurante</p>
              </div>
            </div>
            {restaurante.voltar && (
              <Link
                href={restaurante.voltar.href}
                className="flex items-center gap-1.5 px-2 text-xs font-bold text-brand underline-offset-4 hover:underline"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                {restaurante.voltar.label}
              </Link>
            )}
          </div>
        ) : foto && !compacto ? (
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
        <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-line pt-4">
          {botaoMenu}
          {/* o cartão da conta só aparece para quem passa `papel`; no painel
              do restaurante ele saiu em 15/11/2026, a pedido dele */}
          {!semRodape && papel && conta}
          {!semRodape && (
            <div className={cn("flex items-center gap-1", compacto && "flex-col")}>
              {sairDoMenu}
              {atalhoButton}
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        {banner}
        {/* no computador, a mesma informação da barra do celular: fica
            grudada no alto e acompanha a rolagem */}
        {barraDeBaixo?.topo && (
          <div className="sticky top-0 z-20 hidden justify-end bg-bg/95 px-6 py-2.5 backdrop-blur lg:flex">
            {barraDeBaixo.topo}
          </div>
        )}
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
