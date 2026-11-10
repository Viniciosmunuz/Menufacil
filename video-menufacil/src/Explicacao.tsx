import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { COR, FONTE } from "./marca";
import {
  Abertura,
  Cardapio,
  Comanda,
  Entregador,
  Fecho,
  Painel,
  Planos,
  SemComissao,
} from "./cenas";

/**
 * O vídeo que explica o MenuFácil, do cardápio ao entregador.
 *
 * Cada cena é um passo do sistema e tem a sua própria fatia da linha do
 * tempo, em segundos -- é assim que dá para mexer na duração de um passo
 * no Studio sem desarrumar os outros. A soma dos tempos abaixo é a
 * duração do vídeo, declarada no Root.
 */
export const CENAS = [
  { id: "abertura", dura: 5.0, Cena: Abertura },
  { id: "cardapio", dura: 7.5, Cena: Cardapio },
  { id: "painel", dura: 7.0, Cena: Painel },
  { id: "comanda", dura: 7.5, Cena: Comanda },
  { id: "entregador", dura: 7.5, Cena: Entregador },
  { id: "semComissao", dura: 7.5, Cena: SemComissao },
  { id: "planos", dura: 7.0, Cena: Planos },
  { id: "fecho", dura: 6.0, Cena: Fecho },
] as const;

export const DURACAO_EM_SEGUNDOS = CENAS.reduce((t, c) => t + c.dura, 0);

export const Explicacao: React.FC = () => {
  const { fps } = useVideoConfig();
  let inicio = 0;

  return (
    <AbsoluteFill style={{ background: COR.bg, fontFamily: FONTE }}>
      {CENAS.map(({ id, dura, Cena }) => {
        const from = Math.round(inicio * fps);
        inicio += dura;
        return (
          <Sequence key={id} from={from} durationInFrames={Math.round(dura * fps)} name={id}>
            <Cena />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
