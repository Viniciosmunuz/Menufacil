"use client";

import { Ellipsis, LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { isOpenNow, type OpeningHourData } from "@/lib/opening-hours";
import type { OpenMode } from "@/generated/prisma/enums";
import { logout } from "@/server/auth/actions";

import type { NavItem } from "./nav-link";

// O menu do celular, embaixo.
//
// Em cima ele ocupava um quinto da tela antes do primeiro pedido, e as
// abas que não cabiam -- Totem, Mercado Pago, Suporte -- só existiam para
// quem arrastasse a faixa para o lado. Embaixo fica onde o polegar já
// está, com o celular numa mão só: quatro destinos fixos e o resto em
// "Mais". É o mesmo jeito do aplicativo do garçom e dos aplicativos que o
// dono já usa.
//
// Só no celular. No computador o menu lateral continua como está.

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function BarraDeBaixo({
  items,
  fixos,
  selos = {},
  atalho,
  contexto,
}: {
  items: NavItem[];
  /** os hrefs que ficam na barra; o resto vai para "Mais" */
  fixos: string[];
  /** um selo por href, por cima do ícone (o número de Pedidos) */
  selos?: Record<string, ReactNode>;
  atalho?: { href: string; label: string; icon: ReactNode };
  /** o que aparece no alto da folha "Mais": o nome do restaurante */
  contexto: ReactNode;
}) {
  const pathname = usePathname();
  const [aberta, setAberta] = useState(false);
  const [saindo, setSaindo] = useState(false);

  // trocou de tela: a folha fecha sozinha, senão ela cobriria a tela nova
  const [ultimaTela, setUltimaTela] = useState(pathname);
  if (pathname !== ultimaTela) {
    setUltimaTela(pathname);
    setAberta(false);
    setSaindo(false);
  }

  const naBarra = fixos.flatMap((href) => items.filter((i) => i.href === href));
  const noMais = items.filter((i) => !fixos.includes(i.href));
  const maisAceso = noMais.some((i) => isActive(pathname, i)) || (atalho ? pathname.startsWith(atalho.href) : false);

  const botao = "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[11px] font-bold transition-colors [&_svg]:size-5";

  // Dentro de uma mesa do salão a barra sai: a tela tem a seta de voltar e
  // o próprio rodapé, com a comanda e o Salvar -- que ficavam embaixo dela.
  if (pathname.includes("/salao/mesa/")) return null;

  return (
    <>
      <nav
        aria-label="Menu do painel"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="flex">
          {naBarra.map((item) => {
            const aceso = isActive(pathname, item);
            return (
              <li key={item.href} className="flex flex-1">
                <Link href={item.href} aria-current={aceso ? "page" : undefined} className={cn(botao, aceso ? "text-brand" : "text-faint")}>
                  <span className="relative">
                    {item.icon}
                    {selos[item.href]}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button
              type="button"
              onClick={() => setAberta(true)}
              aria-expanded={aberta}
              className={cn(botao, maisAceso ? "text-brand" : "text-faint")}
            >
              <Ellipsis aria-hidden="true" />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      {aberta && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60 lg:hidden" onClick={() => setAberta(false)}>
          <div
            role="dialog"
            aria-label="Mais opções"
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-card border-t border-line bg-surface pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0 truncate text-sm font-semibold text-muted">{contexto}</div>
              <button type="button" onClick={() => setAberta(false)} aria-label="Fechar" className="grid size-9 shrink-0 place-items-center rounded-control text-muted">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <ul className="flex flex-col px-2 py-2">
              {[...noMais, ...(atalho ? [{ href: atalho.href, label: "Menu Fácil PC", icon: atalho.icon }] : [])].map((item) => {
                const aceso = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={aceso ? "page" : undefined}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-control px-3 font-semibold [&_svg]:size-5",
                        aceso ? "bg-brand-soft text-brand" : "text-ink active:bg-surface-2",
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* sair por último e em dois toques: sair sem querer no meio do
                movimento obriga a digitar a senha com pedido chegando */}
            <div className="border-t border-line px-2 pt-2">
              {!saindo ? (
                <button
                  type="button"
                  onClick={() => setSaindo(true)}
                  className="flex min-h-12 w-full items-center gap-3 rounded-control px-3 font-semibold text-muted active:bg-surface-2"
                >
                  <LogOut className="size-5" aria-hidden="true" />
                  Sair
                </button>
              ) : (
                <form action={logout} className="flex items-center gap-2 px-1 py-1">
                  <span className="flex-1 text-sm font-bold">Sair da conta?</span>
                  <button type="submit" className="min-h-11 rounded-control bg-danger px-4 text-sm font-extrabold text-white">
                    Sim, sair
                  </button>
                  <button type="button" onClick={() => setSaindo(false)} className="min-h-11 rounded-control px-3 text-sm font-bold text-muted">
                    Cancelar
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Quantos pedidos esperam, por cima do ícone de Pedidos.
 *
 * Confere de meio em meio minuto, e só com a tela à vista: o celular no
 * bolso não precisa saber. O sino e a lista ao vivo continuam sendo da
 * tela de Pedidos -- isto é só para quem está em outra tela ver que chegou
 * alguma coisa.
 */
export function SeloDePedidos({ restaurantId, inicial }: { restaurantId: string; inicial: number }) {
  const [n, setN] = useState(inicial);

  useEffect(() => {
    let vivo = true;
    const olhar = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/painel/${restaurantId}/esperando`, { cache: "no-store" });
        if (!r.ok) return;
        const dado = (await r.json()) as { n: number };
        if (vivo) setN(dado.n);
      } catch {
        // sem rede: o número fica como estava até a próxima volta
      }
    };
    const timer = setInterval(olhar, 30_000);
    document.addEventListener("visibilitychange", olhar);
    return () => {
      vivo = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", olhar);
    };
  }, [restaurantId]);

  if (n === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-brand px-1 text-[10px] font-extrabold text-brand-ink tabular-nums">
      {n > 9 ? "9+" : n}
    </span>
  );
}

/**
 * Aberto ou fechado, no alto da tela.
 *
 * É a primeira coisa que o dono confere ao abrir o painel. Recalcula a cada
 * minuto, porque a virada das 18h acontece com a tela aberta. Tocar leva
 * ao Início, onde ficam os botões de abrir e fechar.
 */
export function AbertoFechado({ href, openMode, hours }: { href: string; openMode: OpenMode; hours: OpeningHourData[] }) {
  const [aberto, setAberto] = useState(() => isOpenNow(openMode, hours));

  useEffect(() => {
    const timer = setInterval(() => setAberto(isOpenNow(openMode, hours)), 60_000);
    return () => clearInterval(timer);
  }, [openMode, hours]);

  return (
    <Link
      href={href}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-extrabold",
        aberto ? "border-success/40 bg-success/10 text-success" : "border-line bg-surface-2 text-muted",
      )}
    >
      <span className={cn("size-2 rounded-full", aberto ? "bg-success" : "bg-faint")} aria-hidden="true" />
      {aberto ? "Aberto" : "Fechado"}
    </Link>
  );
}
