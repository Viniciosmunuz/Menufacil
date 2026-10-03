import { ArrowRight, Check, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoIcon } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { BENEFICIOS, DEMO_URL, DUVIDAS, PASSOS, PLANOS, type Plano } from "./conteudo";
import { TelaDoCardapio, TelaDoPainel, ViaImpressa } from "./mockups";

// Página de venda do MenuFácil: quem chega aqui é dono de restaurante,
// quase sempre pelo Instagram e pelo celular. A ordem é a de uma conversa:
// o que é, vendo funcionar, o que ganha, como começa, quanto custa,
// dúvidas e o contato.
//
// Os textos que mudam com o tempo (preço, plano, links) estão em conteudo.ts.

/** onde os botões da página vão parar */
export const ANCORA = "comece";

function BotaoDoForm({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <a href={`#${ANCORA}`} className={cn(buttonClasses("primary", "lg"), className)}>
      {children}
    </a>
  );
}

function Titulo({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-4 sm:mb-6">
      <h2 className="text-xl leading-tight font-extrabold sm:text-3xl">{children}</h2>
      {sub && <p className="mt-1 text-sm text-muted sm:text-base">{sub}</p>}
    </div>
  );
}

// ─── 1. topo ──────────────────────────────────────────────────────────

export function Topo() {
  return (
    <section className="relative isolate overflow-hidden rounded-card border border-line px-5 py-8 sm:px-10 sm:py-14">
      {/* a mesa posta, ao fundo: é de comida que a página fala */}
      <Image
        src="/demo/burger/capa.webp"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 64rem, 100vw"
        className="-z-40 object-cover object-[72%_50%]"
      />
      {/* o calor laranja de trás do celular */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 right-0 -z-30 h-64 w-52 -translate-y-1/2 rounded-full bg-brand/40 blur-[70px] sm:h-80 sm:w-72"
      />
      {/* o celular do cliente, inclinado como se estivesse na mão */}
      <div aria-hidden="true" className="pointer-events-none absolute top-1/2 -right-28 -z-20 -translate-y-1/2 sm:-right-10 lg:right-2">
        <div className="w-[13.5rem] [transform:perspective(1000px)_rotateY(-20deg)_rotateZ(7deg)] lg:[transform:perspective(1100px)_rotateY(-18deg)_rotateZ(6deg)_scale(1.18)]">
          <TelaDoCardapio />
        </div>
      </div>
      {/* escurece da esquerda para a direita: o texto precisa se ler sempre */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-bg/35 bg-[linear-gradient(100deg,#08080a_0%,#08080a_44%,rgb(8_8_10/0.86)_63%,rgb(8_8_10/0.3)_100%)] sm:bg-bg/0"
      />

      <div className="relative max-w-xl lg:max-w-[33rem]">
        <LogoIcon className="h-8 drop-shadow-[0_0_14px_rgb(249_104_11/0.5)] sm:h-10" />
        <p className="mt-3.5 inline-block rounded-full border border-brand/70 px-3.5 py-1 text-[0.68rem] font-extrabold tracking-[0.09em] text-brand uppercase sm:text-xs">
          Para donos de restaurante
        </p>
        <h1 className="mt-3 text-[1.72rem] leading-[1.1] font-extrabold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
          Receba pedidos direto do cliente, <span className="text-brand">sem pagar comissão</span>
        </h1>
        <p className="mt-3 max-w-md text-base leading-snug text-pretty text-ink/85 sm:text-lg">
          Seu cardápio com link próprio, aviso de pedido novo e impressão automática no balcão. A gente monta tudo com você.
        </p>
        <BotaoDoForm className="mt-6 w-full sm:w-auto">
          <ArrowRight className="size-5" aria-hidden="true" />
          Quero meu cardápio digital
        </BotaoDoForm>
      </div>
    </section>
  );
}

// ─── 2. veja como funciona ────────────────────────────────────────────

const VITRINE = [
  { title: "Cliente pede pelo celular", text: "Ele abre seu link, monta o pedido e envia. Sem baixar aplicativo.", tela: <TelaDoCardapio /> },
  { title: "Painel apita com pedido novo", text: "O pedido chega na hora, com um som que dá para ouvir no salão.", tela: <TelaDoPainel /> },
  { title: "Pedido imprime sozinho no balcão", text: "Sai na impressora já com itens, observações, endereço e troco.", tela: <ViaImpressa /> },
];

export function VejaFuncionando() {
  return (
    <section>
      <Titulo sub="Do celular do cliente até o papel na sua mão.">Veja como funciona</Titulo>
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        {VITRINE.map(({ title, text, tela }, i) => (
          <li key={title} className="flex flex-col rounded-card border border-line bg-surface p-4 sm:p-5">
            <div className="flex items-start gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-brand-ink">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="leading-tight font-extrabold">{title}</p>
                <p className="mt-0.5 text-sm leading-snug text-muted">{text}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-1 items-end pb-1">{tela}</div>
          </li>
        ))}
      </ol>
      <Link
        href={DEMO_URL}
        target="_blank"
        rel="noopener"
        className={cn(buttonClasses("secondary", "lg"), "mt-4 w-full sm:w-auto")}
      >
        Fazer um pedido de teste
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

// ─── 3. o que você ganha ──────────────────────────────────────────────

export function Beneficios() {
  return (
    <section>
      <Titulo sub="O que muda no dia a dia do seu restaurante.">O que você ganha</Titulo>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        {BENEFICIOS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex flex-col rounded-card border border-line bg-surface p-3.5 sm:p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-brand/50 bg-brand-soft text-brand sm:size-11">
              <Icon className="size-4.5 sm:size-5" aria-hidden="true" />
            </span>
            <p className="mt-2.5 text-sm leading-tight font-extrabold sm:text-base">{title}</p>
            <p className="mt-1 text-xs leading-snug text-muted sm:text-sm">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── 4. como começar ──────────────────────────────────────────────────

export function ComoComecar() {
  return (
    <section className="rounded-card border border-line bg-surface p-5 sm:p-8">
      <Titulo sub="Sem taxa de adesão e sem burocracia.">Como começar</Titulo>
      <ol className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        {PASSOS.map((p, i) => (
          <li key={p.title} className="flex flex-1 items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-brand-ink">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block leading-tight font-extrabold">{p.title}</span>
              <span className="mt-0.5 block text-sm leading-snug text-muted">{p.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─── 5. plano ─────────────────────────────────────────────────────────

function CartaoDoPlano({ plano }: { plano: Plano }) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-card p-5 sm:p-7",
        plano.destaque
          ? "border-2 border-brand bg-[linear-gradient(170deg,rgb(249_104_11/0.14),transparent_55%)] shadow-[0_0_40px_-12px_rgb(249_104_11/0.45)]"
          : "border border-line bg-surface",
      )}
    >
      <p className="text-lg font-extrabold sm:text-xl">{plano.nome}</p>
      <p className="mt-1 flex items-end gap-1">
        <span className={cn("text-4xl leading-none font-extrabold sm:text-5xl", plano.destaque ? "text-brand" : "text-ink")}>
          {plano.preco}
        </span>
        <span className="pb-1 font-bold text-muted">{plano.periodo}</span>
      </p>
      <p className="mt-2 text-sm text-muted">{plano.resumo}</p>
      {plano.herda && <p className="mt-5 text-sm font-extrabold text-brand">{plano.herda}</p>}
      <ul className={cn("flex flex-col gap-2.5", plano.herda ? "mt-2.5" : "mt-5")}>
        {plano.itens.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm sm:text-base">
            <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {/* o botão fica colado embaixo: com listas de tamanhos diferentes, os
          dois cartões terminam na mesma linha */}
      <BotaoDoForm className="mt-6 w-full">{plano.botao}</BotaoDoForm>
    </div>
  );
}

export function Plano() {
  return (
    <section>
      <Titulo sub="Dois planos, sem pegadinha e sem comissão: você sabe quanto vai pagar.">Quanto custa</Titulo>
      <div className="mx-auto grid max-w-4xl grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {PLANOS.map((plano) => (
          <CartaoDoPlano key={plano.nome} plano={plano} />
        ))}
      </div>
    </section>
  );
}

// ─── 6. perguntas frequentes ──────────────────────────────────────────

export function Duvidas() {
  const perguntas = DUVIDAS.filter((d) => d.a.trim());
  if (!perguntas.length) return null;
  return (
    <section>
      <Titulo>Perguntas frequentes</Titulo>
      <div className="flex flex-col gap-2">
        {perguntas.map(({ q, a }) => (
          <details key={q} className="drawer group rounded-card border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-extrabold [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="px-4 pb-4 text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
