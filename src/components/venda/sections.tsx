import {
  ArrowDown,
  ArrowRight,
  BellRing,
  Check,
  CircleCheck,
  CircleX,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  Mic,
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
  LIA,
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
import { Celular, Notebook, TELAS } from "./mockups";
import { Solucoes as AbasDeSolucoes } from "./solucoes";

// A página do MenuFácil: é a home e é a página de venda, porque são a mesma
// coisa. Quem chega aqui é dono de restaurante, quase sempre pelo Instagram
// e pelo celular.
//
// Em 14/11/2026 ela foi modernizada a partir de um estudo em imagem que ele
// aprovou (docs/proposta-site/). O que mudou de lugar ou de cara:
//
//  - o topo ficou claro e passou a mostrar os dois aparelhos (notebook e
//    celular) no lugar do cartão de cadastro, que desceu para a chamada
//    final -- o formulário é o mesmo, com o mesmo envio;
//  - os restaurantes viraram uma esteira de cartões que anda sozinha;
//  - a Lia ganhou uma seção só dela, com a conversa dentro de um celular;
//  - depois das soluções, do vídeo, da Lia e dos planos há um convite.
//
// Depois de publicada, ele achou a página "com muita coisa para ler". A
// rodada seguinte não tirou seção nenhuma: tirou o detalhe da frente. A
// regra passou a ser uma frase por bloco à vista, e o resto atrás de um
// "ver tudo" (a lista completa do plano, os itens do salão e do totem).
// Quem quer o detalhe abre; quem só está passando o olho não tropeça nele.
//
// Nada foi inventado para encher: nenhum cliente, número ou depoimento
// aparece sem existir, e o que a Lia promete é o que ela já faz.
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

/**
 * O cabeçalho de uma seção: o título e uma linha de apoio.
 *
 * Toda seção abria com uma pílula colorida em cima do título ("Soluções",
 * "Planos", "Dúvidas") e fechava o título com uma segunda frase em
 * laranja. Repetido oito vezes, virou a assinatura de página feita por
 * gerador: o olho reconhece o molde antes de ler a primeira palavra. A
 * pílula saiu, e o laranja no título ficou só no topo e na chamada do
 * fim, que são os dois lugares onde ele tem o que destacar.
 */
function Titulo({
  children,
  destaque,
  sub,
  lado = "centro",
}: {
  children: ReactNode;
  destaque?: string;
  sub?: string;
  /**
   * Onde o título se apoia. Tudo centralizado, seção após seção, é a
   * outra metade do molde de página gerada: a página vira uma pilha de
   * blocos iguais. Algumas seções passam a se apoiar na esquerda, com o
   * conteúdo ao lado, e o olho ganha um ritmo para seguir.
   */
  lado?: "centro" | "esquerda";
}) {
  const esquerda = lado === "esquerda";
  return (
    <div className={cn("surge mb-9 sm:mb-12", esquerda ? "max-w-xl text-left" : "mx-auto max-w-2xl text-center")}>
      <h2 className="text-[2rem] leading-[1.1] font-extrabold tracking-tight text-balance sm:text-[2.6rem]">
        {children}
        {destaque && (
          <>
            {" "}
            <span className="text-brand">{destaque}</span>
          </>
        )}
      </h2>
      {sub && (
        <p className={cn("mt-4 max-w-xl text-[1.05rem] leading-relaxed text-pretty text-muted sm:text-lg", !esquerda && "mx-auto")}>{sub}</p>
      )}
    </div>
  );
}

/** os quatro "sem" e "com", com o visto verde */
function Promessas({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-2.5", className)}>
      {PROMESSAS.map(({ title }) => (
        <li key={title} className="flex items-center gap-2">
          <CircleCheck className="size-4 shrink-0 text-brand" aria-hidden="true" />
          <span className="text-[0.9rem] leading-snug font-bold text-muted">{title}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Um convite no fim de uma seção: uma frase e um botão.
 *
 * A página só chamava para a conversa no topo e no fim. Quem se convencia
 * no meio (vendo as soluções, a Lia ou o preço) tinha de rolar até achar
 * um botão. Agora há um convite depois de cada um desses blocos, discreto
 * o bastante para não virar anúncio no meio do texto.
 */
function Convite({ children, texto }: { children: ReactNode; texto: string }) {
  return (
    <div className="surge mx-auto mt-10 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-[1.6rem] border border-line bg-surface px-6 py-5 text-center sm:mt-12 sm:flex-row sm:text-left">
      <p className="text-[1.05rem] leading-snug font-extrabold text-balance">{texto}</p>
      <div className="w-full shrink-0 sm:w-auto [&>a]:w-full sm:[&>a]:w-auto">{children}</div>
    </div>
  );
}

// ─── 1. topo ──────────────────────────────────────────────────────────

/**
 * Os dois aparelhos do topo: o painel no notebook e o cardápio no celular.
 *
 * As telas são capturas do sistema, e não desenhos: o painel é o do
 * restaurante de demonstração e o cardápio é o do Papaléguas, que já está
 * na vitrine da página e é o mesmo que o botão "Ver um cardápio
 * funcionando" abre. O cartãozinho do pedido novo é o único desenho, e por
 * isso não traz nome nem valor.
 *
 * Tudo aqui é enfeite para quem lê com leitor de tela: o texto ao lado já
 * diz o que o sistema faz.
 */
function Aparelhos() {
  return (
    // Tudo parado: os aparelhos e o aviso flutuavam, e ele pediu para tirar
    // o movimento. A Lia entra em pé à esquerda, recortada, com a mão
    // apontando para o painel; o notebook foi um pouco para a direita para
    // dar lugar a ela, e o aviso subiu para o canto de cima.
    //
    // As larguras são casadas: o notebook em 78% tem de altura mais ou
    // menos metade da largura do conjunto, e a Lia em 27% e o celular em
    // 21% ficam um pouco acima e um pouco abaixo disso.
    <div className="relative mx-auto w-full max-w-[32rem] pt-[7%] pb-[6%] lg:max-w-none" aria-hidden="true">
      <div className="ml-[15%] w-[78%]">
        <Notebook tela={TELAS.computador} priority sizes="(min-width: 1024px) 31rem, 78vw" />
      </div>

      <Image
        src={LIA.recorte}
        alt=""
        width={533}
        height={1071}
        priority
        sizes="(min-width: 1024px) 11rem, 27vw"
        className="absolute bottom-0 -left-[2%] h-auto w-[27%] drop-shadow-[0_18px_18px_rgb(29_32_38/0.22)]"
      />

      {/* a posição fica num invólucro: a moldura do celular já é
          `relative`, e as duas classes juntas brigam */}
      <div className="absolute right-0 bottom-0 w-[21%]">
        <Celular tela={TELAS.cardapioReal} priority sizes="(min-width: 1024px) 8rem, 21vw" />
      </div>

      <div className="absolute top-0 right-[2%] flex items-center gap-2.5 rounded-2xl border border-line bg-bg py-2 pr-3.5 pl-2 shadow-[0_22px_36px_-20px_rgb(29_32_38/0.5)] sm:gap-3 sm:py-2.5 sm:pr-4 sm:pl-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand sm:size-9">
          <BellRing className="size-4" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[0.78rem] font-extrabold sm:text-[0.85rem]">Pedido novo no painel</span>
          <span className="block text-[0.68rem] text-muted sm:text-[0.74rem]">Pix pago · comanda impressa</span>
        </span>
      </div>
    </div>
  );
}

export function Topo() {
  return (
    <section id={SECOES.topo} className="palco-claro scroll-mt-20">
      <Miolo className="grid items-center gap-10 pt-9 pb-12 sm:pt-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:pt-16 lg:pb-24">
        <div className="min-w-0 text-center lg:text-left">
          {/* texto solto, sem a pílula em volta: ele pediu para tirar */}
          <p className="flex items-center justify-center gap-2 text-[0.82rem] font-bold text-muted lg:justify-start">
            <Store className="size-4 text-brand" aria-hidden="true" />
            {TOPO.etiqueta}
          </p>

          <h1 className="mt-5 text-[2.4rem] leading-[1.04] font-extrabold tracking-tight text-balance sm:text-[3.1rem] lg:text-[3.4rem]">
            {TOPO.titulo} <span className="block text-brand">{TOPO.tituloDestaque}</span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-[1.05rem] leading-relaxed text-pretty text-muted sm:text-lg lg:mx-0">
            {TOPO.texto}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <BotaoDoForm>
              {TOPO.botao}
              <ArrowRight className="size-5" aria-hidden="true" />
            </BotaoDoForm>
            {/* para quem quer ver antes de falar: um cardápio de verdade */}
            <Link href={DEMO_URL} target="_blank" rel="noopener" className={buttonClasses("secondary", "lg")}>
              {TOPO.secundario}
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <Promessas className="mt-7 justify-center lg:justify-start" />
        </div>

        <Aparelhos />
      </Miolo>
    </section>
  );
}

/** logo abaixo do topo: os restaurantes que já usam, numa esteira que anda sozinha */
export type NaVitrine = { slug: string; name: string; logoUrl: string | null };

/**
 * Um restaurante na esteira: a logo e o nome, soltos, sem cartão em volta.
 *
 * Já foi um cartão com borda e um "Ver o cardápio"; ele pediu para tirar a
 * moldura e deixar a marca correndo sozinha, uma em cor e a seguinte em
 * preto e branco, alternando. Continua sendo um link para o cardápio.
 */
function CartaoDoRestaurante({ r, escondido, mono }: { r: NaVitrine; escondido: boolean; mono: boolean }) {
  return (
    <Link
      href={`/restaurante/${r.slug}`}
      tabIndex={escondido ? -1 : undefined}
      aria-hidden={escondido || undefined}
      className={cn(
        "flex shrink-0 items-center gap-2.5 transition duration-300 hover:opacity-100 hover:grayscale-0",
        mono && "opacity-55 grayscale",
      )}
    >
      <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-surface">
        {r.logoUrl ? (
          <Image src={r.logoUrl} alt="" fill sizes="32px" className="object-cover" />
        ) : (
          <LogoIcon className="h-4 opacity-60" />
        )}
      </span>
      <span className="text-[0.9rem] leading-tight font-extrabold whitespace-nowrap">{r.name}</span>
    </Link>
  );
}

/**
 * Os restaurantes que já usam, passando da direita para a esquerda.
 *
 * Ele pediu a esteira de volta, andando sempre -- na rodada anterior ela
 * ficava parada quando havia menos de seis restaurantes. Com poucos
 * clientes na lista (ver VITRINE em conteudo.ts) o mesmo cartão se repete
 * para encher a volta; isso se resolve sozinho conforme a lista cresce, e
 * nenhum restaurante é inventado para disfarçar.
 *
 * Duas voltas iguais ficam lado a lado: quando a primeira sai da tela, a
 * segunda está no lugar dela e a animação recomeça sem salto. As bordas
 * somem num degradê para ninguém ver a emenda. O mouse em cima pausa, e
 * quem pediu menos movimento ao sistema vê os cartões parados, uma vez
 * cada.
 */
export function QuemJaUsa({ restaurantes }: { restaurantes: NaVitrine[] }) {
  if (restaurantes.length === 0) return null;
  // Uma volta precisa ser mais larga que a tela, senão abre um buraco
  // antes de recomeçar: dezesseis marcas dão uns 3.600px. O número é par
  // para a alternância cor / preto e branco não quebrar na emenda.
  const volta = Array.from({ length: 16 }, (_, i) => restaurantes[i % restaurantes.length]);
  // Faixa fina e discreta, a pedido dele: sem as linhas em cima e embaixo,
  // sem fundo próprio, marcas pequenas.
  return (
    <section className="py-5 sm:py-6">
      <p className="px-5 text-center text-[0.64rem] font-extrabold tracking-[0.16em] text-muted/80 uppercase">
        {restaurantes.length === 1 ? "Quem já usa o MenuFácil" : "Restaurantes que já usam o MenuFácil"}
      </p>

      <div className="group mt-3 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)] motion-reduce:hidden">
        <div className="flex w-max animate-[esteira_140s_linear_infinite] items-center py-1 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
          {[0, 1].map((copia) => (
            <div key={copia} className="flex items-center gap-14 pr-14" aria-hidden={copia === 1 || undefined}>
              {volta.map((r, i) => (
                // só a primeira aparição de cada restaurante é alcançável
                // pelo teclado e lida pelo leitor de tela
                <CartaoDoRestaurante
                  key={i}
                  r={r}
                  mono={i % 2 === 1}
                  escondido={copia === 1 || i >= restaurantes.length}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* sem movimento: cada restaurante uma vez, parado */}
      <div className="mt-3 hidden flex-wrap justify-center gap-x-12 gap-y-3 px-5 motion-reduce:flex">
        {restaurantes.map((r, i) => (
          <CartaoDoRestaurante key={r.slug} r={r} mono={i % 2 === 1} escondido={false} />
        ))}
      </div>
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
        <Titulo sub="Em 55 segundos, do pedido à comanda na cozinha.">
          Veja o Menu Fácil funcionando na prática
        </Titulo>
        <figure className="surge mx-auto max-w-4xl">
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
        </figure>

        {/* Depois do vídeo, a prova que vale mais que ele: um cardápio de
            verdade, no ar, que o dono abre e usa como se fosse cliente. O
            endereço é o DEMO_URL de conteudo.ts, o mesmo do topo. */}
        <Convite texto="Prefere mexer a assistir? Abra um cardápio de verdade.">
          <Link href={DEMO_URL} target="_blank" rel="noopener" className={buttonClasses("primary", "lg")}>
            Conhecer o sistema
            <ExternalLink className="size-4" aria-hidden="true" />
          </Link>
        </Convite>
      </Miolo>
    </section>
  );
}

// ─── 3. antes e depois ────────────────────────────────────────────────

/**
 * O alto de cada cartão: de um lado o WhatsApp do restaurante num sábado,
 * do outro o painel do sistema.
 *
 * Eram duas fotos de banco de imagem -- um homem com as mãos na cabeça e
 * uma atendente sorrindo para o caixa. Qualquer página de sistema usa as
 * mesmas duas, e quem já viu uma reconhece o molde na hora. Aqui cada
 * lado mostra a coisa em si: a conversa sem resposta é desenhada (é o que
 * o dono vê no próprio celular), e o painel é a tela de verdade do
 * sistema, sem retoque.
 */
const SEM_RESPOSTA = [
  { texto: "boa noite, tá aberto?", hora: "19:42" },
  { texto: "quero 2 x-tudo e 1 coca 2L", hora: "19:44" },
  { texto: "moço??", hora: "20:05" },
  { texto: "cadê meu pedido, já faz 1 hora", hora: "20:41" },
];

function FotoDoCartao({ tipo }: { tipo: "sem" | "com" }) {
  if (tipo === "com") {
    return (
      <div className="relative h-60 overflow-hidden border-b border-line bg-surface">
        <Image
          src="/venda/painel-computador.webp"
          alt="Painel do MenuFácil com as vendas do dia, os pedidos em andamento e os mais pedidos do mês"
          fill
          sizes="(min-width: 1024px) 30rem, 92vw"
          className="object-cover object-[0%_0%]"
        />
      </div>
    );
  }
  return (
    <div
      className="relative flex h-60 flex-col justify-end gap-1.5 overflow-hidden bg-[#0b141a] px-4 pb-3"
      role="img"
      aria-label="Conversa de WhatsApp com quatro mensagens de um cliente sem resposta"
    >
      {SEM_RESPOSTA.map((m) => (
        <p
          key={m.hora}
          className="w-fit max-w-[80%] rounded-lg rounded-tl-none bg-[#202c33] px-2.5 py-1.5 text-[0.82rem] leading-snug text-[#e9edef]"
        >
          {m.texto}
          <span className="ml-2 align-bottom text-[0.62rem] text-[#8696a0]">{m.hora}</span>
        </p>
      ))}
      <span className="absolute right-4 bottom-3 grid h-6 min-w-6 place-items-center rounded-full bg-[#00a884] px-1.5 text-[0.7rem] font-extrabold text-[#0b141a]">
        37
      </span>
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

      <ul className="flex flex-col gap-3.5 px-5 py-6 sm:px-7 sm:py-7">
        {itens.map(({ title, text }) => (
          <li key={title} className="flex items-start gap-3">
            {/* Um sinal pequeno, e não um ícone diferente dentro de uma
                bolinha colorida para cada linha: dez bolinhas em duas
                colunas eram decoração, e o que se lê aqui é o texto. */}
            {sem ? (
              <CircleX className="mt-0.5 size-5 shrink-0 text-danger/70" aria-hidden="true" />
            ) : (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            )}
            {/* só o título de cada linha. A frase de explicação que
                vinha embaixo dobrava a leitura das duas colunas, e o
                título já diz a coisa; o texto continua em conteudo.ts
                e serve de descrição para leitor de tela. */}
            <p className="min-w-0 leading-tight font-extrabold">
              {title}
              <span className="sr-only">. {text}</span>
            </p>
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
        <div className="mx-auto max-w-5xl">
          <Titulo lado="esquerda" sub={ANTES_DEPOIS.texto}>
            {ANTES_DEPOIS.titulo}
          </Titulo>
        </div>
        <div className="mx-auto grid max-w-5xl items-stretch gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
          <CartaoDeContraste tipo="sem" itens={ANTES_DEPOIS.sem} />
          <span className="mx-auto grid size-12 place-items-center self-center rounded-full bg-brand-soft text-brand">
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
        <Titulo destaque={SOLUCOES_TEXTO.tituloDestaque} sub={SOLUCOES_TEXTO.texto}>
          {SOLUCOES_TEXTO.titulo}
        </Titulo>
        <div className="surge">
          <AbasDeSolucoes />
        </div>
        <Convite texto="Quer ver isso rodando com o cardápio do seu restaurante?">
          <BotaoDoForm>
            Quero usar o Menu Fácil
            <ArrowRight className="size-5" aria-hidden="true" />
          </BotaoDoForm>
        </Convite>
      </Miolo>
    </section>
  );
}

// ─── a Lia ────────────────────────────────────────────────────────────

/**
 * A conversa da Lia, dentro do celular.
 *
 * É desenhada, e não uma captura: print de WhatsApp de cliente não entra
 * em página de venda. O que ela diz aqui é o que ela faz no sistema hoje
 * -- responder, anotar, ouvir áudio, mandar o Pix -- e nada além (ver LIA
 * em conteudo.ts). As medidas são em cqw porque a tela do aparelho é um
 * contêiner: a conversa encolhe junto com o celular.
 */
function ConversaDaLia() {
  return (
    <div className="flex aspect-[9/17.4] flex-col bg-[#efeae2] text-[#111b21]">
      <div className="flex items-center gap-[3cqw] border-b border-[#e3ded6] bg-[#f7f5f3] px-[4.5cqw] py-[3cqw]">
        <Image
          src={LIA.foto}
          alt=""
          width={96}
          height={96}
          className="size-[11.5cqw] rounded-full border border-brand/50 object-cover"
        />
        <span className="leading-tight">
          <span className="block text-[4.6cqw] font-extrabold">{LIA.nome}</span>
          <span className="block text-[3.3cqw] font-bold text-success">online</span>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-end gap-[2.2cqw] overflow-hidden px-[3.6cqw] py-[3.4cqw]">
        {LIA.conversa.map((m, i) => {
          const dela = m.de === "lia";
          return (
            <div
              key={i}
              className={cn(
                "max-w-[82%] rounded-[4cqw] px-[3.4cqw] pt-[2.4cqw] pb-[1.4cqw] text-[4.2cqw] leading-snug shadow-[0_1px_1px_rgb(0_0_0/0.12)]",
                dela ? "self-start rounded-bl-[1cqw] bg-white" : "self-end rounded-br-[1cqw] bg-[#d9fdd3]",
              )}
            >
              {m.tipo === "audio" ? (
                <span className="flex h-[7cqw] w-[44cqw] items-center gap-[0.9cqw]">
                  {ONDA.map((h, k) => (
                    <span key={k} className="w-[1cqw] rounded-full bg-brand" style={{ height: `${h}%` }} />
                  ))}
                </span>
              ) : m.tipo === "pix" ? (
                <span className="flex items-center gap-[3cqw]">
                  <QrDeEnfeite />
                  <span>
                    <span className="block text-[3cqw] font-bold text-[#667781]">Pix do pedido</span>
                    <span className="mt-[1.4cqw] inline-block rounded-full bg-brand px-[3cqw] py-[0.9cqw] text-[2.9cqw] font-extrabold text-white">
                      Copiar código
                    </span>
                  </span>
                </span>
              ) : (
                m.texto
              )}
              <span className="mt-[0.4cqw] block text-right text-[2.6cqw] text-[#667781]">{m.hora}</span>
            </div>
          );
        })}
      </div>

      {/* o campo de escrever, como no aplicativo: fecha o pé da tela */}
      <div className="flex items-center gap-[2cqw] bg-[#f7f5f3] px-[3.2cqw] pt-[2.4cqw] pb-[4.6cqw]">
        <span className="flex h-[9.4cqw] flex-1 items-center rounded-full border border-[#e3ded6] bg-white px-[4cqw] text-[3.6cqw] text-[#8696a0]">
          Mensagem
        </span>
        <span className="grid size-[9.4cqw] shrink-0 place-items-center rounded-full bg-[#1daa61] text-white">
          <Mic className="size-[4.6cqw]" />
        </span>
      </div>
    </div>
  );
}

/**
 * Um QR de enfeite para o cartão do Pix.
 *
 * Tem os três cantos e o miolo pontilhado de um QR, mas não é um código de
 * verdade e não leva a lugar nenhum: desenho fixo, calculado uma vez. Antes
 * era um quadrado com "QR" escrito, e ele marcou como coisa por acabar.
 */
function QrDeEnfeite() {
  const N = 21;
  const canto = (x: number, y: number) => {
    const d = Math.max(Math.abs(x - 3), Math.abs(y - 3));
    return d === 3 || d <= 1;
  };
  const cheio = (x: number, y: number) => {
    if (x < 7 && y < 7) return canto(x, y);
    if (x >= N - 7 && y < 7) return canto(x - (N - 7), y);
    if (x < 7 && y >= N - 7) return canto(x, y - (N - 7));
    if (x < 8 && y < 8) return false;
    if (x >= N - 8 && y < 8) return false;
    if (x < 8 && y >= N - 8) return false;
    return ((x * 7 + y * 13 + ((x * y) % 5) * 3 + (x ^ y)) % 7) < 3;
  };
  const d: string[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (cheio(x, y)) d.push(`M${x} ${y}h1v1h-1z`);
  return (
    <span className="block size-[17cqw] shrink-0 rounded-[1.6cqw] border border-[#e3ded6] bg-white p-[1.4cqw]">
      <svg viewBox={`0 0 ${N} ${N}`} className="block size-full" shapeRendering="crispEdges">
        <path d={d.join("")} fill="#111b21" />
      </svg>
    </span>
  );
}

/** a altura de cada barra da onda do áudio, em % */
const ONDA = [34, 70, 46, 92, 58, 78, 38, 100, 64, 44, 86, 54, 76, 34, 90, 60, 40, 82, 50, 68, 30, 78, 46, 64];

/**
 * A Lia, numa seção só dela.
 *
 * Ela aparecia só dentro do cartão do plano, e é o que mais separa o Menu
 * Fácil de um cardápio digital comum. A seção diz o que ela faz em quatro
 * linhas e mostra a conversa acontecendo -- quem vende pelo WhatsApp
 * reconhece a cena.
 */
export function Lia() {
  const planoIa = PLANOS.find((p) => p.apresenta);
  return (
    <section id={SECOES.lia} className="scroll-mt-20 border-y border-line py-16 sm:py-24">
      <Miolo>
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
          <div className="surge min-w-0">
            <p className="flex items-center gap-3.5">
              <Image
                src={LIA.foto}
                alt=""
                width={128}
                height={128}
                className="size-16 rounded-full border-2 border-brand object-cover"
              />
              <span className="leading-tight">
                <span className="block text-xl font-extrabold">{LIA.nome}</span>
                <span className="block text-sm font-bold text-brand">{LIA.papel}</span>
              </span>
            </p>

            <h2 className="mt-6 text-[2rem] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-[2.6rem]">
              {LIA.titulo} <span className="text-brand">{LIA.tituloDestaque}</span>
            </h2>
            <p className="mt-4 max-w-lg text-[1.05rem] leading-relaxed text-pretty text-muted sm:text-lg">
              {LIA.texto}
            </p>

            <ul className="mt-7 flex flex-col gap-3.5">
              {LIA.pontos.map((ponto) => (
                <li key={ponto} className="flex items-start gap-3">
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                  <span className="text-[1.02rem] leading-snug font-bold">{ponto}</span>
                </li>
              ))}
            </ul>

            {planoIa && (
              <BotaoComercial mensagem={planoIa.mensagem} className="mt-8 w-full sm:w-auto">
                Quero automatizar meus pedidos
                <ArrowRight className="size-5" aria-hidden="true" />
              </BotaoComercial>
            )}
          </div>

          {/* Ela em pé, apresentando o celular com a mão, e o balão da
              fala -- foi ideia dele usar a arte de corpo inteiro. A seção
              é branca por causa dela: a arte tem fundo branco, e sobre o
              creme das outras faixas apareceria um retângulo em volta.
              No celular ela fica pequena ao lado do balão e o aparelho
              vem embaixo, grande o bastante para a conversa ser lida. */}
          <div
            className="surge mx-auto flex w-full max-w-[34rem] flex-col gap-7 sm:flex-row sm:items-end sm:gap-[2%]"
            aria-hidden="true"
          >
            <div className="flex items-end gap-3 sm:w-[52%] sm:shrink-0 sm:flex-col sm:items-stretch sm:gap-4">
              <Image
                src={LIA.corpo}
                alt=""
                width={720}
                height={1080}
                sizes="(min-width: 640px) 18rem, 36vw"
                className="order-1 h-auto w-[36%] sm:order-2 sm:w-full"
              />
              <p className="relative order-2 mb-[22%] flex-1 rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 text-[0.98rem] leading-snug font-extrabold text-balance shadow-[0_16px_30px_-22px_rgb(29_32_38/0.5)] sm:order-1 sm:mb-0 sm:ml-[8%] sm:flex-none sm:rounded-bl-2xl sm:rounded-br-md">
                {LIA.fala}
              </p>
            </div>
            <div className="mx-auto w-full max-w-[17.5rem] sm:mx-0 sm:w-[46%] sm:max-w-none sm:shrink-0">
              {/* parado: ele pediu para tirar o movimento dos aparelhos */}
              <Celular>
                <ConversaDaLia />
              </Celular>
            </div>
          </div>
        </div>
      </Miolo>
    </section>
  );
}

// ─── 5. tipos de negócio ──────────────────────────────────────────────

export function Segmentos() {
  return (
    <section id={SECOES.segmentos} className="scroll-mt-20 bg-surface/60 py-16 sm:py-24">
      <Miolo>
        {/* Título de um lado, os tipos de casa do outro. Eram doze
            cartões iguais, cada um com um ícone num círculo -- muito
            espaço para dizer doze palavras. Em linha elas se leem de uma
            vez, e a seção deixa de ser mais uma grade no meio da página. */}
        <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          <div className="[&>div]:mb-0">
            <Titulo lado="esquerda" destaque={SEGMENTOS_TEXTO.tituloDestaque} sub={SEGMENTOS_TEXTO.texto}>
              {SEGMENTOS_TEXTO.titulo}
            </Titulo>
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {SEGMENTOS.map(({ icon: Icon, nome }) => (
              <li
                key={nome}
                className="flex items-center gap-2 rounded-full border border-line bg-bg px-4 py-2.5 text-[0.95rem] font-bold text-ink/85"
              >
                <Icon className="size-[1.1rem] text-brand" strokeWidth={1.8} aria-hidden="true" />
                {nome}
              </li>
            ))}
          </ul>
        </div>
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

/** quantos itens do plano ficam à vista antes do "ver tudo" */
const A_VISTA = 4;

function ItemDoPlano({ children, escuro }: { children: ReactNode; escuro: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-[0.88rem] leading-snug">
      <Check className="mt-0.5 size-3.5 shrink-0 text-brand" strokeWidth={3.2} aria-hidden="true" />
      <span className={escuro ? "text-white/80" : "text-muted"}>{children}</span>
    </li>
  );
}

function CartaoDoPlano({ plano }: { plano: Plano }) {
  // O plano com a Lia é o cartão escuro. A diferença entre os dois planos
  // é uma só -- a inteligência artificial --, e o cartão precisa dizer
  // isso antes de alguém ler a lista. Ele já tinha pedido para tirar o
  // contorno laranja e o cartão crescendo para fora da linha, e isso
  // continua valendo: os dois têm o mesmo tamanho e o mesmo botão cheio.
  // O que muda é a cor do fundo, que destaca um sem encolher o outro.
  const escuro = !!plano.apresenta;
  return (
    <div
      className={cn(
        "surge relative flex h-full flex-col rounded-[1.6rem] border p-6 transition duration-300 hover:-translate-y-1 sm:p-7",
        escuro
          ? "border-ink bg-ink text-white shadow-[0_34px_60px_-34px_rgb(29_32_38/0.75)]"
          : "border-line bg-bg shadow-[0_24px_50px_-40px_rgb(29_32_38/0.5)]",
      )}
    >
      {plano.selo ? (
        <span className="absolute top-5 right-5 rounded-full bg-brand px-2.5 py-1 text-[0.62rem] font-extrabold tracking-wide text-brand-ink uppercase sm:top-6 sm:right-6">
          {plano.selo}
        </span>
      ) : null}

      <div className={cn("flex items-start gap-3", plano.selo && "pr-20")}>
        {plano.apresenta ? (
          <span className="size-12 shrink-0 overflow-hidden rounded-full border-2 border-brand bg-brand-soft">
            <Image src={plano.apresenta.foto} alt={plano.apresenta.nome} width={96} height={96} className="size-full object-cover" />
          </span>
        ) : (
          <span className="grid size-11 shrink-0 place-items-center rounded-[0.85rem] bg-brand-soft text-brand">
            <LogoIcon className="h-[1.15rem]" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-lg leading-tight font-extrabold">{plano.nome}</h3>
          <p className={cn("mt-1 text-sm leading-snug", escuro ? "text-white/70" : "text-muted")}>{plano.resumo}</p>
        </div>
      </div>

      <p className="mt-6 flex items-end gap-1.5">
        <span className={cn("text-[2.6rem] leading-none font-extrabold tracking-tight", escuro ? "text-white" : "text-ink")}>
          {plano.preco}
        </span>
        <span className={cn("pb-1.5 text-sm font-bold", escuro ? "text-white/60" : "text-muted")}>{plano.periodo}</span>
      </p>

      <div className={cn("mt-6 flex-1 border-t pt-6", escuro ? "border-white/15" : "border-line")}>
        {/* "Tudo do Delivery, mais" vira uma etiqueta no cartão da IA: é a
            frase que explica a relação entre os dois planos */}
        <p
          className={cn(
            "text-sm font-extrabold",
            escuro && "w-fit rounded-full bg-brand px-3 py-1 text-[0.8rem] text-brand-ink",
          )}
        >
          {plano.tituloDosItens}
        </p>
        {/* Quatro itens à vista e o resto atrás do "ver tudo": a lista
            inteira, nos dois cartões lado a lado, era a maior parede de
            texto da página. Nenhum item saiu do plano. */}
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {plano.itens.slice(0, A_VISTA).map((item) => (
            <ItemDoPlano key={item} escuro={escuro}>
              {item}
            </ItemDoPlano>
          ))}
        </ul>
        {plano.itens.length > A_VISTA && (
          <details className="drawer group mt-2.5">
            <summary
              className={cn(
                "flex w-fit cursor-pointer list-none items-center gap-1.5 text-[0.86rem] font-extrabold [&::-webkit-details-marker]:hidden",
                escuro ? "text-white" : "text-ink",
              )}
            >
              Ver tudo o que inclui
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {plano.itens.slice(A_VISTA).map((item) => (
                <ItemDoPlano key={item} escuro={escuro}>
                  {item}
                </ItemDoPlano>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* o botão desce para o rodapé do cartão: com listas de tamanhos
          diferentes, os dois terminam na mesma linha */}
      <BotaoComercial mensagem={plano.mensagem} className="mt-7 w-full">
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
        <Titulo sub={PLANOS_TEXTO.texto}>
          {PLANOS_TEXTO.titulo}
        </Titulo>

        {/* No computador os três se comparam lado a lado e o destacado cresce
            para fora da linha. No celular empilham, e aí o destaque vira só a
            borda: crescer não diz nada quando se vê um de cada vez. */}
        <div className="mx-auto grid max-w-4xl items-stretch gap-5 sm:grid-cols-2 lg:gap-6">
          {PLANOS.map((plano) => (
            <CartaoDoPlano key={plano.nome} plano={plano} />
          ))}
        </div>

        <p className="mx-auto mt-7 max-w-2xl text-center text-sm text-pretty text-muted">{PLANOS_TEXTO.nota}</p>

        <Convite texto="Não sabe qual dos dois combina com o seu restaurante?">
          <BotaoComercial mensagem={PLANOS_TEXTO.mensagemDeDuvida} variante="secondary">
            <MessageCircle className="size-5" aria-hidden="true" />
            Falar com a equipe
          </BotaoComercial>
        </Convite>
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
              {disponivel ? "Sob consulta" : "Em breve"}
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

      <details className="drawer group mt-5 flex-1 border-t border-line pt-4">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-[0.86rem] font-extrabold [&::-webkit-details-marker]:hidden">
          Ver o que inclui
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul className="mt-3 flex flex-col gap-2.5">
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
      </details>

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
        <Titulo sub={ADICIONAIS_TEXTO.texto}>
          {ADICIONAIS_TEXTO.titulo}
        </Titulo>

        <div className="mx-auto grid max-w-4xl items-stretch gap-5 sm:grid-cols-2">
          {ADICIONAIS.map((adicional) => (
            <CartaoDoAdicional key={adicional.nome} adicional={adicional} />
          ))}
        </div>

        {ADICIONAIS_TEXTO.nota && (
          <p className="mx-auto mt-7 max-w-2xl text-center text-sm text-muted">{ADICIONAIS_TEXTO.nota}</p>
        )}
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
        <Titulo sub="Restaurantes que confiam no MenuFácil.">
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
        <div className="mx-auto grid max-w-5xl gap-x-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Titulo lado="esquerda">
              Perguntas frequentes
            </Titulo>
          </div>
        <div className="flex flex-col gap-2.5">
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
        </div>
      </Miolo>
    </section>
  );
}

// ─── 8. a chamada final ───────────────────────────────────────────────

/**
 * O fim da página: o convite e o cadastro, lado a lado.
 *
 * Era uma faixa escura só com o botão do WhatsApp, e o cadastro de um campo
 * morava no topo. Com os aparelhos no topo, o cadastro desceu para cá -- é
 * o mesmo cartão, com o mesmo envio e a mesma âncora (`#cadastro`), que é
 * para onde apontam os botões "Quero conhecer" da página inteira. Quem
 * prefere conversar agora continua tendo o WhatsApp ao lado.
 */
export function ChamadaFinal({ whatsapp }: { whatsapp: string | null }) {
  return (
    <section id={SECOES.comece} className="scroll-mt-20 px-3 pb-6 sm:px-6 sm:pb-10">
      <div className="palco-laranja mx-auto max-w-6xl overflow-hidden rounded-[2rem] text-white sm:rounded-[2.4rem]">
        <div className="grid items-center gap-10 px-5 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-14">
          <div className="surge min-w-0 text-center lg:text-left">
            <LogoIcon className="mx-auto h-12 brightness-0 invert lg:mx-0" />
            <h2 className="mt-6 text-[2.1rem] leading-[1.06] font-extrabold tracking-tight text-balance sm:text-[2.9rem]">
              {FINAL.titulo} <span className="text-brand-ink">{FINAL.tituloDestaque}</span>?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[1.05rem] leading-relaxed text-pretty text-white/90 sm:text-lg lg:mx-0">
              {FINAL.texto}
            </p>

            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 text-[1.05rem] font-extrabold text-brand-press transition duration-200 hover:-translate-y-0.5 hover:bg-[#fff3ea] sm:w-auto"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
                {FINAL.botao}
                <ArrowRight className="size-5" aria-hidden="true" />
              </a>
            )}

          </div>

          <div className="surge min-w-0">
            <CadastroRapido />
          </div>
        </div>
      </div>
    </section>
  );
}
