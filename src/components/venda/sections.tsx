import { ArrowRight, Check, ChevronDown, ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoIcon } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { linkWhatsappMenuFacil } from "@/lib/contato";

import {
  ADICIONAIS,
  ADICIONAIS_TEXTO,
  DEMO_URL,
  DEPOIMENTOS,
  DUVIDAS,
  FINAL,
  PASSOS,
  PLANOS,
  PLANOS_TEXTO,
  PROMESSAS,
  RECADO_RECURSOS,
  RECURSOS,
  SECOES,
  TOPO,
  type Adicional,
  type Plano,
} from "./conteudo";
import { ComposicaoDeRecursos, ComposicaoDoTopo } from "./mockups";

// A página do MenuFácil: é a home e é a página de venda, porque são a mesma
// coisa. Quem chega aqui é dono de restaurante, quase sempre pelo Instagram
// e pelo celular.
//
// O desenho é de propósito sóbrio: fundo claro, pouca cor, muito espaço em
// branco e uma coisa por vez. A versão anterior empilhava faixa escura,
// foto de fundo, brilho laranja e painel preto dos planos -- cada pedaço
// chamando atenção para si, e o olho sem saber onde pousar. Quem decide
// comprar software não decide por efeito visual; decide por entender.
//
// Os textos que mudam com o tempo (preço, plano, links, perguntas) estão em
// conteudo.ts.

function BotaoDoForm({
  children,
  className,
  variante = "primary",
}: {
  children: ReactNode;
  className?: string;
  variante?: "primary" | "secondary";
}) {
  return (
    <a href={`#${SECOES.comece}`} className={cn(buttonClasses(variante, "lg"), className)}>
      {children}
    </a>
  );
}

/** o cabeçalho de uma seção: etiqueta pequena, título, uma linha de apoio */
function Titulo({
  children,
  sub,
  etiqueta,
  centro,
}: {
  children: ReactNode;
  sub?: string;
  etiqueta?: string;
  centro?: boolean;
}) {
  return (
    <div className={cn("mb-7 sm:mb-10", centro && "mx-auto max-w-2xl text-center")}>
      {etiqueta && (
        <p className="mb-2.5 text-[0.68rem] font-extrabold tracking-[0.16em] text-brand uppercase sm:text-xs">
          {etiqueta}
        </p>
      )}
      <h2 className="text-[1.6rem] leading-[1.15] font-extrabold tracking-tight text-balance sm:text-[2.1rem]">
        {children}
      </h2>
      {sub && (
        <p className={cn("mt-2.5 max-w-xl text-[0.95rem] text-pretty text-muted sm:text-base", centro && "mx-auto")}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── 1. topo ──────────────────────────────────────────────────────────

export function Topo() {
  return (
    <section id={SECOES.topo} className="scroll-mt-20 pt-2 sm:pt-6">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-14">
        <div className="min-w-0 lg:max-w-[32rem] lg:flex-1">
          <p className="text-[0.68rem] font-extrabold tracking-[0.16em] text-brand uppercase sm:text-xs">
            {TOPO.etiqueta}
          </p>

          <h1 className="mt-4 text-[2.1rem] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-[3rem] lg:text-[3.3rem]">
            {TOPO.titulo}
            <br className="hidden sm:block" />{" "}
            <span className="text-brand">{TOPO.tituloDestaque}</span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-pretty text-muted sm:text-lg">{TOPO.texto}</p>

          {/* os dois caminhos de quem chega: falar com a gente, ou ver
              funcionando antes de falar. O segundo abre um cardápio real --
              é a demonstração que existe, e vale mais que vídeo */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <BotaoDoForm className="w-full sm:w-auto">{TOPO.botao}</BotaoDoForm>
            <Link
              href={DEMO_URL}
              target="_blank"
              rel="noopener"
              className={cn(buttonClasses("secondary", "lg"), "w-full sm:w-auto")}
            >
              {TOPO.secundario}
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
            {PROMESSAS.map(({ icon: Icon, title }) => (
              <li key={title} className="flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-brand" strokeWidth={2.4} aria-hidden="true" />
                <span className="text-[0.82rem] leading-tight font-bold text-muted">{title}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* no celular o mockup vem depois do texto e ocupa a largura toda;
            no computador divide a linha */}
        <div className="relative min-w-0 lg:flex-1">
          <span className="absolute -top-1 right-1 z-10 flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[0.7rem] font-extrabold text-brand-ink shadow-[0_10px_24px_-10px_rgb(249_104_11/0.9)] sm:text-xs">
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
      <Titulo centro sub="Do pedido do cliente até a comanda na cozinha, sem ninguém anotar nada à mão.">
        Como funciona
      </Titulo>

      {/* Passos numerados, sem cartão colorido nem ícone dentro de círculo:
          antes cada passo tinha número E ícone E moldura, três coisas
          disputando o mesmo olhar. Aqui o número conduz e o resto acompanha. */}
      <ol className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        {PASSOS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="relative flex gap-4 lg:flex-col lg:gap-0">
            <div className="flex shrink-0 items-center gap-3 lg:mb-4 lg:w-full">
              <span className="text-[1.6rem] leading-none font-extrabold text-brand tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Icon className="size-5 text-faint" strokeWidth={1.9} aria-hidden="true" />
              {/* a linha que liga os passos, só onde eles ficam lado a lado */}
              <span aria-hidden="true" className="hidden h-px flex-1 bg-line lg:block" />
            </div>
            <div className="min-w-0">
              <p className="leading-tight font-extrabold">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
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
      <Titulo etiqueta="Recursos" sub="Delivery, salão, totem e impressão no mesmo cadastro de produtos.">
        Tudo o que o seu restaurante precisa
      </Titulo>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-14">
        <ul className="grid min-w-0 flex-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {RECURSOS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3.5">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                <Icon className="size-[1.1rem]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="leading-tight font-extrabold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="relative min-w-0 lg:w-[22rem] lg:shrink-0">
          <p className="mb-2 text-center font-script text-xl leading-tight text-brand sm:text-2xl lg:text-right">
            {RECADO_RECURSOS}
          </p>
          <ComposicaoDeRecursos />
        </div>
      </div>
    </section>
  );
}

// ─── 4. planos e adicionais ───────────────────────────────────────────

/**
 * O botão de um plano ou adicional.
 *
 * Vai para o WhatsApp com a mensagem já escrita, dizendo qual plano a
 * pessoa clicou -- sem isso, toda conversa começava com "qual plano você
 * quer?" e metade das pessoas não respondia. Sem WhatsApp configurado, cai
 * no formulário da página, que é o caminho que sempre existiu.
 */
function BotaoComercial({
  mensagem,
  children,
  variante = "primary",
  className,
}: {
  mensagem: string;
  children: ReactNode;
  variante?: "primary" | "secondary";
  className?: string;
}) {
  const whatsapp = linkWhatsappMenuFacil(mensagem);
  if (!whatsapp) {
    return (
      <BotaoDoForm variante={variante} className={className}>
        {children}
      </BotaoDoForm>
    );
  }
  return (
    <a
      href={whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonClasses(variante, "lg"), className)}
    >
      {children}
    </a>
  );
}

function CartaoDoPlano({ plano }: { plano: Plano }) {
  const { icone: Icone, destaque } = plano;
  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-card bg-surface p-6 sm:p-7",
        destaque
          ? "border-2 border-brand shadow-[0_24px_60px_-28px_rgb(249_104_11/0.6)] lg:-my-4 lg:py-10"
          : "border border-line",
      )}
    >
      {plano.selo ? (
        <span className="absolute top-5 right-5 rounded-full bg-brand px-2.5 py-1 text-[0.62rem] font-extrabold tracking-wide text-brand-ink uppercase sm:top-6 sm:right-6">
          {plano.selo}
        </span>
      ) : null}

      <div className="flex items-start gap-3 pr-20">
        <span className="grid size-11 shrink-0 place-items-center rounded-[0.85rem] bg-brand-soft text-brand">
          <Icone className="size-[1.3rem]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg leading-tight font-extrabold">{plano.nome}</h3>
          <p className="mt-1 text-sm leading-snug text-muted">{plano.resumo}</p>
        </div>
      </div>

      <p className="mt-6 flex items-end gap-1.5">
        <span className="text-[2.5rem] leading-none font-extrabold tracking-tight text-brand">{plano.preco}</span>
        <span className="pb-1.5 text-sm font-bold text-muted">{plano.periodo}</span>
      </p>

      <div className="mt-6 flex-1 border-t border-line pt-6">
        <p className="text-sm font-extrabold">{plano.tituloDosItens}</p>
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {plano.itens.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[0.85rem] leading-snug">
              <Check className="mt-0.5 size-3.5 shrink-0 text-brand" strokeWidth={3.2} aria-hidden="true" />
              <span className="text-muted">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* o botão desce para o rodapé do cartão: com listas de tamanhos
          diferentes, os três terminam na mesma linha */}
      <BotaoComercial
        mensagem={plano.mensagem}
        variante={destaque ? "primary" : "secondary"}
        className="mt-7 w-full"
      >
        {plano.botao}
        <ArrowRight className="size-4" aria-hidden="true" />
      </BotaoComercial>
    </div>
  );
}

export function Planos() {
  return (
    <section id={SECOES.planos} className="scroll-mt-20">
      <Titulo centro etiqueta="Planos" sub={PLANOS_TEXTO.texto}>
        {PLANOS_TEXTO.titulo}
      </Titulo>

      {/* No computador os três se comparam lado a lado e o destacado cresce
          para fora da linha. No celular empilham, e aí o destaque vira só a
          borda: crescer não diz nada quando se vê um de cada vez. */}
      <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {PLANOS.map((plano) => (
          <CartaoDoPlano key={plano.nome} plano={plano} />
        ))}
      </div>

      <p className="mt-7 text-center text-sm text-muted">
        Sem taxa de adesão e sem comissão por pedido. Troque de plano quando quiser.
      </p>
    </section>
  );
}

function CartaoDoAdicional({ adicional }: { adicional: Adicional }) {
  const { icone: Icone, tom, disponivel } = adicional;
  return (
    <div className="flex h-full flex-col rounded-card border border-line bg-surface p-6 sm:p-7">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-[0.85rem]",
            tom === "brand" ? "bg-brand-soft text-brand" : "bg-info/12 text-info",
          )}
        >
          <Icone className="size-[1.3rem]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="text-lg leading-tight font-extrabold">{adicional.nome}</h3>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[0.62rem] font-extrabold tracking-wide uppercase",
                disponivel ? "bg-surface-2 text-muted" : "bg-warning/15 text-warning",
              )}
            >
              {disponivel ? "Adicional" : "Em breve"}
            </span>
          </div>
          <p className="mt-1 text-sm leading-snug text-muted">{adicional.resumo}</p>
        </div>
      </div>

      {/* sem preço definido, não se inventa um número: diz-se o que é */}
      <p className="mt-5 flex items-end gap-1.5">
        {adicional.preco ? (
          <>
            <span className="text-[1.9rem] leading-none font-extrabold tracking-tight">{adicional.preco}</span>
            <span className="pb-1 text-sm font-bold text-muted">{adicional.periodo}</span>
          </>
        ) : (
          <span className="text-base font-extrabold text-muted">{adicional.notaDePreco}</span>
        )}
      </p>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5 border-t border-line pt-5">
        {adicional.itens.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[0.85rem] leading-snug">
            <Check
              className={cn("mt-0.5 size-3.5 shrink-0", tom === "brand" ? "text-brand" : "text-info")}
              strokeWidth={3.2}
              aria-hidden="true"
            />
            <span className="text-muted">{item}</span>
          </li>
        ))}
      </ul>

      <BotaoComercial mensagem={adicional.mensagem} variante="secondary" className="mt-7 w-full">
        {adicional.botao}
      </BotaoComercial>
    </div>
  );
}

export function Adicionais() {
  return (
    <section
      id={SECOES.adicionais}
      className="-mx-5 scroll-mt-20 bg-surface-2 px-5 py-10 sm:-mx-6 sm:px-6 sm:py-14 lg:rounded-card"
    >
      <Titulo centro etiqueta={ADICIONAIS_TEXTO.etiqueta} sub={ADICIONAIS_TEXTO.texto}>
        {ADICIONAIS_TEXTO.titulo}
      </Titulo>

      <div className="mx-auto grid max-w-4xl items-stretch gap-5 sm:grid-cols-2">
        {ADICIONAIS.map((adicional) => (
          <CartaoDoAdicional key={adicional.nome} adicional={adicional} />
        ))}
      </div>

      <p className="mx-auto mt-7 max-w-2xl text-center text-sm text-muted">{ADICIONAIS_TEXTO.nota}</p>
    </section>
  );
}

// ─── 5. totem, quem já usa, conversa ──────────────────────────────────

/** o depoimento só aparece quando existe um de verdade (ver conteudo.ts) */
export function Depoimentos() {
  if (!DEPOIMENTOS.length) return null;
  return (
    <section id={SECOES.depoimentos} className="scroll-mt-20">
      <Titulo centro sub="Restaurantes que confiam no MenuFácil.">
        Quem já usa
      </Titulo>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DEPOIMENTOS.map((d) => (
          <li key={d.restaurante} className="flex flex-col rounded-card border border-line bg-surface p-6">
            <p className="text-[0.95rem] leading-relaxed text-pretty">“{d.texto}”</p>
            <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
              <LogoIcon className="h-8 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold">{d.restaurante}</span>
                <span className="block truncate text-xs text-faint">{d.quem ? `${d.quem} · ${d.praca}` : d.praca}</span>
              </span>
            </div>
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
        centro
        etiqueta="Quem já usa"
        sub="Abra um e faça um pedido: é exatamente assim que o seu vai ficar."
      >
        {total === 1 ? "Nosso parceiro" : "Nossos parceiros"}
      </Titulo>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{children}</div>
    </section>
  );
}

// ─── 6. dúvidas ───────────────────────────────────────────────────────

export function Duvidas() {
  const perguntas = DUVIDAS.filter((d) => d.a.trim());
  if (!perguntas.length) return null;
  return (
    <section id={SECOES.duvidas} className="scroll-mt-20">
      <Titulo centro>Perguntas frequentes</Titulo>
      <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
        {perguntas.map(({ q, a }) => (
          <details key={q} className="drawer group rounded-card border border-line bg-surface">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 font-extrabold [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown
                className="size-5 shrink-0 text-faint transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="px-5 pb-5 text-[0.95rem] leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ─── 7. a conversa final ──────────────────────────────────────────────

export function ChamadaFinal({ whatsapp }: { whatsapp: string | null }) {
  return (
    <section className="flex flex-col gap-6 rounded-card bg-brand px-6 py-8 text-brand-ink sm:px-9 sm:py-10">
      <div className="min-w-0">
        <p className="font-script text-2xl leading-none sm:text-3xl">{FINAL.recado}</p>
        <h2 className="mt-2.5 text-[1.35rem] leading-tight font-extrabold text-balance sm:text-[1.75rem]">
          {FINAL.titulo}
        </h2>
        <p className="mt-2 text-sm text-pretty opacity-85 sm:text-base">{FINAL.texto}</p>
      </div>
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-13 w-full shrink-0 items-center justify-center gap-2 rounded-control bg-brand-ink px-6 font-extrabold text-bg transition-opacity hover:opacity-90 sm:w-auto sm:self-start"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          {FINAL.botao}
        </a>
      ) : (
        <BotaoDoForm variante="secondary" className="w-full sm:w-auto sm:self-start">
          {FINAL.botao}
        </BotaoDoForm>
      )}
    </section>
  );
}
