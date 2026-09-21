import { ArrowRight, ChefHat, Eye, ImageOff, MapPin, MessageCircle, Smartphone, Star, Zap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClasses } from "@/components/ui/button";
import { CategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/cn";

/** a cúpula com raios e coração da referência, em traço laranja */
function ClocheArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 170" fill="none" aria-hidden="true" className={cn("text-brand", className)}>
      <g stroke="currentColor" strokeLinecap="round" strokeWidth="5">
        {/* raios */}
        <path d="M110 14v14M72 26l7 12M148 26l-7 12M44 52l12 7M176 52l-12 7" />
        {/* cúpula */}
        <circle cx="110" cy="48" r="6" />
        <path d="M110 54v6" />
        <path d="M40 118a70 70 0 0 1 140 0" strokeWidth="6" />
        <path d="M58 92h104" strokeWidth="4" opacity=".7" />
        <path d="M28 120h164" strokeWidth="6" />
        <path d="M44 132c18 12 40 17 66 17s48-5 66-17" strokeWidth="6" />
      </g>
      {/* coração */}
      <path
        d="M196 60c-4-9-17-7-17 3 0 8 17 18 17 18s17-10 17-18c0-10-13-12-17-3z"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Hero({ hasRestaurants, city }: { hasRestaurants: boolean; city: string | null }) {
  return (
    <section className="relative overflow-hidden rounded-card border border-line bg-surface">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_40%,rgb(255_138_31/0.22),transparent_55%),radial-gradient(ellipse_at_10%_100%,rgb(90_60_30/0.35),transparent_60%)]"
        aria-hidden="true"
      />
      <div className="relative grid gap-4 p-6 sm:grid-cols-[1.2fr_1fr] sm:items-center sm:p-9">
        <div>
          <h1 className="text-3xl leading-[1.1] font-extrabold sm:text-4xl xl:text-5xl">
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
          <p className="mt-4 max-w-md text-muted sm:text-lg">
            {hasRestaurants
              ? `Cardápio atualizado, pedido rápido e pagamento por Pix${city ? ` em ${city}` : ""}. Sem cadastro e sem taxa para você.`
              : "Seja bem-vindo ao MenuFácil! Aqui você encontra os melhores restaurantes, lanchonetes e muito mais da sua região."}
          </p>
          <Link href="/restaurantes" className={buttonClasses("primary", "md", "mt-6")}>
            Ver restaurantes
          </Link>
        </div>
        <div className="relative mx-auto flex w-full max-w-xs flex-col items-center sm:max-w-sm">
          <ClocheArt className="w-44 sm:w-56" />
          <p className="-mt-2 rotate-[-8deg] self-end font-script text-2xl leading-tight text-ink sm:text-3xl">
            {hasRestaurants ? "Feito na hora, pertinho de você!" : "Em breve, novos sabores por aqui!"}
            <svg viewBox="0 0 120 12" className="mt-1 ml-auto h-3 w-28 text-brand" aria-hidden="true">
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
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-extrabold sm:text-2xl">{title}</h2>
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
  const tile = (active: boolean) =>
    cn(
      "flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-2 rounded-card border text-sm font-bold transition-colors",
      active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-ink",
    );
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <Link href="/restaurantes" className={tile(!current)} aria-current={!current ? "page" : undefined}>
        <ChefHat className="size-7" strokeWidth={1.7} aria-hidden="true" />
        Todos
      </Link>
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/restaurantes?categoria=${c.slug}`}
          className={tile(current === c.slug)}
          aria-current={current === c.slug ? "page" : undefined}
        >
          <CategoryIcon name={c.icon} className="size-7" />
          <span className="max-w-full truncate px-1">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}

/** cartão "Em breve" quando ainda não há restaurante no ar */
export function PlaceholderCard({ categories }: { categories: string }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
      <div className="relative grid aspect-[16/9] place-items-center bg-surface-2 text-line-strong">
        <ImageOff className="size-12" strokeWidth={1.4} aria-hidden="true" />
        <span className="absolute top-3 right-3 rounded-full bg-surface-3 px-2.5 py-1 text-xs font-bold text-muted">Em breve</span>
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <p className="font-extrabold">Seu restaurante aqui</p>
        <p className="text-sm text-muted">{categories}</p>
        <p className="flex items-center gap-1.5 text-sm text-faint">
          <MapPin className="size-4" aria-hidden="true" />
          Presidente Figueiredo - AM
        </p>
        <p className="flex items-center gap-1.5 text-sm text-faint">
          <Star className="size-4 fill-brand/40 text-brand/60" aria-hidden="true" />
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
    <section className="rounded-card border border-line bg-surface p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <ChefHat className="mt-0.5 size-7 shrink-0 text-ink" strokeWidth={1.6} aria-hidden="true" />
        <div>
          <h2 className="text-xl font-extrabold">Como funciona?</h2>
          <p className="text-sm text-muted">Em poucos passos você já pode estar no MenuFácil e receber pedidos.</p>
        </div>
      </div>
      <ol className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:divide-x lg:divide-line">
        {steps.map((s, i) => (
          <li key={s.title} className="lg:px-4 lg:first:pl-0">
            <span className="grid size-8 place-items-center rounded-full bg-brand font-extrabold text-brand-ink">{i + 1}</span>
            <p className="mt-2 font-extrabold">{s.title}</p>
            <p className="text-sm text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      <Link href="/cadastre-seu-restaurante" className="mt-6 inline-flex items-center gap-1.5 font-bold text-brand hover:underline">
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
