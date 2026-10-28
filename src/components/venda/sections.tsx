import {
  ArrowDown,
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  Store,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoIcon } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { linkWhatsappMenuFacil } from "@/lib/contato";

import { CadastroRapido } from "./contato-rapido";
import {
  ADICIONAIS,
  ADICIONAIS_TEXTO,
  ANTES_DEPOIS,
  DEMO_URL,
  DEPOIMENTOS,
  DUVIDAS,
  FINAL,
  PLANOS,
  PLANOS_TEXTO,
  PROMESSAS,
  SECOES,
  SEGMENTOS,
  SEGMENTOS_TEXTO,
  SOLUCOES_TEXTO,
  TOPO,
  type Adicional,
  type Contraste,
  type Plano,
} from "./conteudo";
import { Solucoes as AbasDeSolucoes } from "./solucoes";

// A página do MenuFácil: é a home e é a página de venda, porque são a mesma
// coisa. Quem chega aqui é dono de restaurante, quase sempre pelo Instagram
// e pelo celular.
//
// A estrutura segue a das páginas de sistema para restaurante que ele usou
// de referência: topo escuro com o cadastro de um campo só, o antes e
// depois, as soluções em abas, os tipos de negócio e uma chamada final
// escura. As cores e os textos são do MenuFácil, e nenhum número, cliente
// ou depoimento aparece sem existir de verdade.
//
// Os textos que mudam com o tempo (preço, plano, links, perguntas) estão em
// conteudo.ts.

/** a largura do conteúdo, com a margem do celular */
function Miolo({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-6", className)}>{children}</div>;
}

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
    <a href={`#${SECOES.cadastro}`} className={cn(buttonClasses(variante, "lg"), className)}>
      {children}
    </a>
  );
}

/** a etiqueta quadriculada que abre cada seção */
function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <p className="etiqueta-grade mx-auto mb-5 w-fit rounded-2xl border border-brand/25 bg-brand-soft px-5 py-2 text-[0.92rem] font-bold text-ink">
      {children}
    </p>
  );
}

/** o cabeçalho de uma seção: etiqueta, título com destaque, uma linha de apoio */
function Titulo({
  children,
  destaque,
  sub,
  etiqueta,
}: {
  children: ReactNode;
  destaque?: string;
  sub?: string;
  etiqueta?: string;
}) {
  return (
    <div className="mx-auto mb-9 max-w-2xl text-center sm:mb-12">
      {etiqueta && <Etiqueta>{etiqueta}</Etiqueta>}
      <h2 className="text-[2rem] leading-[1.1] font-extrabold tracking-tight text-balance sm:text-[2.6rem]">
        {children}
        {destaque && (
          <>
            {" "}
            <span className="text-brand">{destaque}</span>
          </>
        )}
      </h2>
      {sub && <p className="mx-auto mt-4 max-w-xl text-[1.05rem] leading-relaxed text-pretty text-muted sm:text-lg">{sub}</p>}
    </div>
  );
}

/** os quatro "sem" e "com", com o visto verde */
function Promessas({ className, escuro }: { className?: string; escuro?: boolean }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-3.5", className)}>
      {PROMESSAS.map(({ title }) => (
        <li key={title} className="flex items-start gap-2">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          <span className={cn("text-[0.88rem] leading-snug", escuro ? "text-white/75" : "text-muted")}>{title}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── 1. topo ──────────────────────────────────────────────────────────

export function Topo() {
  return (
    <section id={SECOES.topo} className="palco-noite scroll-mt-20 text-white">
      <Miolo className="grid items-center gap-12 pt-12 pb-14 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-24">
        <div className="min-w-0 text-center lg:text-left">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-4 py-2 text-sm text-white/80 lg:mx-0">
            <Store className="size-4 text-brand" aria-hidden="true" />
            <strong className="font-extrabold text-white">{TOPO.etiqueta}</strong>
          </p>

          <h1 className="mt-6 text-[2.35rem] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-[3.2rem] lg:text-[3.5rem]">
            {TOPO.titulo} <span className="text-brand">{TOPO.tituloDestaque}</span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-[1.05rem] leading-relaxed text-pretty text-white/70 sm:text-lg lg:mx-0">
            {TOPO.texto}
          </p>

          <Promessas escuro className="mt-9 hidden max-w-md lg:grid" />
        </div>

        <div className="min-w-0">
          <CadastroRapido />
          {/* para quem quer ver antes de falar: um cardápio de verdade */}
          <Link
            href={DEMO_URL}
            target="_blank"
            rel="noopener"
            className="mx-auto mt-5 flex w-fit items-center gap-1.5 text-sm font-bold text-white/70 underline-offset-4 hover:text-white hover:underline"
          >
            {TOPO.secundario}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </Miolo>
    </section>
  );
}

/** logo abaixo do topo: os quatro vistos (no celular) e os restaurantes que já usam */
export type NaVitrine = { slug: string; name: string; logoUrl: string | null };

/**
 * Um restaurante na esteira: a logo e o nome soltos, sem moldura em volta
 * (com moldura parecia botão). A cada dois, um vem cheio (logo colorida) e o
 * outro só no traço: contorno na logo, logo apagada, nome em cinza --
 * com um cliente só, é o que faz a faixa andar sem parecer o mesmo
 * adesivo colado várias vezes.
 */
function Selo({ r, traco, escondido }: { r: NaVitrine; traco: boolean; escondido: boolean }) {
  return (
    <Link
      href={`/restaurante/${r.slug}`}
      tabIndex={traco || escondido ? -1 : undefined}
      aria-hidden={traco || escondido || undefined}
      className={cn(
        "flex shrink-0 items-center gap-2.5 px-3 py-1.5 text-sm font-extrabold whitespace-nowrap transition-colors",
        traco ? "text-faint" : "hover:text-brand",
      )}
    >
      <span
        className={cn(
          "relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full",
          traco ? "border border-line-strong" : "bg-surface",
        )}
      >
        {r.logoUrl ? (
          <Image
            src={r.logoUrl}
            alt=""
            fill
            sizes="32px"
            className={cn("object-cover", traco && "opacity-35 grayscale")}
          />
        ) : (
          <LogoIcon className={cn("h-5", traco ? "opacity-30 grayscale" : "opacity-60")} />
        )}
      </span>
      {r.name}
    </Link>
  );
}

/** logo abaixo do topo: os quatro vistos (no celular) e os restaurantes passando */
export function QuemJaUsa({ restaurantes }: { restaurantes: NaVitrine[] }) {
  // Uma volta da esteira precisa ser mais larga que a tela, senão abre um
  // buraco antes de ela recomeçar: os restaurantes se repetem até dar 14 (uns 2.100px, mais que uma tela larga).
  const volta = Array.from({ length: 14 }, (_, i) => restaurantes[i % Math.max(restaurantes.length, 1)]);
  return (
    <section className="pt-9 sm:pt-12">
      <Miolo>
        <Promessas className="mx-auto max-w-md lg:hidden" />
      </Miolo>
      {restaurantes.length > 0 && (
        <div className="mt-10 border-t border-line pt-9 lg:mt-0 lg:border-0 lg:pt-0">
          <p className="px-5 text-center text-[0.72rem] font-extrabold tracking-[0.16em] text-faint uppercase">
            Restaurantes que já usam o MenuFácil
          </p>
          {/* duas voltas iguais lado a lado: quando a primeira sai, a
              segunda está no lugar dela, e a animação recomeça sem salto.
              As bordas somem num degradê para ninguém ver a emenda. */}
          <div className="group mt-5 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
            <div className="flex w-max animate-[esteira_45s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
              {[0, 1].map((copia) => (
                <div key={copia} className="flex gap-3 pr-3" aria-hidden={copia === 1 || undefined}>
                  {volta.map((r, i) => (
                    <Selo key={i} r={r} traco={i % 2 === 1} escondido={copia === 1} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── 2. o filme ───────────────────────────────────────────────────────

/**
 * O vídeo de lançamento.
 *
 * Não começa sozinho: ele tem narração, e vídeo que fala sem ninguém pedir
 * é o tipo de coisa que faz a pessoa fechar a aba. Fica parado na capa, com
 * o controle do navegador, e só toca quando o visitante quiser.
 *
 * `preload="none"` para não baixar 2,7 MB de quem nunca vai apertar o play;
 * a capa é uma imagem de 50 KB que já mostra o sistema.
 */
export function Filme() {
  return (
    <section id={SECOES.filme} className="scroll-mt-20 py-16 sm:py-24">
      <Miolo>
        <Titulo etiqueta="Em 55 segundos" sub="Do pedido do cliente à comanda na cozinha, com o sistema rodando de verdade.">
          Veja o MenuFácil funcionando
        </Titulo>
        <figure className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-[1.6rem] border border-line bg-[#0a0706] shadow-[0_40px_90px_-50px_rgb(0_0_0/0.6)]">
            <video
              className="block aspect-video w-full"
              controls
              playsInline
              preload="none"
              poster="/venda/lancamento-poster.jpg"
            >
              <source src="/venda/lancamento.mp4" type="video/mp4" />
              O seu navegador não abre vídeo. Fale com a gente no WhatsApp que mostramos o sistema por chamada.
            </video>
          </div>
          <figcaption className="mt-4 text-center text-sm text-muted">
            As telas do vídeo são as do sistema, gravadas como ele funciona hoje.
          </figcaption>
        </figure>
      </Miolo>
    </section>
  );
}

// ─── 3. antes e depois ────────────────────────────────────────────────

/**
 * As fotos do alto dos cartões. São de banco de imagens gratuito (Pexels,
 * licença livre para uso comercial, sem crédito obrigatório):
 *  - sem: https://www.pexels.com/photo/man-with-laptop-in-restaurant-5163390/
 *  - com: https://www.pexels.com/photo/exited-ethnic-waitress-working-with-cash-desk-in-cozy-cafeteria-4473496/
 */
const FOTOS = {
  sem: { src: "/venda/sem-menufacil.jpg", alt: "Dono de restaurante com as mãos na cabeça, preocupado, numa mesa cheia de papéis", posicao: "object-[50%_30%]" },
  com: { src: "/venda/com-menufacil.jpg", alt: "Atendente sorrindo enquanto lança um pedido na tela do caixa", posicao: "object-[60%_35%]" },
};

function FotoDoCartao({ tipo }: { tipo: "sem" | "com" }) {
  const foto = FOTOS[tipo];
  return (
    <div className="relative h-48 overflow-hidden sm:h-56">
      <Image
        src={foto.src}
        alt={foto.alt}
        fill
        sizes="(min-width: 1024px) 30rem, 92vw"
        className={cn("object-cover", foto.posicao)}
      />
      {/* um véu por cima, para a etiqueta ler bem em qualquer foto */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0",
          tipo === "sem"
            ? "bg-gradient-to-b from-black/55 via-black/25 to-black/40"
            : "bg-gradient-to-b from-black/45 via-transparent to-black/20",
        )}
      />
    </div>
  );
}

function CartaoDeContraste({ tipo, itens }: { tipo: "sem" | "com"; itens: Contraste[] }) {
  const sem = tipo === "sem";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.6rem] border bg-bg shadow-[0_24px_50px_-36px_rgb(0_0_0/0.4)]",
        sem ? "border-danger/20" : "border-success/25",
      )}
    >
      <div className="relative">
        <FotoDoCartao tipo={tipo} />
        <span
          className={cn(
            "absolute top-5 left-5 flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[0.78rem] font-extrabold tracking-[0.08em] uppercase backdrop-blur",
            sem ? "border-danger/40 bg-[#3b1210]/80 text-[#ffb4a8]" : "border-success/40 bg-[#0f3520]/80 text-[#a7f3c0]",
          )}
        >
          {sem ? <CircleX className="size-4" aria-hidden="true" /> : <CircleCheck className="size-4" aria-hidden="true" />}
          {sem ? "Sem MenuFácil" : "Com MenuFácil"}
        </span>
      </div>

      <ul className="flex flex-col gap-5 px-5 py-6 sm:px-7 sm:py-7">
        {itens.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-4">
            <span
              className={cn(
                "grid size-12 shrink-0 place-items-center rounded-full",
                sem ? "bg-danger/8 text-danger" : "bg-success/10 text-success",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="leading-tight font-extrabold">{title}</p>
              <p className="mt-1 text-[0.92rem] leading-snug text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AntesEDepois() {
  return (
    <section id={SECOES.antes} className="scroll-mt-20 bg-surface/60 py-16 sm:py-24">
      <Miolo>
        <Titulo etiqueta={ANTES_DEPOIS.etiqueta} sub={ANTES_DEPOIS.texto}>
          {ANTES_DEPOIS.titulo}
        </Titulo>
        <div className="mx-auto grid max-w-5xl items-center gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
          <CartaoDeContraste tipo="sem" itens={ANTES_DEPOIS.sem} />
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
            <ArrowDown className="size-5 lg:-rotate-90" aria-hidden="true" />
          </span>
          <CartaoDeContraste tipo="com" itens={ANTES_DEPOIS.com} />
        </div>
      </Miolo>
    </section>
  );
}

// ─── 4. soluções ──────────────────────────────────────────────────────

export function Solucoes() {
  return (
    <section id={SECOES.recursos} className="scroll-mt-20 py-16 sm:py-24">
      <Miolo>
        <Titulo etiqueta={SOLUCOES_TEXTO.etiqueta} destaque={SOLUCOES_TEXTO.tituloDestaque} sub={SOLUCOES_TEXTO.texto}>
          {SOLUCOES_TEXTO.titulo}
        </Titulo>
        <AbasDeSolucoes />
      </Miolo>
    </section>
  );
}

// ─── 5. tipos de negócio ──────────────────────────────────────────────

export function Segmentos() {
  return (
    <section id={SECOES.segmentos} className="scroll-mt-20 bg-surface/60 py-16 sm:py-24">
      <Miolo>
        <Titulo etiqueta={SEGMENTOS_TEXTO.etiqueta} destaque={SEGMENTOS_TEXTO.tituloDestaque} sub={SEGMENTOS_TEXTO.texto}>
          {SEGMENTOS_TEXTO.titulo}
        </Titulo>
        <ul className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {SEGMENTOS.map(({ icon: Icon, nome }) => (
            <li
              key={nome}
              className="flex flex-col items-center gap-4 rounded-[1.4rem] border border-line/70 bg-bg px-3 py-7 text-center"
            >
              <span className="grid size-16 place-items-center rounded-full bg-bg shadow-[0_6px_20px_-8px_rgb(0_0_0/0.25)] ring-1 ring-line/60">
                <Icon className="size-7 text-muted" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span className="font-extrabold text-ink/85">{nome}</span>
            </li>
          ))}
        </ul>
      </Miolo>
    </section>
  );
}

// ─── 6. planos e adicionais ───────────────────────────────────────────

/**
 * O botão de um plano ou adicional.
 *
 * Vai para o WhatsApp com a mensagem já escrita, dizendo qual plano a
 * pessoa clicou -- sem isso, toda conversa começava com "qual plano você
 * quer?" e metade das pessoas não respondia. Sem WhatsApp configurado, cai
 * no cadastro do topo.
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
        "relative flex h-full flex-col rounded-[1.6rem] bg-bg p-6 sm:p-7",
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
    <section id={SECOES.planos} className="scroll-mt-20 py-16 sm:py-24">
      <Miolo>
        <Titulo etiqueta="Planos" sub={PLANOS_TEXTO.texto}>
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
      </Miolo>
    </section>
  );
}

function CartaoDoAdicional({ adicional }: { adicional: Adicional }) {
  const { icone: Icone, tom, disponivel } = adicional;
  return (
    <div className="flex h-full flex-col rounded-[1.6rem] border border-line bg-bg p-6 sm:p-7">
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
    <section id={SECOES.adicionais} className="scroll-mt-20 bg-surface/60 py-16 sm:py-24">
      <Miolo>
        <Titulo etiqueta={ADICIONAIS_TEXTO.etiqueta} sub={ADICIONAIS_TEXTO.texto}>
          {ADICIONAIS_TEXTO.titulo}
        </Titulo>

        <div className="mx-auto grid max-w-4xl items-stretch gap-5 sm:grid-cols-2">
          {ADICIONAIS.map((adicional) => (
            <CartaoDoAdicional key={adicional.nome} adicional={adicional} />
          ))}
        </div>

        <p className="mx-auto mt-7 max-w-2xl text-center text-sm text-muted">{ADICIONAIS_TEXTO.nota}</p>
      </Miolo>
    </section>
  );
}

// ─── 7. depoimentos e dúvidas ─────────────────────────────────────────

/** o depoimento só aparece quando existe um de verdade (ver conteudo.ts) */
export function Depoimentos() {
  if (!DEPOIMENTOS.length) return null;
  return (
    <section id={SECOES.depoimentos} className="scroll-mt-20 py-16 sm:py-24">
      <Miolo>
        <Titulo etiqueta="Depoimentos" sub="Restaurantes que confiam no MenuFácil.">
          Quem já usa
        </Titulo>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DEPOIMENTOS.map((d) => (
            <li key={d.restaurante} className="flex flex-col rounded-[1.6rem] border border-line bg-bg p-6">
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
      </Miolo>
    </section>
  );
}

export function Duvidas() {
  const perguntas = DUVIDAS.filter((d) => d.a.trim());
  if (!perguntas.length) return null;
  return (
    <section id={SECOES.duvidas} className="scroll-mt-20 py-16 sm:py-24">
      <Miolo>
        <Titulo etiqueta="Dúvidas">Perguntas frequentes</Titulo>
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
          {perguntas.map(({ q, a }) => (
            <details key={q} className="drawer group rounded-[1.2rem] border border-line bg-bg">
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
      </Miolo>
    </section>
  );
}

// ─── 8. a chamada final ───────────────────────────────────────────────

export function ChamadaFinal({ whatsapp }: { whatsapp: string | null }) {
  const botao =
    "flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffe3cf] px-8 text-[1.1rem] font-extrabold text-[#8a3300] transition-colors hover:bg-[#ffd5b8] sm:w-auto";
  return (
    <section className="palco-noite py-20 text-white sm:py-28">
      <Miolo className="flex flex-col items-center text-center">
        <LogoIcon className="h-14 opacity-60" />
        <h2 className="mt-8 max-w-2xl text-[2.1rem] leading-[1.1] font-extrabold tracking-tight text-balance sm:text-[2.8rem]">
          {FINAL.titulo} <span className="text-brand">{FINAL.tituloDestaque}</span>?
        </h2>
        <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-pretty text-white/70 sm:text-lg">{FINAL.texto}</p>

        <div className="mt-10 w-full sm:w-auto">
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={botao}>
              <MessageCircle className="size-5" aria-hidden="true" />
              {FINAL.botao}
              <ArrowRight className="size-5" aria-hidden="true" />
            </a>
          ) : (
            <a href={`#${SECOES.cadastro}`} className={botao}>
              {FINAL.botao}
              <ArrowRight className="size-5" aria-hidden="true" />
            </a>
          )}
        </div>

        <ul className="mt-9 flex max-w-xl flex-wrap justify-center gap-x-7 gap-y-3">
          {FINAL.garantias.map((g) => (
            <li key={g} className="flex items-center gap-2 text-[0.92rem] text-white/65">
              <span className="size-2 rounded-full bg-success" aria-hidden="true" />
              {g}
            </li>
          ))}
        </ul>
      </Miolo>
    </section>
  );
}
