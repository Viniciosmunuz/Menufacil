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
 * As peças do vídeo em estilo painel.
 *
 * A ideia: em vez de telas chapadas sobre fundo branco, cartões de vidro
 * escuro flutuando sobre uma foto de verdade do restaurante. O fundo dá o
 * cheiro do lugar, e os cartões contam o número. É o contrário do que eu
 * tinha feito antes -- lá a tela era o assunto; aqui o assunto é o
 * resultado, e o sistema aparece como quem entrega esse resultado.
 */

const SUAVE = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * O fundo: a comida do Papaléguas, escurecida e fora de foco, com um
 * empurrão lento de zoom. Escurecer não é só estética -- cartão claro
 * sobre foto crua some, e o texto deixa de ser legível.
 */
export const Fundo: React.FC<{ foto: string; brilho?: number }> = ({ foto, brilho = 0.34 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: "#07090c", overflow: "hidden" }}>
      <Img
        src={staticFile(`fotos/${foto}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: `blur(22px) saturate(1.1) brightness(${brilho})`,
          scale: interpolate(frame, [0, durationInFrames], [1.12, 1.26], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            output: "perceptual-scale",
          }),
        }}
      />
      {/* O calor da marca, por cima da foto. Discreto de propósito: com
          o laranja forte a foto inteira ficava vermelha e os cartões
          perdiam o contraste. Aqui ele é só um brilho de canto, e a cor
          volta a vir de onde deve -- dos próprios cartões. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(52% 30% at 78% 12%, rgba(249,104,11,0.15), transparent 72%),
                       linear-gradient(180deg, rgba(7,9,12,0.62), rgba(7,9,12,0.93))`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Um cartão de vidro escuro, que é a unidade de tudo neste vídeo. */
export const Cartao: React.FC<{
  children: React.ReactNode;
  atrasa?: number;
  destaque?: boolean;
  style?: React.CSSProperties;
}> = ({ children, atrasa = 0, destaque = false, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;

  return (
    <div
      style={{
        padding: "30px 34px",
        borderRadius: 28,
        background: destaque ? "rgba(249,104,11,0.16)" : "rgba(18,20,24,0.72)",
        border: `1px solid ${destaque ? "rgba(249,104,11,0.55)" : "rgba(255,255,255,0.10)"}`,
        backdropFilter: "blur(18px)",
        boxShadow: "0 30px 70px -35px rgba(0,0,0,0.9)",
        ...style,
        opacity: interpolate(frame, [d, d + 0.45 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: SUAVE,
        }),
        translate: interpolate(frame, [d, d + 0.65 * fps], ["0px 44px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: SUAVE,
        }),
      }}
    >
      {children}
    </div>
  );
};

/**
 * O número grande, contado de zero até o valor.
 *
 * O contador é o truque que faz o número parecer vivo: parado, ele é só
 * um dado; subindo, vira o dia do restaurante acontecendo.
 */
export const Dinheiro: React.FC<{
  ate: number;
  atrasa?: number;
  duracao?: number;
  tamanho?: number;
  cor?: string;
}> = ({ ate, atrasa = 0, duracao = 1.6, tamanho = 128, cor = COR.bg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = interpolate(frame, [atrasa * fps, (atrasa + duracao) * fps], [0, ate], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: SUAVE,
  });

  return (
    <span
      style={{
        fontSize: tamanho,
        fontWeight: 800,
        letterSpacing: "-0.04em",
        color: cor,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      R$ {v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
};

/** A barra que enche, embaixo do número. */
export const Barra: React.FC<{ atrasa?: number; cor?: string }> = ({
  atrasa = 0,
  cor = COR.brand,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        marginTop: 22,
        height: 10,
        borderRadius: 999,
        background: "rgba(255,255,255,0.12)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: 999,
          background: `linear-gradient(90deg, ${COR.brandPress}, ${cor})`,
          width: `${interpolate(frame, [atrasa * fps, (atrasa + 1.8) * fps], [0, 100], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: SUAVE,
          })}%`,
        }}
      />
    </div>
  );
};

/** O rótulo com a bolinha de estado, no topo dos cartões. */
export const Rotulo: React.FC<{ texto: string; apoio?: string; cor?: string }> = ({
  texto,
  apoio,
  cor = COR.brand,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <span
      style={{
        width: 30,
        height: 30,
        borderRadius: 999,
        background: `${cor}22`,
        border: `2px solid ${cor}`,
        display: "grid",
        placeItems: "center",
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 999, background: cor }} />
    </span>
    <span style={{ fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>{texto}</span>
    {apoio && (
      <span style={{ marginLeft: "auto", fontSize: 24, color: "rgba(255,255,255,0.5)" }}>{apoio}</span>
    )}
  </div>
);

/** Uma linha de pedido, das que entram uma atrás da outra. */
export const LinhaPedido: React.FC<{
  titulo: string;
  detalhe: string;
  valor: string;
  quando: string;
  atrasa: number;
  cor?: string;
}> = ({ titulo, detalhe, valor, quando, atrasa, cor = COR.success }) => (
  <Cartao atrasa={atrasa} style={{ padding: "24px 28px", borderRadius: 24 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          background: `${cor}1f`,
          border: `2px solid ${cor}`,
          flex: "none",
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>{titulo}</div>
        <div style={{ fontSize: 23, color: "rgba(255,255,255,0.52)", marginTop: 5 }}>{detalhe}</div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.45)" }}>{quando}</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: cor, marginTop: 5 }}>{valor}</div>
      </div>
    </div>
  </Cartao>
);

/** O título da cena, no alto, sempre na mesma altura. */
export const Chamada: React.FC<{ linhas: [string, string]; atrasa?: number }> = ({
  linhas,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;
  return (
    <h1
      style={{
        margin: 0,
        fontFamily: FONTE,
        fontSize: 82,
        lineHeight: 1.02,
        letterSpacing: "-0.04em",
        fontWeight: 800,
        color: COR.bg,
        opacity: interpolate(frame, [d, d + 0.5 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: SUAVE,
        }),
        translate: interpolate(frame, [d, d + 0.7 * fps], ["0px 30px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: SUAVE,
        }),
      }}
    >
      {linhas[0]}
      <br />
      <span style={{ color: COR.brand }}>{linhas[1]}</span>
    </h1>
  );
};

/** O palco escuro de todas as cenas deste vídeo. */
export const PalcoEscuro: React.FC<{ foto: string; children: React.ReactNode }> = ({
  foto,
  children,
}) => (
  <AbsoluteFill style={{ fontFamily: FONTE }}>
    <Fundo foto={foto} />
    <AbsoluteFill style={{ padding: "150px 76px 140px" }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);
