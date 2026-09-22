import { ArrowRight, ChefHat, Eye, ImageOff, MapPin, MessageCircle, Smartphone, Star, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoIcon, LogoMark } from "@/components/brand/logo";
import { CategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/cn";

/** a cúpula da marca com raios e coração, como na arte de referência */
function HeroCloche({ className }: { className?: string }) {
  return (
    <svg viewBox="20 -70 880 690" fill="none" aria-hidden="true" className={cn("text-brand", className)}>
      <g stroke="currentColor" strokeLinecap="round" strokeWidth="22">
        <path d="M452 30V-30" />
        <path d="M279 76L249 24" />
        <path d="M625 76L655 24" />
        <path d="M153 202L101 172" />
        <path d="M751 202L803 172" />
        <path d="M44 262H92" />
        <path d="M812 262H860" />
      </g>
      <path
        d="M800 118C744 80 742 30 772 22C786 18 798 28 800 42C802 28 814 18 828 22C858 30 856 80 800 118Z"
        stroke="currentColor"
        strokeWidth="18"
        strokeLinejoin="round"
      />
      <LogoMark />
    </svg>
  );
}

export function Hero({ hasRestaurants, city }: { hasRestaurants: boolean; city: string | null }) {
  const script = hasRestaurants ? ["Feito na hora,", "pertinho", "de você!"] : ["Em breve,", "novos sabores", "por aqui!"];
  return (
    <section className="relative isolate overflow-hidden rounded-card border border-line bg-surface">
      {/* foto escura de fundo, com o texto sempre legível à esquerda */}
      <Image
        src="/demo/home/destaque.webp"
        alt=""
        fill
        priority
        sizes="(min-width: 1280px) 56rem, 100vw"
        className="-z-20 object-cover object-right opacity-75"
      />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#0c1119_0%,#0c1119_30%,rgb(12_17_25/0.8)_55%,rgb(12_17_25/0.45)_78%,rgb(12_17_25/0.25)_100%)]"
        aria-hidden="true"
      />
      <div className="grid grid-cols-[1.35fr_1fr] items-center gap-1 px-4 py-4 sm:gap-6 sm:p-9">
        <div className="min-w-0">
          <h1 className="text-[1.32rem] leading-[1.1] font-extrabold tracking-tight min-[400px]:text-[1.42rem] sm:text-4xl xl:text-5xl">
            {hasRestaurants ? (
              <>
                Bateu a fome? Peça <span className="text-brand">direto</span> do restaurante.
              </>
            ) : (
              <>
                Ainda não tem um restaurante <span className="text-brand">cadastrado</span> aqui?
              </>
            )}
          </h1>
          <p className="mt-2 text-[0.72rem] leading-snug text-ink/80 sm:mt-4 sm:max-w-md sm:text-lg">
            {hasRestaurants
              ? `Cardápio atualizado e pagamento por Pix, cartão ou dinheiro${city ? ` em ${city}` : ""}, sem cadastro.`
              : "Seja bem-vindo ao MenuFácil! Aqui você encontra os melhores restaurantes, lanchonetes e muito mais da sua região."}
          </p>
          <Link
            href="/restaurantes"
            className="mt-3 inline-flex h-9 items-center rounded-control bg-brand px-4 text-[0.8rem] font-extrabold text-brand-ink shadow-lg shadow-brand/20 transition hover:bg-brand-hover active:scale-[0.98] sm:mt-6 sm:h-12 sm:px-7 sm:text-base"
          >
            Ver restaurantes
          </Link>
        </div>
        <div className="flex flex-col items-center">
          <HeroCloche className="w-full max-w-[6.6rem] drop-shadow-[0_0_16px_rgb(255_138_31/0.45)] sm:max-w-[13rem]" />
          <p className="mt-1.5 -rotate-12 self-end text-right font-script text-[0.98rem] leading-[1.02] text-ink sm:mt-4 sm:text-3xl">
            {script.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <svg viewBox="0 0 120 12" className="mt-0.5 ml-auto h-2 w-16 text-brand sm:h-3 sm:w-28" aria-hidden="true">
              <path d="M2 10c30-6 70-9 116-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
            </svg>
          </p>
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({ title, description, action }: { title: ReactNode; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4 sm:mb-4">
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold sm:text-2xl">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CategoryStrip({
  categories,
  current,
}: {
  categories: { slug: string; name: string; icon: string | null }[];
  current?: string | null;
}) {
  // no celular, ~6 fichas por tela, como na referência; o resto rola para o lado
  const tile = (active: boolean) =>
    cn(
      "flex shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-control border font-bold transition-colors",
      "h-[4.4rem] w-[3.9rem] text-[0.68rem] sm:h-24 sm:w-24 sm:gap-2 sm:rounded-card sm:text-sm",
      active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-ink/85 hover:border-line-strong hover:text-ink",
    );
  return (
    <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:gap-3 sm:px-0">
      <Link href="/restaurantes" className={tile(!current)} aria-current={!current ? "page" : undefined}>
        <LogoIcon className={cn("h-6 sm:h-8", current && "text-ink/85")} />
        Todos
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/restaurantes?categoria=${c.slug}`}
          className={tile(current === c.slug)}
          aria-current={current === c.slug ? "page" : undefined}
        >
          <CategoryIcon name={c.icon} className="size-6 sm:size-7" />
          <span className="max-w-full truncate px-1">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}

/** cartão "Em breve" quando ainda não há restaurante no ar */
export function PlaceholderCard({ categories }: { categories: string }) {
  return (
    <div className="flex h-full flex-col rounded-card border border-line bg-surface p-2">
      <div className="relative grid aspect-[16/10] place-items-center rounded-control bg-surface-3 text-line-strong">
        <ImageOff className="size-10" strokeWidth={1.4} aria-hidden="true" />
        <span className="absolute top-2 right-2 rounded-full bg-bg/70 px-2.5 py-0.5 text-[0.7rem] font-bold text-muted">Em breve</span>
      </div>
      <div className="flex flex-col gap-1 px-1.5 pt-2.5 pb-1">
        <p className="text-[0.95rem] font-extrabold">Nome do restaurante</p>
        <p className="text-xs text-muted">{categories}</p>
        <p className="flex items-center gap-1 text-xs text-muted">
          <MapPin className="size-3.5" aria-hidden="true" />
          Presidente Figueiredo - AM
        </p>
        <p className="flex items-center gap-1 text-xs text-muted">
          <Star className="size-3.5 fill-brand text-brand" aria-hidden="true" />
          Novidade
        </p>
      </div>
    </div>
  );
}

const steps = [
  { title: "Faça seu cadastro", text: "Informe os dados do seu restaurante." },
  { title: "Envie seu cardápio", text: "Adicione os produtos, fotos e preços." },
  { title: "Aguarde a aprovação", text: "Nossa equipe vai analisar seu cadastro." },
  { title: "Comece a receber pedidos", text: "Seus clientes já podem fazer pedidos pelo WhatsApp." },
];

export function HowItWorks() {
  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-7">
      <div className="flex items-start gap-3">
        <ChefHat className="mt-0.5 size-6 shrink-0 text-ink sm:size-7" strokeWidth={1.6} aria-hidden="true" />
        <div>
          <h2 className="text-base font-extrabold sm:text-xl">Como funciona?</h2>
          <p className="text-xs text-muted sm:text-sm">Em poucos passos você já pode estar no MenuFácil e receber pedidos.</p>
        </div>
      </div>
      {/* quatro passos na mesma linha, também no celular */}
      <ol className="mt-4 grid grid-cols-4 divide-x divide-line sm:mt-6">
        {steps.map((s, i) => (
          <li key={s.title} className="px-2 first:pl-0 last:pr-0 sm:px-4">
            <span className="grid size-6 place-items-center rounded-full bg-brand text-xs font-extrabold text-brand-ink sm:size-8 sm:text-base">
              {i + 1}
            </span>
            <p className="mt-2 text-[0.7rem] leading-tight font-extrabold sm:text-base">{s.title}</p>
            <p className="mt-1 text-[0.62rem] leading-snug text-muted sm:text-sm">{s.text}</p>
          </li>
        ))}
      </ol>
      <Link href="/cadastre-seu-restaurante" className="mt-6 hidden items-center gap-1.5 font-bold text-brand hover:underline sm:inline-flex">
        Quero cadastrar meu restaurante
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

const reasons = [
  { icon: Eye, title: "Mais visibilidade", text: "Seu restaurante aparece para mais pessoas da região." },
  { icon: Smartphone, title: "Praticidade", text: "Cardápio digital, sem papel e sem complicação." },
  { icon: MessageCircle, title: "Pedidos pelo WhatsApp", text: "O pedido chega organizado no WhatsApp do restaurante." },
  { icon: Zap, title: "Simples e rápido", text: "Tudo em um só lugar, de forma fácil e intuitiva." },
];

export function WhyMenuFacil() {
  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <h2 className="text-xl leading-tight font-extrabold">Por que usar o MenuFácil?</h2>
      <ul className="mt-5 flex flex-col gap-5">
        {reasons.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-brand/50 text-brand">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-extrabold">{title}</span>
              <span className="block text-sm text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
