import { ArrowRight, Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoIcon } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { BENEFICIOS, DEMO_URL, DUVIDAS, PASSOS, PLANO } from "./conteudo";
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
    <section className="relative isolate overflow-hidden rounded-card border border-brand/40 bg-[linear-gradient(155deg,rgb(255_138_31/0.2),rgb(255_138_31/0.02)_58%)] px-5 py-7 sm:px-10 sm:py-12">
      <div className="max-w-xl">
        <LogoIcon className="h-8 sm:h-10" />
        <p className="mt-4 inline-block rounded-full border border-brand/50 bg-brand-soft px-3 py-1 text-[0.7rem] font-extrabold tracking-wide text-brand uppercase sm:text-xs">
          Para donos de restaurante
        </p>
        <h1 className="mt-3 text-[1.7rem] leading-[1.12] font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Receba pedidos direto do cliente, <span className="text-brand">sem pagar comissão</span>
        </h1>
        <p className="mt-3 text-base leading-snug text-ink/85 sm:text-lg">
          Seu cardápio com link próprio, aviso de pedido novo e impressão automática no balcão. A gente monta tudo com você.
        </p>
        <BotaoDoForm className="mt-5 w-full sm:w-auto">Quero meu cardápio digital</BotaoDoForm>
        <p className="mt-2.5 text-xs font-bold text-muted sm:text-sm">{PLANO.resumo}</p>
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

export function Plano() {
  return (
    <section>
      <Titulo sub="Um plano só, sem pegadinha: você sabe quanto vai pagar.">Quanto custa</Titulo>
      <div className="mx-auto max-w-md rounded-card border-2 border-brand bg-[linear-gradient(170deg,rgb(255_138_31/0.14),transparent_55%)] p-5 shadow-[0_0_40px_-12px_rgb(255_138_31/0.45)] sm:p-7">
        <p className="text-lg font-extrabold sm:text-xl">{PLANO.nome}</p>
        <p className="mt-1 flex items-end gap-1">
          <span className="text-4xl leading-none font-extrabold text-brand sm:text-5xl">{PLANO.preco}</span>
          <span className="pb-1 font-bold text-muted">{PLANO.periodo}</span>
        </p>
        <ul className="mt-5 flex flex-col gap-2.5">
          {PLANO.itens.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm sm:text-base">
              <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <BotaoDoForm className="mt-6 w-full">Quero o plano Essencial</BotaoDoForm>
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
