import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

// As telas do sistema na página de venda.
//
// Antes eram maquetes desenhadas em HTML: um cardápio de mentira, um painel
// de mentira. Funcionavam, mas vendiam uma ilusão do produto em vez do
// produto. Agora são **capturas reais** do MenuFácil rodando, em
// /public/venda/, dentro de molduras de aparelho desenhadas aqui.
//
// A moldura fica em código, e não numa foto de celular comprada, por três
// motivos: pesa alguns bytes em vez de alguns megabytes, acompanha o tema
// claro e escuro, e não envelhece junto com o modelo de aparelho da moda.
//
// As capturas são do restaurante de demonstração, não de cliente real --
// nenhum dado de quem paga aparece aqui.

// ─── as capturas ──────────────────────────────────────────────────────

type Captura = { src: string; w: number; h: number; alt: string };

const TELAS = {
  cardapio: {
    src: "/venda/cardapio-cliente.webp",
    w: 780,
    h: 1688,
    alt: "Cardápio do restaurante aberto no celular do cliente, com fotos e preços dos pratos",
  },
  painel: {
    src: "/venda/painel-celular.webp",
    w: 780,
    h: 1688,
    alt: "Painel do restaurante no celular, mostrando as vendas do dia e os pedidos em andamento",
  },
  salao: {
    src: "/venda/salao-mesas.webp",
    w: 780,
    h: 1688,
    alt: "Mapa do salão no celular do garçom, com as mesas livres e uma mesa aberta",
  },
  comanda: {
    src: "/venda/comanda-mesa.webp",
    w: 390,
    h: 844,
    alt: "Comanda da mesa com os itens lançados e o total da conta",
  },
  computador: {
    src: "/venda/painel-computador.webp",
    w: 800,
    h: 560,
    alt: "Painel do MenuFácil no computador, com o gráfico de vendas e os pedidos do dia",
  },
} satisfies Record<string, Captura>;

// ─── as molduras ──────────────────────────────────────────────────────

/**
 * Celular.
 *
 * Corpo escuro com cantos bem arredondados, moldura fina e a pastilha do
 * alto-falante. A proporção vem da própria captura, então o miolo nunca
 * estica nem corta.
 */
export function Celular({
  tela,
  className,
  priority,
  sizes = "(min-width: 1024px) 20vw, 45vw",
}: {
  tela: Captura;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-[2rem] bg-[#15171c] p-[0.35rem] shadow-[0_24px_50px_-18px_rgb(0_0_0/0.45)] ring-1 ring-black/10 sm:rounded-[2.3rem] sm:p-[0.4rem]",
        className,
      )}
    >
      {/* os botões laterais: dois traços, o suficiente para o olho ler
          "aparelho" sem virar enfeite */}
      <span aria-hidden="true" className="absolute top-[22%] -left-[2px] h-9 w-[2px] rounded-l bg-[#2b2e35]" />
      <span aria-hidden="true" className="absolute top-[34%] -left-[2px] h-14 w-[2px] rounded-l bg-[#2b2e35]" />
      <span aria-hidden="true" className="absolute top-[26%] -right-[2px] h-12 w-[2px] rounded-r bg-[#2b2e35]" />

      <div className="relative overflow-hidden rounded-[1.7rem] bg-bg sm:rounded-[2rem]">
        <Image
          src={tela.src}
          alt={tela.alt}
          width={tela.w}
          height={tela.h}
          sizes={sizes}
          priority={priority}
          className="block h-auto w-full"
        />
        {/* a pastilha do alto-falante, por cima da captura */}
        <span
          aria-hidden="true"
          className="absolute top-[0.45rem] left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-[#15171c]/70"
        />
      </div>
    </div>
  );
}

/**
 * Notebook.
 *
 * Tela com moldura escura, dobradiça e base. A base é mais larga que a
 * tela de propósito: é o que faz o desenho ler como um notebook de lado,
 * e não como um monitor flutuando.
 */
export function Notebook({
  tela,
  className,
  priority,
  sizes = "(min-width: 1024px) 45vw, 90vw",
}: {
  tela: Captura;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-t-[0.9rem] bg-[#15171c] px-[0.4rem] pt-[0.7rem] pb-[0.4rem] shadow-[0_24px_50px_-20px_rgb(0_0_0/0.45)]">
        {/* a câmera */}
        <span
          aria-hidden="true"
          className="mx-auto mb-[0.4rem] block size-[3px] rounded-full bg-[#3a3e46]"
        />
        <div className="overflow-hidden rounded-[0.35rem] bg-bg">
          <Image
            src={tela.src}
            alt={tela.alt}
            width={tela.w}
            height={tela.h}
            sizes={sizes}
            priority={priority}
            className="block h-auto w-full"
          />
        </div>
      </div>
      {/* a base, com o entalhe de abrir */}
      <div className="relative mx-auto h-[0.6rem] w-[106%] rounded-b-[0.5rem] bg-[#1f2228]">
        <span
          aria-hidden="true"
          className="absolute top-0 left-1/2 h-[0.18rem] w-[14%] -translate-x-1/2 rounded-b-full bg-[#2f333b]"
        />
      </div>
    </div>
  );
}

/**
 * Totem de balcão: a mesma tela do cliente, de pé, num pedestal.
 */
export function TotemAparelho({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-[1.2rem] bg-[#15171c] p-[0.45rem] shadow-[0_22px_44px_-20px_rgb(0_0_0/0.45)]">
        <div className="overflow-hidden rounded-[0.85rem] bg-bg">
          <Image
            src={TELAS.cardapio.src}
            alt="Totem de autoatendimento com o cardápio do restaurante na tela"
            width={TELAS.cardapio.w}
            height={TELAS.cardapio.h}
            sizes="140px"
            className="block h-auto w-full"
          />
        </div>
      </div>
      {/* o pé */}
      <div aria-hidden="true" className="mx-auto h-5 w-[14%] bg-[#1f2228]" />
      <div aria-hidden="true" className="mx-auto h-[0.4rem] w-[62%] rounded-full bg-[#1f2228]" />
    </div>
  );
}

// ─── a via de papel ───────────────────────────────────────────────────

const LINHAS = [
  ["2x X-Burger", "44,00"],
  ["1x Batata frita", "18,00"],
];

/** a via que sai na impressora do balcão: papel, não aparelho */
export function ViaImpressa() {
  return (
    <div className="mx-auto w-full max-w-[12.5rem] drop-shadow-[0_18px_30px_rgb(0_0_0/0.35)]">
      <div className="rounded-t-sm bg-[#f7f5ef] px-3 pt-3 pb-2 font-mono text-[0.55rem] leading-[1.5] text-[#15181d]">
        <p className="text-center text-[0.72rem] font-bold tracking-wide">BURGER DO ZE</p>
        <p className="text-center">Rua Principal, 45</p>
        <p className="my-1 overflow-hidden text-[#9aa0a6]">------------------------------</p>
        <div className="flex justify-between font-bold">
          <span>PEDIDO #42</span>
          <span>19:24</span>
        </div>
        <p>ENTREGA</p>
        <p>Maria - (92) 99999-0000</p>
        <p className="my-1 overflow-hidden text-[#9aa0a6]">------------------------------</p>
        {LINHAS.map(([item, valor]) => (
          <div key={item} className="flex justify-between gap-2">
            <span className="truncate">{item}</span>
            <span>{valor}</span>
          </div>
        ))}
        <p className="pl-3 text-[0.5rem]">* sem cebola</p>
        <p className="my-1 overflow-hidden text-[#9aa0a6]">------------------------------</p>
        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>62,00</span>
        </div>
        <p>Dinheiro - troco p/ 100,00</p>
        <p className="font-bold">TROCO: 38,00</p>
        <p className="my-1 overflow-hidden text-[#9aa0a6]">------------------------------</p>
        <p>Rua das Flores, 120</p>
        <p>Centro - ponto: perto da praca</p>
      </div>
      {/* borda serrilhada: o papel destacado da bobina */}
      <svg viewBox="0 0 120 6" preserveAspectRatio="none" className="block h-2 w-full" aria-hidden="true">
        <path
          d="M0 0h120v1L114 6 108 1 102 6 96 1 90 6 84 1 78 6 72 1 66 6 60 1 54 6 48 1 42 6 36 1 30 6 24 1 18 6 12 1 6 6 0 1Z"
          fill="#f7f5ef"
        />
      </svg>
    </div>
  );
}

// ─── as composições ───────────────────────────────────────────────────

/**
 * O topo: o painel no notebook, o cardápio no celular por cima, e a via
 * saindo no papel. É o argumento inteiro numa imagem — o mesmo sistema nos
 * três lugares onde o restaurante trabalha.
 */
export function ComposicaoDoTopo() {
  return (
    <div className="relative w-full pt-3 pb-6 sm:pb-12">
      <div className="w-[86%]">
        <Notebook tela={TELAS.computador} priority sizes="(min-width: 1024px) 42vw, 80vw" />
      </div>
      <div className="absolute top-[12%] right-0 w-[34%] sm:right-2 sm:w-[32%]">
        <Celular tela={TELAS.cardapio} priority sizes="(min-width: 1024px) 15vw, 32vw" />
      </div>
      <div className="absolute bottom-0 left-[6%] hidden w-[24%] rotate-[-7deg] sm:block">
        <ViaImpressa />
      </div>
    </div>
  );
}

/** salão, comanda e painel: a imagem da seção de recursos */
export function ComposicaoDeRecursos() {
  return (
    <div className="relative flex w-full items-start justify-center gap-3 sm:gap-4">
      <div className="w-[38%] max-w-[10rem]">
        <Celular tela={TELAS.salao} sizes="(min-width: 1024px) 11vw, 36vw" />
      </div>
      <div className="w-[38%] max-w-[10rem] pt-10">
        <Celular tela={TELAS.painel} sizes="(min-width: 1024px) 11vw, 36vw" />
      </div>
      <div className="hidden w-[24%] max-w-[7rem] pt-5 sm:block">
        <ViaImpressa />
      </div>
    </div>
  );
}

/** o cardápio do cliente, sozinho, para onde a página precisar */
export function TelaDoCardapio({ children }: { children?: ReactNode }) {
  return (
    <>
      <Celular tela={TELAS.cardapio} sizes="(min-width: 1024px) 14vw, 40vw" />
      {children}
    </>
  );
}
