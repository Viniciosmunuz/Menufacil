"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { SOLUCOES, type Solucao } from "./conteudo";
import { Celular, Notebook, TELAS, TotemAparelho, ViaImpressa } from "./mockups";

// "Um sistema. Tudo conectado.": as abas com as soluções.
//
// Cada aba começa pelas telas reais daquela parte do sistema, num palco
// escuro; as frases seguintes vêm cada uma com uma foto da situação de que
// ela fala. Uma frase de cada vez, trocando sozinha. Tocar num ponto ou
// arrastar para o lado passa a frase na mão -- e aí a troca automática para,
// porque quem está lendo não quer o texto fugindo.

const INTERVALO_MS = 5000;

/** `pos` desloca o recorte quando o assunto não está no meio da foto */
type Foto = { src: string; alt: string; pos?: string };

/**
 * As fotos das frases 2 em diante de cada aba, na ordem das frases em
 * conteudo.ts (a primeira é sempre o palco com as telas). Mexeu numa frase,
 * confira se a foto ainda conversa com ela.
 *
 * Todas do Pexels, licença livre para uso comercial, sem crédito
 * obrigatório. O número é o da foto: pexels.com/photo/<número>.
 *
 * Em 14/11/2026 ele pediu fotos mais bonitas, e onze das dezesseis foram
 * trocadas (as de nome terminado em "b"): saíram as de aparelho solto e
 * de gente de costas, entraram as de comida, de rosto e de luz quente.
 */
const FOTOS: Record<Solucao["id"], Foto[]> = {
  delivery: [
    // 4008580, 6684773, 12935093, 13311393
    { src: "/venda/solucoes/delivery-2.jpg", alt: "Cliente escolhendo lanches num cardápio aberto no celular" },
    { src: "/venda/solucoes/delivery-3b.jpg", alt: "Atendente sorrindo ao entregar a sacola do pedido ao cliente" },
    { src: "/venda/solucoes/delivery-4b.jpg", alt: "Cliente pagando pelo celular na maquininha que a atendente segura" },
    { src: "/venda/solucoes/delivery-5b.jpg", alt: "Entregador de moto com a bolsa térmica, passando rápido pela rua", pos: "object-[72%_50%]" },
  ],
  salao: [
    // 37594386, 33312298, 12935066, 36729739
    { src: "/venda/solucoes/salao-2.jpg", alt: "Garçom anotando o pedido da mesa num aparelho de mão" },
    { src: "/venda/solucoes/salao-3b.jpg", alt: "Amigos brindando sobre a mesa cheia de pratos" },
    { src: "/venda/solucoes/salao-4b.jpg", alt: "Atendente sorrindo no caixa, com a tela do pedido virada para o cliente" },
    { src: "/venda/solucoes/salao-5.jpg", alt: "Dona do restaurante de braços cruzados no balcão" },
  ],
  impressao: [
    // 38181070, 4253300
    { src: "/venda/solucoes/impressao-2.jpg", alt: "Comanda impressa com os itens do pedido saindo na cozinha" },
    { src: "/venda/solucoes/impressao-3b.jpg", alt: "Dois cozinheiros montando os pratos na cozinha aberta" },
  ],
  painel: [
    // 12935057, 8475171, 36430088
    { src: "/venda/solucoes/painel-2.jpg", alt: "Cozinheiro olhando os pedidos numa tela" },
    { src: "/venda/solucoes/painel-3b.jpg", alt: "Dono do restaurante virando a placa da porta" },
    { src: "/venda/solucoes/painel-4b.jpg", alt: "Cozinheiro finalizando um prato na bancada" },
  ],
  totem: [
    // 37594419, 39468953, 37594413
    { src: "/venda/solucoes/totem-2b.jpg", alt: "Maquininha no balcão ao lado do lanche pronto" },
    { src: "/venda/solucoes/totem-3b.jpg", alt: "Cliente pegando a bandeja com os lanches no balcão" },
    { src: "/venda/solucoes/totem-4b.jpg", alt: "Clientes escolhendo o pedido na tela do balcão" },
  ],
};

/** as telas de cada aba, montadas no palco */
function Palco({ id }: { id: Solucao["id"] }) {
  switch (id) {
    case "delivery":
      return (
        <div className="absolute top-7 left-1/2 w-[11.5rem] -translate-x-1/2 sm:top-9 sm:w-[13.5rem]">
          <Celular tela={TELAS.cardapio} sizes="14rem" />
        </div>
      );
    case "salao":
      return (
        <>
          <div className="absolute top-8 left-[7%] w-[44%] max-w-[12rem] -rotate-3 sm:left-[16%]">
            <Celular tela={TELAS.salao} sizes="12rem" />
          </div>
          <div className="absolute top-16 right-[7%] w-[42%] max-w-[11.5rem] rotate-3 sm:right-[16%]">
            <Celular tela={TELAS.comanda} sizes="12rem" />
          </div>
        </>
      );
    case "impressao":
      return (
        <div className="absolute top-6 left-1/2 w-[12.5rem] -translate-x-1/2 -rotate-2 sm:top-8 sm:w-[14rem]">
          <ViaImpressa />
        </div>
      );
    case "painel":
      return (
        <>
          <div className="absolute top-9 left-[5%] w-[80%] sm:left-[8%] sm:w-[72%]">
            <Notebook tela={TELAS.computador} sizes="(min-width: 768px) 32rem, 80vw" />
          </div>
          <div className="absolute top-20 right-[5%] w-[30%] max-w-[9rem] sm:right-[9%]">
            <Celular tela={TELAS.painel} sizes="9rem" />
          </div>
        </>
      );
    case "totem":
      return (
        <div className="absolute top-8 left-1/2 w-[10.5rem] -translate-x-1/2 sm:w-[12rem]">
          <TotemAparelho />
        </div>
      );
  }
}

export function Solucoes() {
  const [aba, setAba] = useState(0);
  const [frase, setFrase] = useState(0);
  const [automatico, setAutomatico] = useState(true);
  const toque = useRef<number | null>(null);

  const atual = SOLUCOES[aba];
  const total = atual.frases.length;
  const Icone = atual.icon;

  useEffect(() => {
    if (!automatico) return;
    const id = window.setInterval(() => setFrase((f) => (f + 1) % total), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [automatico, total, aba]);

  const escolherAba = (i: number) => {
    setAba(i);
    setFrase(0);
    setAutomatico(true);
  };
  const irPara = (i: number) => {
    setFrase((i + total) % total);
    setAutomatico(false);
  };

  return (
    <div>
      <div role="tablist" aria-label="Partes do sistema" className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {SOLUCOES.map((s, i) => {
          const Icon = s.icon;
          const ativa = i === aba;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              aria-controls="solucao-painel"
              onClick={() => escolherAba(i)}
              className={cn(
                // finas e discretas, a pedido dele: eram de 44px, com sombra
                "flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.8rem] font-bold transition-colors sm:h-9 sm:px-3.5 sm:text-[0.84rem]",
                ativa
                  ? "border-brand/30 bg-brand-soft text-brand"
                  : "border-line bg-bg text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {s.nome}
            </button>
          );
        })}
      </div>

      <div
        id="solucao-painel"
        role="tabpanel"
        className="mx-auto mt-6 max-w-3xl rounded-[1.75rem] border border-line bg-bg p-3.5 shadow-[0_30px_60px_-40px_rgb(0_0_0/0.35)] sm:mt-10 sm:p-5"
      >
        <div className="flex items-center gap-3 px-2 pt-1 pb-3.5 sm:pb-4">
          <Icone className="size-5 text-brand" aria-hidden="true" />
          <p className="flex-1 font-extrabold">{atual.titulo}</p>
          <p className="text-sm font-bold text-faint tabular-nums">
            {frase + 1}/{total}
          </p>
        </div>

        <div
          className="relative h-[24rem] touch-pan-y overflow-hidden rounded-[1.3rem] bg-[radial-gradient(120%_80%_at_85%_100%,rgb(249_104_11/0.45),transparent_60%),linear-gradient(160deg,#2a1c13,#120d0a)] sm:h-[27rem]"
          onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (toque.current === null) return;
            const dx = e.changedTouches[0].clientX - toque.current;
            toque.current = null;
            if (Math.abs(dx) > 40) irPara(frase + (dx < 0 ? 1 : -1));
          }}
        >
          {/* As camadas ficam todas montadas, uma por cima da outra, e só a
              da frase atual aparece: a troca vira um esmaecer, sem piscar
              branco enquanto a foto seguinte carrega. */}
          <div className={cn("absolute inset-0 transition-opacity duration-500", frase === 0 ? "opacity-100" : "opacity-0")}>
            <Palco id={atual.id} />
          </div>
          {FOTOS[atual.id].map((foto, i) => (
            <div
              key={foto.src}
              aria-hidden={frase !== i + 1}
              className={cn(
                "absolute inset-0 transition-opacity duration-500",
                frase === i + 1 ? "opacity-100" : "opacity-0",
              )}
            >
              <Image src={foto.src} alt={foto.alt} fill sizes="(min-width: 768px) 46rem, 92vw" className={cn("object-cover", foto.pos)} />
            </div>
          ))}

          {/* a frase, por cima das telas */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0f0b08] via-[#0f0b08]/90 to-transparent px-5 pt-24 pb-5 sm:px-7 sm:pb-6">
            <p
              key={`${atual.id}-${frase}`}
              aria-live="polite"
              className="animate-[surgir_0.35s_ease-out] text-[1.1rem] leading-snug font-extrabold text-balance text-white sm:text-[1.3rem]"
            >
              {atual.frases[frase]}
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-1.5 pt-4 pb-1">
          {atual.frases.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Frase ${i + 1} de ${total}`}
              aria-current={i === frase}
              className="grid h-6 place-items-center"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all",
                  i === frase ? "w-7 bg-brand" : "w-2 bg-line-strong",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
