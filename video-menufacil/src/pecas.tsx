import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COR, FONTE } from "./marca";

/**
 * As peças que todas as cenas usam.
 *
 * O vídeo explica o sistema, então ele precisa parecer o sistema: mesmo
 * creme de fundo, mesmos cantos arredondados, mesmo laranja de ação. Quem
 * vê o vídeo e depois abre o MenuFácil tem que reconhecer o lugar.
 */

/** a curva de sempre: sai rápido, chega devagar */
const SUAVE = Easing.bezier(0.16, 1, 0.3, 1);

/** Sobe e aparece. O deslocamento é pequeno de propósito: texto que voa
 *  muito rouba a atenção do que está sendo explicado. */
export const Sobe: React.FC<{
  children: React.ReactNode;
  atrasa?: number;
  distancia?: number;
  style?: React.CSSProperties;
}> = ({ children, atrasa = 0, distancia = 34, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        ...style,
        opacity: interpolate(frame, [atrasa * fps, atrasa * fps + 0.5 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: SUAVE,
        }),
        translate: interpolate(
          frame,
          [atrasa * fps, atrasa * fps + 0.7 * fps],
          [`0px ${distancia}px`, "0px 0px"],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: SUAVE },
        ),
      }}
    >
      {children}
    </div>
  );
};

/** O número da etapa e o assunto, no alto. É o fio que diz em que passo
 *  do sistema estamos. */
export const Etapa: React.FC<{ n: string; texto: string }> = ({ n, texto }) => (
  <Sobe style={{ display: "flex", alignItems: "center", gap: 18 }}>
    <span
      style={{
        display: "grid",
        placeItems: "center",
        width: 64,
        height: 64,
        borderRadius: 20,
        background: COR.brand,
        color: COR.brandInk,
        fontWeight: 800,
        fontSize: 32,
      }}
    >
      {n}
    </span>
    <span
      style={{
        fontSize: 27,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: COR.muted,
      }}
    >
      {texto}
    </span>
  </Sobe>
);

/** O título da cena. Uma linha em tinta, outra em laranja: o laranja fica
 *  na palavra que carrega a frase. */
export const Titulo: React.FC<{ linhas: [string, string]; atrasa?: number }> = ({
  linhas,
  atrasa = 0.25,
}) => (
  <Sobe atrasa={atrasa}>
    <h1
      style={{
        margin: "26px 0 0",
        fontSize: 92,
        lineHeight: 1.0,
        letterSpacing: "-0.035em",
        fontWeight: 800,
        color: COR.ink,
      }}
    >
      {linhas[0]}
      <br />
      <span style={{ color: COR.brand }}>{linhas[1]}</span>
    </h1>
  </Sobe>
);

/** A frase de apoio, que explica o que a tela está mostrando. */
export const Apoio: React.FC<{ children: React.ReactNode; atrasa?: number }> = ({
  children,
  atrasa = 0.5,
}) => (
  <Sobe atrasa={atrasa}>
    <p
      style={{
        margin: "24px 0 0",
        fontSize: 34,
        lineHeight: 1.4,
        color: COR.muted,
        maxWidth: 820,
      }}
    >
      {children}
    </p>
  </Sobe>
);

/**
 * O celular que segura as telas de verdade.
 *
 * A moldura existe para a captura não parecer um print solto: ela diz
 * "isto é um telefone na mão de alguém". A tela escorre devagar por
 * dentro, como quem passa o olho.
 */
export const Celular: React.FC<{
  arquivo: string;
  atrasa?: number;
  escorre?: number;
  escuro?: boolean;
}> = ({ arquivo, atrasa = 0.4, escorre = 0, escuro = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;

  return (
    <div
      style={{
        position: "relative",
        width: 520,
        height: 1040,
        padding: 13,
        borderRadius: 64,
        background: escuro
          ? "linear-gradient(160deg, #2a2f36, #0b0d10)"
          : "linear-gradient(160deg, #e9e0d2, #c3b7a4)",
        boxShadow: "0 50px 90px -40px rgba(29,32,38,0.45)",
        opacity: interpolate(frame, [d, d + 0.6 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: SUAVE,
        }),
        translate: interpolate(frame, [d, d + 0.9 * fps], ["0px 70px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: SUAVE,
        }),
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 52,
          overflow: "hidden",
          background: escuro ? COR.night : COR.surface,
        }}
      >
        <Img
          src={staticFile(arquivo)}
          style={{
            display: "block",
            width: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            translate: interpolate(
              frame,
              [d + 1.0 * fps, d + 5.5 * fps],
              ["0px 0px", `0px ${-escorre}px`],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.linear },
            ),
          }}
        />
        {/* a ilha do topo: a captura vem sem ela, e sem ela o telefone
            vira um retângulo qualquer */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 16,
            translate: "-50% 0",
            width: 124,
            height: 32,
            borderRadius: 999,
            background: "#000",
          }}
        />
      </div>
    </div>
  );
};

/** O fundo de toda cena: papel branco com o creme da marca por baixo. */
export const Palco: React.FC<{ children: React.ReactNode; escuro?: boolean }> = ({
  children,
  escuro = false,
}) => (
  <AbsoluteFill
    style={{
      fontFamily: FONTE,
      background: escuro ? COR.night : COR.bg,
      padding: "150px 84px 130px",
    }}
  >
    {!escuro && (
      <AbsoluteFill
        style={{
          background: `radial-gradient(58% 30% at 50% 78%, ${COR.brandTint}, transparent 70%)`,
        }}
      />
    )}
    <AbsoluteFill style={{ padding: "150px 84px 130px" }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);
