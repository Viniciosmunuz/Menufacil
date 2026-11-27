"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

// A seção Destaques do cardápio: os banners do restaurante, passando.
//
// Moravam na capa, e a capa é quatro vezes mais larga que alta. Arte de
// 16:9 chegava ali perdendo o alto e o pé, e a letra do canto sumia no
// corte ou atrás da logo. Agora têm uma faixa própria, logo abaixo das
// abas, mais alta, e a capa voltou a ser a foto do restaurante.
//
// O arrasto é a própria rolagem do navegador, com encaixe (`snap`), e
// não um arrastar escrito à mão: no celular é o gesto que o dedo já
// conhece, funciona com o teclado e não briga com a rolagem da página.
// A passagem sozinha é um `scrollTo` no mesmo trilho, então as duas
// coisas são o mesmo movimento e nunca discordam.

export type BannerDestaque = {
  id: string;
  imageUrl: string;
  titulo: string | null;
  /** 0 = imagem inteira, 100 = preenche a faixa, 200 = o dobro disso */
  escala?: number | null;
  /** 50/50 = centro */
  focoX?: number | null;
  focoY?: number | null;
  /** a medida do arquivo; vazia nos banners antigos, que eram 1600 x 900 */
  largura?: number | null;
  altura?: number | null;
};

/**
 * A proporção da faixa: dez de largura para três de altura.
 *
 * Um pouco mais baixa que a capa, de propósito -- é vitrine, e o prato
 * vem logo embaixo. A mesma em toda largura de tela, e é isso que deixa
 * o enquadramento que o dono escolhe no painel valer igual no celular de
 * qualquer cliente e no computador: muda o tamanho, não o corte.
 */
export const FAIXA_DO_DESTAQUE = "aspect-[10/3]";

const proporcao = (b: BannerDestaque) => (b.largura && b.altura ? b.largura / b.altura : 16 / 9);

/**
 * Quanto a imagem ocupa e onde ela fica, em medidas da faixa.
 *
 * A conta é feita pelo CSS, com as unidades do contêiner (`cqw`, `cqh`),
 * e não medindo a tela: assim ela vale do primeiro quadro, já no HTML do
 * servidor, sem a imagem pular de lugar quando o JavaScript chega.
 *
 * - **escala 0**: a imagem inteira, do tamanho em que ela cabe na faixa.
 *   O que sobra dos lados é a própria arte, desfocada.
 * - **escala 100**: preenche a faixa, cortando o que passar.
 * - **acima de 100**: aproxima a partir daí.
 *
 * O foco faz o papel do `object-position`: 0 encosta à esquerda (ou em
 * cima), 50 centraliza, 100 encosta do outro lado. Na conta de antes,
 * com `scale()`, aproximar empurrava de volta para o meio o que o dono
 * tinha acabado de puxar para o canto; aqui o canto escolhido fica.
 */
export function medidaDoBanner(b: BannerDestaque): React.CSSProperties {
  const r = proporcao(b);
  const e = Math.max(0, Math.min(200, b.escala ?? 0)) / 100;
  const x = (b.focoX ?? 50) / 100;
  const y = (b.focoY ?? 50) / 100;
  const preenche = `max(100cqw, ${(100 * r).toFixed(3)}cqh)`;
  const inteira = `min(100cqw, ${(100 * r).toFixed(3)}cqh)`;
  const largura = e <= 1 ? `(${inteira} + (${preenche} - ${inteira}) * ${e})` : `(${preenche} * ${e})`;
  return {
    position: "absolute",
    maxWidth: "none",
    width: `calc(${largura})`,
    height: `calc(${largura} / ${r.toFixed(5)})`,
    left: `calc((100cqw - ${largura}) * ${x})`,
    top: `calc((100cqh - ${largura} / ${r.toFixed(5)}) * ${y})`,
  };
}

/**
 * Um banner enquadrado, dentro de uma faixa que já tem tamanho.
 *
 * Quem chama dá a moldura (com `relative` e `overflow-hidden`); aqui
 * dentro vêm o fundo e a imagem. O fundo é a mesma arte, esticada e
 * desfocada: com a imagem inteira, as sobras dos lados ficam com as cores
 * dela, em vez de duas tarjas de cor chapada que parecem defeito.
 */
export function BannerEnquadrado({
  banner,
  sizes,
  priority = false,
  arrastando = false,
}: {
  banner: BannerDestaque;
  sizes: string;
  priority?: boolean;
  /** no painel, enquanto o dedo move a imagem: sem a transição atrasando */
  arrastando?: boolean;
}) {
  const sobraFundo = (banner.escala ?? 0) < 100;
  return (
    <div className="absolute inset-0 overflow-hidden [container-type:size]">
      {sobraFundo && (
        // O mesmo `sizes` da imagem de cima, de propósito: o navegador
        // escolhe o mesmo arquivo e não baixa nada a mais para o fundo.
        <Image
          src={banner.imageUrl}
          alt=""
          aria-hidden="true"
          fill
          sizes={sizes}
          className="scale-125 object-cover opacity-70 blur-xl"
        />
      )}
      <Image
        src={banner.imageUrl}
        alt={banner.titulo ?? ""}
        width={banner.largura ?? 1600}
        height={banner.altura ?? 900}
        priority={priority}
        sizes={sizes}
        draggable={false}
        className={cn("select-none", !arrastando && "transition-[width,height,left,top] duration-150")}
        style={medidaDoBanner(banner)}
      />
    </div>
  );
}

/** quanto cada banner fica à mostra antes de o próximo entrar */
const PASSA_EM_MS = 5000;

/**
 * Quanto tempo a faixa fica parada depois que o cliente passa na mão.
 *
 * Quem arrastou escolheu o que quer olhar, e a faixa voltando a andar
 * cinco segundos depois tira da frente dele o banner que ele mesmo foi
 * buscar. Cinco minutos é tempo de ler o cardápio e montar o pedido;
 * depois disso a pessoa já esqueceu que mexeu, e a faixa volta a girar.
 *
 * Recarregar a página zera: é estado de tela, não de cliente.
 */
const PARADA_NA_MAO_MS = 5 * 60_000;

/** quanto esperar, depois de o dedo sair, para o encaixe terminar */
const ENCAIXE_MS = 350;

export function DestaquesPassando({ banners }: { banners: BannerDestaque[] }) {
  const trilho = useRef<HTMLDivElement | null>(null);
  const [atual, setAtual] = useState(0);
  // a pessoa pôs o dedo (ou o mouse) na faixa: ela decide o ritmo agora
  const parado = useRef(false);
  /** até quando a faixa fica parada porque o cliente passou na mão */
  const paradaAte = useRef(0);
  /** em qual banner o dedo encostou, para saber se ele passou mesmo */
  const aoEncostar = useRef(0);

  const irPara = useCallback((i: number, suave = true) => {
    const el = trilho.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: suave ? "smooth" : "auto" });
  }, []);

  /**
   * Em qual banner o trilho parou.
   *
   * Lido da rolagem, e não guardado num estado à parte: o dedo manda
   * tanto quanto o relógio, e duas fontes de verdade aqui dariam a
   * bolinha marcando um banner e a tela mostrando outro.
   */
  const aoRolar = () => {
    const el = trilho.current;
    if (!el || el.clientWidth === 0) return;
    setAtual(Math.round(el.scrollLeft / el.clientWidth));
  };

  useEffect(() => {
    if (banners.length < 2) return;
    // quem pediu menos movimento no sistema não quer uma faixa piscando
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const t = setInterval(() => {
      const el = trilho.current;
      if (!el || parado.current) return;
      // passou na mão há pouco: a faixa é dela, não do relógio
      if (Date.now() < paradaAte.current) return;
      // aba escondida não anima nada: o navegador segura o `scrollTo` e,
      // quando a pessoa volta, a faixa dispara todas as voltas de uma vez
      if (document.visibilityState !== "visible") return;
      const agora = el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : 0;
      const proximo = (agora + 1) % banners.length;
      // A volta do último para o primeiro é seca, e não deslizando: com
      // deslize, a faixa rebobina na frente do cliente -- passa o
      // terceiro, o segundo e o primeiro de trás para frente.
      irPara(proximo, proximo !== 0);
    }, PASSA_EM_MS);

    return () => clearInterval(t);
  }, [banners.length, irPara]);

  const segurar = () => {
    parado.current = true;
  };
  const soltar = () => {
    parado.current = false;
  };

  /** o dedo encostou: anota onde estava, para comparar quando soltar */
  const encostou = () => {
    segurar();
    const el = trilho.current;
    aoEncostar.current = el && el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : 0;
  };

  /**
   * O dedo saiu: se a faixa mudou de banner, ela para por cinco minutos.
   *
   * A conta espera o encaixe terminar. Quando o dedo sai, a rolagem
   * ainda anda com o impulso e só então encosta no próximo banner --
   * comparando na hora, um arrasto de verdade ainda marcaria o banner
   * antigo e a faixa voltaria a girar por cima dele.
   *
   * Um toque que não arrastou nada não conta: tocar na arte para ver
   * melhor não é pedir para a faixa parar.
   */
  const largou = () => {
    soltar();
    const inicio = aoEncostar.current;
    setTimeout(() => {
      const el = trilho.current;
      if (!el || !el.clientWidth) return;
      if (Math.round(el.scrollLeft / el.clientWidth) !== inicio) {
        paradaAte.current = Date.now() + PARADA_NA_MAO_MS;
      }
    }, ENCAIXE_MS);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-card border border-line bg-surface-2", FAIXA_DO_DESTAQUE)}>
      <div
        ref={trilho}
        onScroll={aoRolar}
        onPointerDown={encostou}
        onPointerUp={largou}
        onPointerCancel={largou}
        onMouseEnter={segurar}
        onMouseLeave={soltar}
        className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((b, i) => (
          <div key={b.id} className="relative size-full shrink-0 basis-full snap-center">
            <BannerEnquadrado
              banner={b}
              // só o primeiro é prioridade: os outros ninguém vê antes de
              // passar, e baixar todos de uma vez atrasa o cardápio
              priority={i === 0}
              sizes="(min-width: 1024px) 48rem, 100vw"
            />
          </div>
        ))}
      </div>

      {/* As bolinhas dizem duas coisas: que tem mais coisa para o lado, e
          em qual o cliente está. Com um banner só, não há o que marcar.
          A sombra é para arte clara: bolinha branca sobre fundo branco
          some. */}
      {banners.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1.5 z-10 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                // tocar na bolinha é escolher: não precisa de conferência
                paradaAte.current = Date.now() + PARADA_NA_MAO_MS;
                irPara(i);
              }}
              aria-label={`Ver o destaque ${i + 1} de ${banners.length}`}
              aria-current={i === atual}
              className={cn(
                "pointer-events-auto h-1.5 rounded-full shadow-[0_0_3px_rgb(0_0_0/0.45)] transition-all",
                i === atual ? "w-5 bg-white" : "w-1.5 bg-white/70 hover:bg-white/90",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
