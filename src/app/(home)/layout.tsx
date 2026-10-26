import { LogIn } from "lucide-react";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

// A casca da página principal, de propósito fora do grupo (site).
//
// O resto do site é a parte do cliente que vai comer: topo com busca, menu
// de categorias, seletor de cidade, barra de baixo. Aqui quem chega é dono
// de restaurante, e essa moldura toda contava a história errada -- parecia
// um aplicativo de delivery vendendo comida, quando o que se vende é o
// sistema. Então esta página tem a sua: logo, entrar, e o caminho para o
// formulário.
//
// Quem entrou pelo link de um restaurante nunca chega aqui: o proxy manda
// de volta para o restaurante dele antes (ver src/proxy.ts).
export default function HomeLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <LogoIcon className="h-8 shrink-0 sm:h-9" />
            <span className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
              Menu<span className="text-brand">Fácil</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link href="/entrar" className="flex items-center gap-1.5 px-2 text-sm font-bold text-muted hover:text-ink">
              <LogIn className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Entrar no painel</span>
              <span className="sm:hidden">Entrar</span>
            </Link>
            <a href="#comece" className={buttonClasses("primary", "sm")}>
              Quero conhecer
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <LogoIcon className="mt-0.5 h-8 shrink-0" />
            <p className="text-sm">
              <span className="block font-extrabold">MenuFácil</span>
              <span className="text-muted">O sistema de delivery e salão do seu restaurante.</span>
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-muted">
            <Link href="/restaurantes" className="hover:text-ink">
              Restaurantes
            </Link>
            <Link href="/sobre" className="hover:text-ink">
              Sobre
            </Link>
            <Link href="/contato" className="hover:text-ink">
              Contato
            </Link>
            <Link href="/entrar" className="hover:text-ink">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
