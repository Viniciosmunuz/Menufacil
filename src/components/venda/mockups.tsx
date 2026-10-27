import Image from "next/image";

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

export const TELAS = {
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
 * Celular, no desenho de um iPhone.
 *
 * Borda de titânio, a moldura preta fina, a tela com os cantos do aparelho,
 * a Dynamic Island, a barra de status e os botões laterais. Tudo em
 * porcentagem da largura (e o texto da barra em cqw), então o desenho é o
 * mesmo com 8rem ou com 14rem -- a moldura anterior tinha medidas fixas e,
 * pequena, ficava com borda grossa e cantos errados.
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
  const botao = "absolute w-[1.6%] min-w-[2px] bg-gradient-to-b from-[#5b5e66] to-[#34363c]";
  return (
    <div className={cn("relative drop-shadow-[0_28px_40px_rgb(0_0_0/0.4)]", className)}>
      {/* os botões: ação e volume à esquerda, o de ligar à direita */}
      <span aria-hidden="true" className={cn(botao, "top-[16%] -left-[1.2%] h-[4%] rounded-l-sm")} />
      <span aria-hidden="true" className={cn(botao, "top-[23%] -left-[1.2%] h-[7.5%] rounded-l-sm")} />
      <span aria-hidden="true" className={cn(botao, "top-[32%] -left-[1.2%] h-[7.5%] rounded-l-sm")} />
      <span aria-hidden="true" className={cn(botao, "top-[26%] -right-[1.2%] h-[11%] rounded-r-sm")} />

      {/* a borda de titânio */}
      <div className="rounded-[17%/7.9%] bg-gradient-to-br from-[#6b6e76] via-[#2e3036] to-[#5a5d65] p-[1.3%]">
        {/* a moldura preta */}
        <div className="rounded-[16%/7.4%] bg-black p-[3.4%]">
          {/* a tela */}
          <div className="@container relative overflow-hidden rounded-[12.5%/5.8%] bg-bg">
            {/* barra de status: a hora, o sinal e a bateria */}
            <div
              aria-hidden="true"
              className="flex h-[13cqw] items-center justify-between px-[8cqw] pt-[1.5cqw] text-[3.9cqw] font-extrabold text-ink"
            >
              <span>9:41</span>
              <span className="flex items-center gap-[1.4cqw]">
                <span className="flex items-end gap-[0.6cqw]">
                  {[35, 55, 75, 100].map((h) => (
                    <span key={h} className="w-[0.9cqw] rounded-[0.3cqw] bg-ink" style={{ height: `${h * 0.028}cqw` }} />
                  ))}
                </span>
                <span className="relative h-[3cqw] w-[6cqw] rounded-[0.9cqw] border-[0.35cqw] border-ink/50 p-[0.35cqw]">
                  <span className="block h-full w-[78%] rounded-[0.4cqw] bg-ink" />
                </span>
              </span>
            </div>
            {/* a Dynamic Island, por cima de tudo */}
            <span
              aria-hidden="true"
              className="absolute top-[2.6cqw] left-1/2 h-[8.4cqw] w-[30cqw] -translate-x-1/2 rounded-full bg-black"
            />
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
