"use client";

import { Maximize2, MoveHorizontal, MoveVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { enquadrarBanner } from "../actions";

// Os três controles do enquadramento, logo abaixo da prévia.
//
// Existem porque arte boa chegava no lugar errado. A faixa é mais larga
// que alta do que a imagem, então o navegador corta de cima e de baixo,
// e a logo cobre o canto de baixo à esquerda -- a primeira arte que ele
// fez na IA veio com "NO CARDÁPIO" exatamente ali. Sem isto, o caminho
// era voltar na IA e refazer; com isto, ele aproxima um pouco e empurra
// para o lado, olhando a prévia.
//
// **A prévia anda junto com o dedo, e o banco só no fim.** Enquanto a
// pessoa arrasta, quem muda é o estado da tela; ao soltar, a ação vai
// ao servidor. Salvando a cada pixel, seriam dezenas de gravações num
// arrasto só, e o cardápio do cliente seria derrubado em todas elas.

export type Enquadramento = { escala: number; focoX: number; focoY: number };

function Controle({
  icone,
  rotulo,
  valor,
  min,
  max,
  mexendo,
  soltou,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: number;
  min: number;
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
        min={min}
        max={max}
        value={valor}
        aria-label={rotulo}
        onChange={(e) => mexendo(Number(e.target.value))}
        // o toque e o mouse soltam de jeitos diferentes; o teclado
        // termina no blur, senão quem ajusta pela seta nunca salva
        onPointerUp={soltou}
        onKeyUp={soltou}
        onBlur={soltou}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-brand [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand"
      />
    </label>
  );
}

export function ControlesDoEnquadramento({
  restaurantId,
  bannerId,
  valor,
  mudou,
}: {
  restaurantId: string;
  bannerId: string;
  valor: Enquadramento;
  /** avisa a prévia a cada movimento, antes de salvar */
  mudou: (e: Enquadramento) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  // o que já está no banco: sem isto, soltar sem ter mexido gravaria de
  // novo e derrubaria o cardápio do cliente à toa
  const salvo = useRef(valor);

  useEffect(() => {
    salvo.current = valor;
    // só quando troca de banner: dentro do mesmo, quem manda é o dedo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerId]);

  const guardar = async () => {
    const atual = valor;
    const antes = salvo.current;
    if (atual.escala === antes.escala && atual.focoX === antes.focoX && atual.focoY === antes.focoY) return;
    salvo.current = atual;
    setSalvando(true);
    const dados = new FormData();
    dados.set("restaurantId", restaurantId);
    dados.set("id", bannerId);
    dados.set("escala", String(atual.escala));
    dados.set("focoX", String(atual.focoX));
    dados.set("focoY", String(atual.focoY));
    try {
      await enquadrarBanner(dados);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex max-w-[22rem] flex-col gap-2.5">
      <Controle
        icone={<Maximize2 className="size-4" />}
        rotulo="Aproximar a imagem"
        valor={valor.escala}
        min={100}
        max={200}
        mexendo={(n) => mudou({ ...valor, escala: n })}
        soltou={guardar}
      />
      <Controle
        icone={<MoveHorizontal className="size-4" />}
        rotulo="Mover para os lados"
        valor={valor.focoX}
        min={0}
        max={100}
        mexendo={(n) => mudou({ ...valor, focoX: n })}
        soltou={guardar}
      />
      <Controle
        icone={<MoveVertical className="size-4" />}
        rotulo="Mover para cima e para baixo"
        valor={valor.focoY}
        min={0}
        max={100}
        mexendo={(n) => mudou({ ...valor, focoY: n })}
        soltou={guardar}
      />
      <span aria-live="polite" className="h-4 text-xs text-faint">
        {salvando ? "Salvando..." : ""}
      </span>
    </div>
  );
}
