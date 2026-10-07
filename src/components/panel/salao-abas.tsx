"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

// Mesas, balcão e caixa lado a lado.
//
// Arrastar para o lado troca de aba, e tocar no nome leva até ela. No
// celular, deslizar é o gesto que a mão já faz sem pensar; obrigar a mirar
// num rótulo de dois centímetros, segurando o aparelho com uma mão só no
// meio do salão, é pedir precisão de quem não tem nenhuma sobrando.
//
// O servidor manda os três painéis prontos: a troca é só rolagem lateral,
// sem ida à rede, então vem na hora mesmo com o Wi-Fi ruim do salão.
//
// Feito com scroll-snap do próprio navegador, sem biblioteca de carrossel:
// o dedo arrasta a área que já rola, e o encaixe é do CSS. O JavaScript
// aqui só mantém o rótulo aceso de acordo com o que está na tela.

export type Aba = { chave: string; titulo: string; conteudo: ReactNode };

export function SalaoAbas({ abas }: { abas: Aba[] }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [ativa, setAtiva] = useState(0);

  useEffect(() => {
    const el = trilho.current;
    if (!el) return;

    // qual painel está ocupando a tela: o que estiver mais perto do começo
    // da área visível depois que o dedo soltou
    const aoRolar = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setAtiva(Math.max(0, Math.min(abas.length - 1, i)));
    };

    el.addEventListener("scroll", aoRolar, { passive: true });
    return () => el.removeEventListener("scroll", aoRolar);
  }, [abas.length]);

  const ir = (i: number) => {
    const el = trilho.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setAtiva(i);
  };

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-1 border-b border-line" aria-label="Seções do salão">
        {abas.map((a, i) => (
          <button
            key={a.chave}
            type="button"
            onClick={() => ir(i)}
            aria-current={i === ativa ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-3 text-sm font-extrabold transition-colors",
              i === ativa ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {a.titulo}
          </button>
        ))}
      </nav>

      <div
        ref={trilho}
        // a barra de rolagem some, mas o arrasto continua; o encaixe é por
        // painel, então o dedo nunca deixa a tela entre duas abas
        className="flex snap-x snap-mandatory items-start overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {abas.map((a, i) => (
          <section
            key={a.chave}
            // a aba fora da tela sai da ordem de tabulação, senão o teclado
            // passeia por mesas que ninguém está vendo
            inert={i !== ativa}
            className="w-full shrink-0 snap-start px-0.5"
          >
            {a.conteudo}
          </section>
        ))}
      </div>
    </div>
  );
}
