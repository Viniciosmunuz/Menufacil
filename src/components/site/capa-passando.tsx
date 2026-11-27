"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

// A capa do cardápio quando o restaurante tem banners.
//
// Até aqui a capa era uma foto só, parada: moldura. Com banners ela vira
// a vitrine -- a promoção da semana, o combo de sábado, o aviso de que
// abriu aos domingos.
//
// **Na mesma altura da capa antiga, de propósito.** Alta, ela empurra o
// cardápio para fora da primeira tela e o cliente rola antes de ver um
// prato; foi por isso que a capa ficou baixa, e um banner não muda esse
// cálculo. Quem vem aqui veio comer.
//
// O arrasto é a própria rolagem do navegador, com encaixe (`snap`), e
// não um arrastar escrito à mão: no celular é o gesto que o dedo já
// conhece, funciona com o teclado e não briga com a rolagem da página.
// A passagem sozinha é um `scrollTo` no mesmo trilho, então as duas
// coisas são o mesmo movimento e nunca discordam.

export type BannerDaCapa = { id: string; imageUrl: string; titulo: string | null };

/** quanto cada banner fica à mostra antes de o próximo entrar */
const PASSA_EM_MS = 5000;

export function CapaPassando({ banners }: { banners: BannerDaCapa[] }) {
  const trilho = useRef<HTMLDivElement | null>(null);
  const [atual, setAtual] = useState(0);
  // a pessoa pôs o dedo (ou o mouse) na capa: ela decide o ritmo agora
  const parado = useRef(false);

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
    // quem pediu menos movimento no sistema não quer uma capa piscando
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const t = setInterval(() => {
      const el = trilho.current;
      if (!el || parado.current) return;
      // aba escondida não anima nada: o navegador segura o `scrollTo` e,
      // quando a pessoa volta, a capa dispara todas as voltas de uma vez
      if (document.visibilityState !== "visible") return;
      const agora = el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : 0;
      const proximo = (agora + 1) % banners.length;
      // A volta do último para o primeiro é seca, e não deslizando: com
      // deslize, a capa rebobina na frente do cliente -- passa o terceiro,
      // o segundo e o primeiro de trás para frente, e com seis banners
      // isso é uma varrida comprida que parece defeito.
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

  return (
    <>
      <div
        ref={trilho}
        onScroll={aoRolar}
        onPointerDown={segurar}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onMouseEnter={segurar}
        onMouseLeave={soltar}
        className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((b, i) => (
          <div key={b.id} className="relative size-full shrink-0 basis-full snap-center">
            <Image
              src={b.imageUrl}
              alt={b.titulo ?? ""}
              fill
              // só o primeiro é prioridade: os outros ninguém vê antes de
              // passar, e baixar todos de uma vez atrasa o cardápio
              priority={i === 0}
              sizes="(min-width: 1024px) 60rem, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* As bolinhas dizem duas coisas: que tem mais coisa para o lado, e
          em qual o cliente está. Sem elas, um banner parado é
          indistinguível de uma capa comum, e ninguém arrasta o que não
          sabe que anda. Com um banner só, não há o que marcar. */}
      {banners.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Ver o banner ${i + 1} de ${banners.length}`}
              aria-current={i === atual}
              className={cn(
                "pointer-events-auto h-1.5 rounded-full transition-all",
                i === atual ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      )}
    </>
  );
}
