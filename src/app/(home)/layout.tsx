import { Mail, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";

import { LogoIcon } from "@/components/brand/logo";
import { DEPOIMENTOS, EMAIL, linkDoWhatsapp, PRACA, SECOES } from "@/components/venda/conteudo";
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

// A barra do topo leva poucos links: quem chega aqui tem uma pergunta só
// ("isso serve para mim e quanto custa?") e o excesso espalha a atenção. O
// resto continua na página e no rodapé.
const LINKS: LinkDoMenu[] = [
  { href: `#${SECOES.topo}`, label: "Início" },
  { href: `#${SECOES.recursos}`, label: "Soluções" },
  { href: `#${SECOES.planos}`, label: "Planos" },
];

/** o rodapé ainda lista tudo: lá o espaço sobra e quem procura, procura */
const LINKS_RODAPE: LinkDoMenu[] = [
  ...LINKS,
  { href: `#${SECOES.antes}`, label: "Antes e depois" },
  { href: `#${SECOES.adicionais}`, label: "Adicionais" },
  // depoimento só entra quando existe um de verdade
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

      <main className="flex-1">{children}</main>

      {/* embaixo sobra espaço para a barra de contato presa no pé da tela */}
      <footer className="bg-[#0f0b08] text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 pt-16 pb-40 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:pb-36">
          <div>
            <Link href="/" className="flex w-fit items-center gap-2.5">
              <LogoIcon className="h-11 shrink-0" />
              <span className="text-[1.7rem] font-extrabold tracking-tight">
                Menu<span className="text-brand">Fácil</span>
              </span>
            </Link>
            <p className="mt-6 max-w-md text-[1.02rem] leading-relaxed text-white/60">
              Sistema de delivery e salão para restaurantes: cardápio digital, pedidos, comandas e caixa em um só
              lugar.
            </p>

            <ul className="mt-8 flex flex-col gap-4 text-[1rem] text-white/60">
              <li>
                <a href={`mailto:${EMAIL}`} className="flex w-fit items-center gap-3 hover:text-white">
                  <Mail className="size-5 shrink-0" aria-hidden="true" />
                  {EMAIL}
                </a>
              </li>
              {whatsapp && (
                <li>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-fit items-center gap-3 hover:text-white"
                  >
                    <MessageCircle className="size-5 shrink-0" aria-hidden="true" />
                    {formatPhone(WHATSAPP_MENUFACIL)}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-3">
                <MapPin className="size-5 shrink-0" aria-hidden="true" />
                {PRACA}
              </li>
            </ul>
          </div>

          <nav aria-label="Rodapé">
            <p className="text-lg font-extrabold">Links úteis</p>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3.5 text-white/60">
              {LINKS_RODAPE.map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className="hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/restaurantes" className="hover:text-white">
                  Restaurantes
                </Link>
              </li>
              <li>
                <Link href="/entrar" className="hover:text-white">
                  Entrar
                </Link>
              </li>
            </ul>
          </nav>

          <p className="border-t border-white/10 pt-6 text-sm text-white/40 lg:col-span-2">
            © {ano} MenuFácil. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
