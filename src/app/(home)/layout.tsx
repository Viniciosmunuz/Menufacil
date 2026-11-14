import { Mail, MessageCircle } from "lucide-react";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";
import { EMAIL, linkDoWhatsapp, SECOES } from "@/components/venda/conteudo";
import { MenuDoTopo, type LinkDoMenu } from "@/components/venda/menu-topo";
import { formatPhone } from "@/lib/format";
import { WHATSAPP_MENUFACIL } from "@/lib/contato";

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
//
// O miolo não tem largura própria: as seções da página vão de ponta a ponta
// (o topo e a chamada final são faixas escuras) e cada uma centraliza o seu
// conteúdo.

// A fonte dos títulos desta página (ver .venda em globals.css). Carregada
// aqui, e não na raiz, para o painel e o cardápio não baixarem uma fonte
// que não usam.
const bricolage = Bricolage_Grotesque({
  variable: "--font-titulo",
  subsets: ["latin"],
  weight: ["700", "800"],
});

// A barra do topo leva poucos links: quem chega aqui tem uma pergunta só
// ("isso serve para mim e quanto custa?") e o excesso espalha a atenção. O
// resto continua na página e no rodapé.
const LINKS: LinkDoMenu[] = [
  { href: `#${SECOES.topo}`, label: "Início" },
  { href: `#${SECOES.recursos}`, label: "Soluções" },
  { href: `#${SECOES.lia}`, label: "Lia" },
  { href: `#${SECOES.planos}`, label: "Planos" },
];

export default function HomeLayout({ children }: LayoutProps<"/">) {
  const whatsapp = linkDoWhatsapp();
  const ano = new Date().getFullYear();

  return (
    <div className={`venda ${bricolage.variable} flex min-h-dvh flex-col`}>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/92 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-2 px-4 sm:px-6 lg:h-14">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
            <LogoIcon className="h-6 shrink-0 lg:h-7" />
            <span className="text-base font-extrabold tracking-tight lg:text-lg">
              Menu<span className="text-brand">Fácil</span>
            </span>
          </Link>

          <MenuDoTopo links={LINKS} />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Rodapé enxuto, a pedido dele: uma linha com a marca, os mesmos
          links do topo e os dois contatos. Saíram a frase de descrição, a
          cidade e a lista longa de links -- quem chegou até aqui já passou
          por todas as seções. */}
      <footer className="bg-[#0f0b08] text-white">
        <div className="mx-auto max-w-6xl px-5 py-9 sm:px-6">
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-between">
            <Link href="/" className="flex w-fit items-center gap-2">
              <LogoIcon className="h-7 shrink-0" />
              <span className="text-lg font-extrabold tracking-tight">
                Menu<span className="text-brand">Fácil</span>
              </span>
            </Link>

            <nav aria-label="Rodapé">
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-bold text-white/60">
                {LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <a href={href} className="hover:text-white">
                      {label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link href="/entrar" className="hover:text-white">
                    Entrar
                  </Link>
                </li>
              </ul>
            </nav>

            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/60">
              {whatsapp && (
                <li>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-white"
                  >
                    <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
                    {formatPhone(WHATSAPP_MENUFACIL)}
                  </a>
                </li>
              )}
              <li>
                <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 hover:text-white">
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  {EMAIL}
                </a>
              </li>
            </ul>
          </div>

          <p className="mt-7 border-t border-white/10 pt-5 text-center text-xs text-white/40 lg:text-left">
            © {ano} MenuFácil. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
