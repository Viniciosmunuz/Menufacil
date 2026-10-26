import { MessageCircle } from "lucide-react";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";
import { DEPOIMENTOS, linkDoWhatsapp, PRACA, SECOES } from "@/components/venda/conteudo";
import { MenuDoTopo, type LinkDoMenu } from "@/components/venda/menu-topo";

// A casca da página principal, de propósito fora do grupo (site).
//
// O resto do site é a parte do cliente que vai comer: topo com busca, menu
// de categorias, seletor de cidade, barra de baixo. Aqui quem chega é dono
// de restaurante, e essa moldura toda contava a história errada -- parecia
// um aplicativo de delivery vendendo comida, quando o que se vende é o
// sistema.
//
// Quem entrou pelo link de um restaurante nunca chega aqui: o proxy manda
// de volta para o restaurante dele antes (ver src/proxy.ts).

const LINKS: LinkDoMenu[] = [
  { href: `#${SECOES.topo}`, label: "Início" },
  { href: `#${SECOES.recursos}`, label: "Recursos" },
  { href: `#${SECOES.planos}`, label: "Planos" },
  { href: `#${SECOES.totem}`, label: "Totem" },
  // depoimento só entra no menu quando existe um de verdade
  ...(DEPOIMENTOS.length ? [{ href: `#${SECOES.depoimentos}`, label: "Depoimentos" }] : []),
  { href: `#${SECOES.duvidas}`, label: "Dúvidas" },
];

export default function HomeLayout({ children }: LayoutProps<"/">) {
  const whatsapp = linkDoWhatsapp();
  const ano = new Date().getFullYear();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/92 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
            <LogoIcon className="h-8 shrink-0 sm:h-9" />
            <span className="text-lg font-extrabold tracking-tight sm:text-xl">
              Menu<span className="text-brand">Fácil</span>
            </span>
          </Link>

          <MenuDoTopo links={LINKS} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>

      <footer className="border-t border-line [--color-bg:#141211] [--color-faint:#8a857f] [--color-ink:#f4f2ef] [--color-line:#2f2b28] [--color-muted:#bdb8b1] bg-bg text-ink">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-9 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <LogoIcon className="mt-0.5 h-9 shrink-0" />
              <p>
                <span className="block text-lg font-extrabold tracking-tight">
                  Menu<span className="text-brand">Fácil</span>
                </span>
                <span className="text-sm text-muted">Tecnologia que impulsiona seu restaurante.</span>
              </p>
            </div>

            <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-muted">
              {LINKS.map(({ href, label }) => (
                <a key={href} href={href} className="hover:text-ink">
                  {label}
                </a>
              ))}
              <Link href="/restaurantes" className="hover:text-ink">
                Restaurantes
              </Link>
              <Link href="/entrar" className="hover:text-ink">
                Entrar
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-bold text-muted hover:text-ink"
                >
                  <MessageCircle className="size-5" aria-hidden="true" />
                  Fale conosco
                </a>
              ) : (
                <Link href="/contato" className="flex items-center gap-2 text-sm font-bold text-muted hover:text-ink">
                  <MessageCircle className="size-5" aria-hidden="true" />
                  Fale conosco
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-line pt-5 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
            <p>© {ano} MenuFácil. Todos os direitos reservados.</p>
            <p>{PRACA}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
