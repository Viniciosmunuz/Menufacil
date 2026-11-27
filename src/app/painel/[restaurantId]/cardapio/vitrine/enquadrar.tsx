"use client";

import { Expand, Hand, Maximize, MoveHorizontal, MoveVertical, Shrink } from "lucide-react";
import { useRef, useState } from "react";

import { BannerEnquadrado, FAIXA_DO_DESTAQUE, type BannerDestaque } from "@/components/site/destaques-passando";
import { cn } from "@/lib/cn";

import { enquadrarBanner } from "../actions";

// O enquadramento do banner: a prévia, e o que mexe nela.
//
// **A prévia é a faixa do cardápio, não uma parecida.** Mesma proporção
// (10:3), mesmo componente, mesma conta. Como a faixa é em proporção, e
// não em pixel, o que o dono vê aqui é o corte exato de qualquer celular.
//
// **Mexe-se na própria imagem.** Antes eram três réguas, e a pessoa tinha
// de traduzir "a letra está atrás, à esquerda" em "régua do meio para a
// direita". Agora ela arrasta a imagem com o dedo, e a régua de tamanho
// vai da imagem inteira até bem de perto. As réguas de posição ficam
// para quem prefere o teclado ou quer o ajuste fino.
//
// **A prévia anda junto com o dedo, e o banco só no fim.** Salvando a
// cada pixel seriam dezenas de gravações num arrasto só, e o cardápio do
// cliente seria derrubado em todas elas.

export type Enquadramento = { escala: number; focoX: number; focoY: number };

const prender = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

function Regua({
  icone,
  rotulo,
  valor,
  max,
  mexendo,
  soltou,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: number;
  max: number;
  mexendo: (n: number) => void;
  soltou: () => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="grid size-7 shrink-0 place-items-center text-faint" aria-hidden="true">
        {icone}
      </span>
      <span className="sr-only">{rotulo}</span>
      <input
        type="range"
        min={0}
        max={max}
        value={valor}
        aria-label={rotulo}
        onChange={(e) => mexendo(Number(e.target.value))}
        // o toque e o mouse soltam de jeitos diferentes; o teclado
        // termina no blur, senão quem ajusta pela seta nunca salva
        onPointerUp={soltou}
        onKeyUp={soltou}
        onBlur={soltou}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-brand [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand"
      />
    </label>
  );
}

export function EditorDoBanner({ restaurantId, banner }: { restaurantId: string; banner: BannerDestaque }) {
  const inicial: Enquadramento = { escala: banner.escala ?? 0, focoX: banner.focoX ?? 50, focoY: banner.focoY ?? 50 };
  const [valor, setValor] = useState<Enquadramento>(inicial);
  const [salvando, setSalvando] = useState(false);
  // o que já está no banco: sem isto, soltar sem ter mexido gravaria de
  // novo e derrubaria o cardápio do cliente à toa
  const salvo = useRef(inicial);
  // o que vale agora, para o salvar do fim do arrasto não ler um estado
  // de um quadro atrás
  const atual = useRef(inicial);
  const arrasto = useRef<{ x: number; y: number; de: Enquadramento; largura: number; altura: number } | null>(null);
  const [arrastando, setArrastando] = useState(false);

  const mudar = (e: Enquadramento) => {
    atual.current = e;
    setValor(e);
  };

  const guardar = async () => {
    const e = atual.current;
    const antes = salvo.current;
    if (e.escala === antes.escala && e.focoX === antes.focoX && e.focoY === antes.focoY) return;
    salvo.current = e;
    setSalvando(true);
    const dados = new FormData();
    dados.set("restaurantId", restaurantId);
    dados.set("id", banner.id);
    dados.set("escala", String(e.escala));
    dados.set("focoX", String(e.focoX));
    dados.set("focoY", String(e.focoY));
    try {
      await enquadrarBanner(dados);
    } finally {
      setSalvando(false);
    }
  };

  const pronto = (e: Enquadramento) => {
    mudar(e);
    void guardar();
  };

  /**
   * Quanto a imagem ocupa na faixa, em pixels: a mesma conta do
   * `medidaDoBanner`, que lá é feita pelo CSS. Serve para traduzir o
   * arrasto do dedo em foco.
   */
  const medida = (largura: number, altura: number, e: Enquadramento) => {
    const r = banner.largura && banner.altura ? banner.largura / banner.altura : 16 / 9;
    const preenche = Math.max(largura, altura * r);
    const inteira = Math.min(largura, altura * r);
    const z = e.escala / 100;
    const w = z <= 1 ? inteira + (preenche - inteira) * z : preenche * z;
    return { w, h: w / r };
  };

  const comecar = (ev: React.PointerEvent<HTMLDivElement>) => {
    const caixa = ev.currentTarget.getBoundingClientRect();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    arrasto.current = { x: ev.clientX, y: ev.clientY, de: atual.current, largura: caixa.width, altura: caixa.height };
    setArrastando(true);
  };

  /**
   * O foco que faz a imagem andar junto com o dedo.
   *
   * A posição da imagem é (faixa - imagem) x foco. Andar `d` pixels é,
   * então, mudar o foco em d / (faixa - imagem). Isso vale nos dois casos:
   * imagem maior que a faixa (o divisor é negativo, e arrastar para a
   * direita traz o lado esquerdo) e imagem menor (anda para onde o dedo
   * vai). Quando os dois tamanhos são iguais naquele sentido, não há para
   * onde ir, e o foco fica.
   */
  const mover = (ev: React.PointerEvent<HTMLDivElement>) => {
    const a = arrasto.current;
    if (!a) return;
    const { w, h } = medida(a.largura, a.altura, a.de);
    const sobraX = a.largura - w;
    const sobraY = a.altura - h;
    mudar({
      ...a.de,
      focoX: Math.abs(sobraX) > 1 ? prender(a.de.focoX + ((ev.clientX - a.x) / sobraX) * 100) : a.de.focoX,
      focoY: Math.abs(sobraY) > 1 ? prender(a.de.focoY + ((ev.clientY - a.y) / sobraY) * 100) : a.de.focoY,
    });
  };

  const soltar = () => {
    if (!arrasto.current) return;
    arrasto.current = null;
    setArrastando(false);
    void guardar();
  };

  return (
    <div className="flex max-w-[24rem] flex-col gap-3">
      <div
        onPointerDown={comecar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        // sem isto o celular entende o arrasto como rolar a página
        className={cn(
          "relative touch-none overflow-hidden rounded-card border border-line bg-surface-2 select-none",
          arrastando ? "cursor-grabbing" : "cursor-grab",
          FAIXA_DO_DESTAQUE,
        )}
      >
        <BannerEnquadrado banner={{ ...banner, ...valor }} sizes="24rem" arrastando={arrastando} />
      </div>

      <p className="-mt-1 flex items-center gap-1.5 text-xs text-faint">
        <Hand className="size-3.5" aria-hidden="true" />
        Arraste a imagem para mover. É assim que o cliente vê.
      </p>

      <div className="flex flex-col gap-1">
        <Regua
          icone={<Maximize className="size-4" />}
          rotulo="Tamanho da imagem"
          valor={valor.escala}
          max={200}
          mexendo={(n) => mudar({ ...atual.current, escala: n })}
          soltou={() => void guardar()}
        />
        {/* As três paradas da régua de tamanho, escritas embaixo dela:
            no começo a imagem inteira, no meio ela preenche a faixa, no
            fim o dobro disso. */}
        <div className="ml-9 flex justify-between text-[0.7rem] font-semibold text-faint" aria-hidden="true">
          <span>Inteira</span>
          <span>Preenche</span>
          <span>Mais perto</span>
        </div>
      </div>

      <Regua
        icone={<MoveHorizontal className="size-4" />}
        rotulo="Mover para os lados"
        valor={valor.focoX}
        max={100}
        mexendo={(n) => mudar({ ...atual.current, focoX: n })}
        soltou={() => void guardar()}
      />
      <Regua
        icone={<MoveVertical className="size-4" />}
        rotulo="Mover para cima e para baixo"
        valor={valor.focoY}
        max={100}
        mexendo={(n) => mudar({ ...atual.current, focoY: n })}
        soltou={() => void guardar()}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => pronto({ escala: 0, focoX: 50, focoY: 50 })}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors",
            valor.escala === 0 ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
          )}
        >
          <Shrink className="size-3.5" aria-hidden="true" />
          Imagem inteira
        </button>
        <button
          type="button"
          onClick={() => pronto({ escala: 100, focoX: 50, focoY: 50 })}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors",
            valor.escala === 100 ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
          )}
        >
          <Expand className="size-3.5" aria-hidden="true" />
          Preencher a faixa
        </button>
        <span aria-live="polite" className="text-xs text-faint">
          {salvando ? "Salvando..." : ""}
        </span>
      </div>
    </div>
  );
}
