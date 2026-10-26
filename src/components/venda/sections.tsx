import { ArrowRight, Check, ChevronDown, ChevronRight, MessageCircle, PlayCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoIcon } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import {
  DEMO_URL,
  DEPOIMENTOS,
  DUVIDAS,
  FINAL,
  PASSOS,
  PLANOS,
  PLANOS_TEXTO,
  PROMESSAS,
  RECADO_PLANOS,
  RECADO_RECURSOS,
  RECURSOS,
  SECOES,
  TOPO,
  TOTEM,
  type Plano,
} from "./conteudo";
import { ComposicaoDeRecursos, ComposicaoDoTopo, TelaDoCardapio } from "./mockups";

// A página do MenuFácil: é a home e é a página de venda, porque são a mesma
// coisa. Quem chega aqui é dono de restaurante, quase sempre pelo Instagram
// e pelo celular.
//
// Esta página já foi duas: uma vitrine de restaurantes, como um aplicativo
// de delivery, e uma página de venda escondida noutro endereço. Era o
// posicionamento errado -- o MenuFácil não vende comida, vende o sistema
// que o restaurante usa para vender a dele.
//
// Os textos que mudam com o tempo (preço, plano, links, depoimentos) estão
// em conteudo.ts.

function BotaoDoForm({ children, className, variante = "primary" }: { children: ReactNode; className?: string; variante?: "primary" | "secondary" }) {
  return (
    <a href={`#${SECOES.comece}`} className={cn(buttonClasses(variante, "lg"), className)}>
      {children}
    </a>
  );
}

function Titulo({ children, sub, etiqueta, claro }: { children: ReactNode; sub?: string; etiqueta?: string; claro?: boolean }) {
  return (
    <div className="mb-5 sm:mb-7">
      {etiqueta && (
        <p className="mb-2 text-[0.68rem] font-extrabold tracking-[0.14em] text-brand uppercase sm:text-xs">{etiqueta}</p>
      )}
      <h2 className={cn("text-[1.45rem] leading-tight font-extrabold text-balance sm:text-[2rem]", claro && "text-ink")}>
        {children}
      </h2>
      {sub && <p className="mt-1.5 max-w-2xl text-sm text-pretty text-muted sm:text-base">{sub}</p>}
    </div>
  );
}

// ─── 1. topo ──────────────────────────────────────────────────────────

export function Topo() {
  return (
    <section
      id={SECOES.topo}
      className="relative isolate -mx-4 overflow-hidden border-y border-line px-5 py-9 [--color-bg:#0b0a09] [--color-faint:#8f8f99] [--color-ink:#f4f4f6] [--color-line:#2a2724] [--color-line-strong:#3b3732] [--color-muted:#c4c4cc] [--color-surface:#17151300] [--color-surface-2:#252220] [--color-surface-3:#36322e] text-ink sm:-mx-6 sm:px-10 sm:py-14 lg:rounded-card lg:border"
    >
      {/* a mesa posta, ao fundo: é de comida que a página fala */}
      <Image
        src="/demo/burger/capa.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-40 object-cover object-[70%_50%]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,#0b0a09_0%,#0b0a09_40%,rgb(11_10_9/0.88)_62%,rgb(11_10_9/0.55)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/2 right-0 -z-30 h-72 w-64 -translate-y-1/2 rounded-full bg-brand/35 blur-[80px]"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:max-w-[33rem] lg:flex-1">
          <p className="text-[0.7rem] font-extrabold tracking-[0.16em] text-brand uppercase sm:text-xs">{TOPO.etiqueta}</p>
          <h1 className="mt-3 text-[1.85rem] leading-[1.12] font-extrabold tracking-tight text-balance sm:text-[2.6rem] lg:text-[2.9rem]">
            {TOPO.titulo} <span className="text-brand">{TOPO.tituloDestaque}</span>
          </h1>
          <p className="mt-3.5 max-w-lg text-[0.95rem] leading-snug text-pretty text-ink/85 sm:text-lg">{TOPO.texto}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <BotaoDoForm className="w-full sm:w-auto">
              <MessageCircle className="size-5" aria-hidden="true" />
              {TOPO.botao}
            </BotaoDoForm>
            <a
              href={`#${SECOES.recursos}`}
              className="flex min-h-12 items-center justify-center gap-2 rounded-control px-3 font-extrabold text-ink transition-colors hover:text-brand"
            >
              <PlayCircle className="size-6" strokeWidth={1.8} aria-hidden="true" />
              {TOPO.secundario}
            </a>
          </div>

          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-3.5 sm:max-w-lg lg:grid-cols-2">
            {PROMESSAS.map(({ icon: Icon, title }) => (
              <li key={title} className="flex items-start gap-2">
                <Icon className="mt-0.5 size-[1.15rem] shrink-0 text-brand" strokeWidth={2} aria-hidden="true" />
                <span className="text-[0.78rem] leading-tight font-bold text-ink/90 sm:text-[0.85rem]">{title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative min-w-0 lg:flex-1">
          {/* o selo flutuante do mockup */}
          <span className="absolute -top-2 right-2 z-10 flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[0.7rem] font-extrabold text-brand-ink shadow-[0_8px_20px_-6px_rgb(0_0_0/0.6)] sm:text-xs">
            <span className="size-1.5 animate-pulse rounded-full bg-brand-ink" aria-hidden="true" />
            {TOPO.selo}
          </span>
          <ComposicaoDoTopo />
        </div>
      </div>
    </section>
  );
}

// ─── 2. como funciona ─────────────────────────────────────────────────

export function ComoFunciona() {
  return (
    <section>
      <Titulo sub="É simples. Em poucos passos seu restaurante já começa a vender mais.">Como funciona?</Titulo>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))] lg:gap-0">
        {PASSOS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex items-stretch">
            <div className="flex min-w-0 flex-1 flex-col rounded-card border border-line bg-surface p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-brand-ink">
                  {i + 1}
                </span>
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-brand/40 bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 leading-tight font-extrabold">{title}</p>
              <p className="mt-1 text-sm leading-snug text-muted">{text}</p>
            </div>
            {/* a seta entre os passos só existe onde eles ficam lado a lado */}
            {i < PASSOS.length - 1 && (
              <span className="hidden shrink-0 items-center px-2 text-faint lg:flex" aria-hidden="true">
                <ChevronRight className="size-5" />
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─── 3. tudo em um só lugar ───────────────────────────────────────────

export function Recursos() {
  return (
    <section id={SECOES.recursos} className="scroll-mt-20">
      <Titulo sub="Delivery, salão e muito mais. O MenuFácil é completo e fácil de usar.">
        Tudo o que você precisa em um só lugar
      </Titulo>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10">
        <ul className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-3.5">
          {RECURSOS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col rounded-card border border-line bg-surface p-3.5 sm:p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-brand/40 bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-2.5 text-sm leading-tight font-extrabold sm:text-[0.95rem]">{title}</p>
              <p className="mt-1 text-xs leading-snug text-muted">{text}</p>
            </li>
          ))}
        </ul>

        <div className="relative min-w-0 lg:w-[23rem] lg:shrink-0">
          <p className="mb-1 text-center font-script text-xl leading-tight text-brand sm:text-2xl lg:text-right">
            {RECADO_RECURSOS}
          </p>
          <ComposicaoDeRecursos />
        </div>
      </div>

      <Link
        href={DEMO_URL}
        target="_blank"
        rel="noopener"
        className={cn(buttonClasses("secondary", "lg"), "mt-7 w-full sm:w-auto")}
      >
        Fazer um pedido de teste
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

// ─── 4. planos ────────────────────────────────────────────────────────

function CartaoDoPlano({ plano }: { plano: Plano }) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-card p-5",
        plano.destaque ? "border-2 border-brand bg-bg shadow-[0_0_40px_-10px_rgb(249_104_11/0.55)]" : "border border-line bg-bg",
      )}
    >
      {plano.selo ? (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-[0.62rem] font-extrabold tracking-wide text-brand-ink uppercase">
          {plano.selo}
        </span>
      ) : null}

      <p className="text-lg font-extrabold">{plano.nome}</p>
      <p className="mt-0.5 text-sm text-muted">{plano.resumo}</p>
      <p className="mt-4 flex items-end gap-1">
        <span className="text-[2.1rem] leading-none font-extrabold">{plano.preco}</span>
        <span className="pb-1 text-sm font-bold text-muted">{plano.periodo}</span>
      </p>

      <ul className="mt-5 flex flex-col gap-2.5">
        {plano.itens.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[0.82rem] leading-snug">
            <Check className="mt-0.5 size-3.5 shrink-0 text-brand" strokeWidth={3.2} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* o botão fica colado embaixo: com listas de tamanhos diferentes, os
          cartões terminam na mesma linha */}
      <BotaoDoForm className="mt-6 w-full">{plano.botao}</BotaoDoForm>
    </div>
  );
}

export function Planos() {
  return (
    <section
      id={SECOES.planos}
      className="scroll-mt-20 rounded-card border border-line px-5 py-8 [--color-bg:#141211] [--color-faint:#8a857f] [--color-ink:#f4f2ef] [--color-line:#2f2b28] [--color-muted:#bdb8b1] bg-bg text-ink sm:px-9 sm:py-11"
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        <div className="lg:w-[20rem] lg:shrink-0">
          <p className="text-[0.7rem] font-extrabold tracking-[0.16em] text-brand uppercase sm:text-xs">Planos</p>
          <h2 className="mt-2.5 text-[1.5rem] leading-tight font-extrabold text-balance sm:text-[2rem]">
            {PLANOS_TEXTO.titulo}
          </h2>
          <p className="mt-2.5 text-sm text-pretty text-muted sm:text-base">{PLANOS_TEXTO.texto}</p>
          <p className="mt-7 hidden font-script text-2xl leading-tight text-brand lg:block">{RECADO_PLANOS}</p>
          <ArrowRight className="mt-2 hidden size-10 rotate-12 text-brand lg:block" strokeWidth={1.4} aria-hidden="true" />
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-1 items-start gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLANOS.map((plano) => (
            <CartaoDoPlano key={plano.nome} plano={plano} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 5. o trio de baixo: totem, quem já usa, conversa ─────────────────

export function Totem() {
  return (
    <section id={SECOES.totem} className="flex scroll-mt-20 flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center sm:gap-6">
      <div aria-hidden="true" className="mx-auto w-32 shrink-0 sm:mx-0 sm:w-36">
        {/* o totem do balcão: o cardápio de pé, num pedestal */}
        <div className="rounded-[1.1rem] border-4 border-line-strong bg-surface-3 p-1.5">
          <div className="overflow-hidden rounded-[0.7rem]">
            <TelaDoCardapio />
          </div>
        </div>
        <div className="mx-auto h-5 w-5 bg-line-strong" />
        <div className="mx-auto h-1.5 w-20 rounded-full bg-line-strong" />
      </div>

      <div className="min-w-0">
        <p className="text-[0.65rem] font-extrabold tracking-[0.14em] text-brand uppercase">{TOTEM.etiqueta}</p>
        <h2 className="mt-1.5 text-lg leading-tight font-extrabold sm:text-xl">{TOTEM.title}</h2>
        <p className="mt-1.5 text-sm leading-snug text-pretty text-muted">{TOTEM.text}</p>
        <BotaoDoForm variante="secondary" className="mt-4 w-full sm:w-auto">
          {TOTEM.botao}
        </BotaoDoForm>
      </div>
    </section>
  );
}

/** o depoimento só aparece quando existe um de verdade (ver conteudo.ts) */
export function Depoimentos() {
  if (!DEPOIMENTOS.length) return null;
  return (
    <section id={SECOES.depoimentos} className="scroll-mt-20 rounded-card border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-lg leading-tight font-extrabold sm:text-xl">Quem já usa</h2>
      <p className="mt-0.5 text-sm text-muted">Restaurantes que confiam no MenuFácil.</p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEPOIMENTOS.map((d) => (
          <li key={d.restaurante} className="flex flex-col rounded-card border border-line bg-bg p-4">
            <div className="flex items-center gap-2.5">
              <LogoIcon className="h-8 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate font-extrabold">{d.restaurante}</span>
                <span className="block truncate text-xs text-faint">{d.praca}</span>
              </span>
            </div>
            <p className="mt-3 text-sm leading-snug text-pretty text-muted">“{d.texto}”</p>
            {d.quem && <p className="mt-2 text-xs font-bold text-faint">— {d.quem}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Parceiros({ children, total }: { children: ReactNode; total: number }) {
  if (!total) return null;
  return (
    <section>
      <Titulo
        etiqueta="Quem já usa"
        sub="Restaurantes que recebem pedidos pelo MenuFácil hoje. Abra um e peça: é exatamente assim que o seu vai ficar."
      >
        {total === 1 ? "Nosso parceiro" : "Nossos parceiros"}
      </Titulo>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{children}</div>
    </section>
  );
}

// ─── 6. dúvidas ───────────────────────────────────────────────────────

export function Duvidas() {
  const perguntas = DUVIDAS.filter((d) => d.a.trim());
  if (!perguntas.length) return null;
  return (
    <section id={SECOES.duvidas} className="scroll-mt-20">
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

// ─── 7. a conversa final ──────────────────────────────────────────────

export function ChamadaFinal({ whatsapp }: { whatsapp: string | null }) {
  return (
    <section className="flex flex-col gap-5 rounded-card bg-brand px-5 py-7 text-brand-ink sm:flex-row sm:items-center sm:justify-between sm:px-9 sm:py-9">
      <div className="min-w-0">
        <p className="font-script text-2xl leading-none sm:text-3xl">{FINAL.recado}</p>
        <h2 className="mt-2 text-[1.3rem] leading-tight font-extrabold text-balance sm:text-[1.7rem]">{FINAL.titulo}</h2>
        <p className="mt-1.5 text-sm text-pretty opacity-80 sm:text-base">{FINAL.texto}</p>
      </div>
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-13 shrink-0 items-center justify-center gap-2 rounded-control bg-brand-ink px-6 font-extrabold text-bg transition-opacity hover:opacity-90"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          {FINAL.botao}
        </a>
      ) : (
        <BotaoDoForm variante="secondary" className="shrink-0">
          {FINAL.botao}
        </BotaoDoForm>
      )}
    </section>
  );
}
