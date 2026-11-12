import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { COR, FONTE } from "./marca";

/**
 * As peças do vídeo em formato tutorial, no molde da referência que ele
 * mandou -- aquele passo a passo de fundo branco que roda no Instagram.
 *
 * **A anatomia de cada passo, que é o que faz o estilo.** Um selo
 * numerado no alto com o nome da etapa em maiúsculas e uma linha fina
 * atravessando até a borda. Abaixo, o título em duas vozes: a primeira
 * linha em sans pesada preta, a segunda em serifada itálica azul,
 * sublinhada. No meio, um desenho de traço fino -- nunca uma foto. No
 * rodapé, uma frase curta com uma palavra em azul.
 *
 * **O azul é da referência, e não da marca.** É o único lugar deste
 * repositório onde a laranja do MenuFácil não manda, e é de propósito:
 * o que ele pediu foi um vídeo igual àquele, e o azul tipográfico é
 * metade da identidade do formato. A marca aparece no fecho, onde ela
 * tem de aparecer.
 */
export const T = {
  papel: "#ffffff",
  tinta: "#0f1115",
  tinta2: "#6b7280",
  linha: "#e6e8eb",
  /**
   * A laranja da marca, no lugar do azul da referência.
   *
   * A referência usa azul tipográfico, e no primeiro corte eu o copiei.
   * Ele pediu a cor dele, e tem razão: o formato se copia, a cor não --
   * é ela que faz o vídeo ser reconhecível como do Menu Fácil quando
   * passa no meio do feed de alguém.
   *
   * Os dois tons saem de globals.css: a cheia no texto, a clara nos
   * sublinhados, que precisam marcar sem roubar a leitura.
   */
  marca: COR.brand,
  marcaClara: COR.brandLine,
  grade: "#f3f4f6",
} as const;

const SERIFADA = '"Playfair Display", Georgia, serif';

// ─── movimento ────────────────────────────────────────────────────────

const SUAVE = Easing.bezier(0.22, 1, 0.36, 1);

const sobe = (frame: number, fps: number, atrasa: number, dura = 0.45) =>
  interpolate(frame, [atrasa * fps, (atrasa + dura) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: SUAVE,
  });

export const Entra: React.FC<{
  children: React.ReactNode;
  atrasa?: number;
  sobeDe?: number;
}> = ({ children, atrasa = 0, sobeDe = 18 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * sobeDe}px)` }}>{children}</div>
  );
};

// ─── o selo do passo ──────────────────────────────────────────────────

/**
 * O selo numerado do topo: quadradinho preto, nome da etapa e a linha.
 *
 * A linha cresce da esquerda para a direita quando o passo entra. É o
 * único movimento do cabeçalho, e é o que dá a sensação de "mais um
 * item da lista" sem precisar de transição nenhuma entre as cenas.
 */
export const Passo: React.FC<{ numero: number; nome: string; atrasa?: number }> = ({
  numero,
  nome,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.4);
  const risco = sobe(frame, fps, atrasa + 0.15, 0.6);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: p }}>
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: T.tinta,
          color: T.papel,
          fontFamily: FONTE,
          fontSize: 24,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {numero}
      </span>
      <span
        style={{
          fontFamily: FONTE,
          fontSize: 25,
          fontWeight: 700,
          letterSpacing: 2.6,
          color: T.tinta2,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {nome}
      </span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: T.linha,
          transformOrigin: "left",
          transform: `scaleX(${risco})`,
        }}
      />
    </div>
  );
};

// ─── o título de duas vozes ───────────────────────────────────────────

/**
 * O título: a primeira linha firme, a segunda cantada.
 *
 * O contraste entre a sans pesada e a serifada itálica é o que carrega
 * o formato inteiro -- é ele que faz uma tela com três frases parecer
 * editorial em vez de slide. A segunda linha é opcional: nos passos de
 * uma frase só, a referência usa apenas a preta.
 */
export const Titulo: React.FC<{
  preta: React.ReactNode;
  azul?: React.ReactNode;
  tamanho?: number;
  atrasa?: number;
}> = ({ preta, azul, tamanho = 88, atrasa = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p1 = sobe(frame, fps, atrasa, 0.5);
  const p2 = sobe(frame, fps, atrasa + 0.25, 0.5);
  const risco = sobe(frame, fps, atrasa + 0.6, 0.5);

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: FONTE,
          fontSize: tamanho,
          fontWeight: 800,
          letterSpacing: -2,
          lineHeight: 1.08,
          color: T.tinta,
          opacity: p1,
          transform: `translateY(${(1 - p1) * 14}px)`,
        }}
      >
        {preta}
      </div>
      {azul ? (
        <div style={{ display: "inline-block", opacity: p2, transform: `translateY(${(1 - p2) * 14}px)` }}>
          <div
            style={{
              fontFamily: SERIFADA,
              fontSize: tamanho * 1.02,
              fontStyle: "italic",
              fontWeight: 500,
              lineHeight: 1.12,
              color: T.marca,
              padding: "0 6px",
            }}
          >
            {azul}
          </div>
          <div
            style={{
              height: 2,
              background: T.marcaClara,
              transformOrigin: "left",
              transform: `scaleX(${risco})`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

/** A legenda do rodapé, com uma palavra em azul sublinhado. */
export const Legenda: React.FC<{ children: React.ReactNode; atrasa?: number }> = ({
  children,
  atrasa = 0,
}) => (
  <Entra atrasa={atrasa}>
    <div
      style={{
        fontFamily: FONTE,
        fontSize: 38,
        fontWeight: 600,
        color: T.tinta,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  </Entra>
);

/** A palavra em azul dentro da legenda. */
export const Destaque: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      color: T.marca,
      borderBottom: `2px solid ${T.marcaClara}`,
      paddingBottom: 2,
    }}
  >
    {children}
  </span>
);

/** O comentário miúdo em cinza, logo abaixo do desenho. */
export const Nota: React.FC<{ children: React.ReactNode; atrasa?: number }> = ({
  children,
  atrasa = 0,
}) => (
  <Entra atrasa={atrasa}>
    <div style={{ fontFamily: FONTE, fontSize: 28, color: "#b6bcc4", textAlign: "center" }}>
      {children}
    </div>
  </Entra>
);

// ─── desenhos de traço ────────────────────────────────────────────────

/** Uma moldura de traço fino, que é como a referência desenha interface. */
export const Quadro: React.FC<{
  children: React.ReactNode;
  largura?: number;
  atrasa?: number;
  sem?: boolean;
}> = ({ children, largura = 520, atrasa = 0, sem }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.5);
  return (
    <div
      style={{
        width: largura,
        border: sem ? "none" : `2px solid ${T.tinta}`,
        borderRadius: 10,
        background: T.papel,
        opacity: p,
        transform: `translateY(${(1 - p) * 16}px)`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
};

/** O botão azul da referência: cheio, cantos pequenos, texto branco. */
export const BotaoMarca: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      display: "inline-block",
      background: T.marca,
      color: T.papel,
      fontFamily: FONTE,
      fontSize: 26,
      fontWeight: 700,
      borderRadius: 8,
      padding: "12px 24px",
    }}
  >
    {children}
  </span>
);

/**
 * Uma bolha de conversa, no desenho de traço do formato.
 *
 * A referência não usa print de WhatsApp: desenha a interface com duas
 * linhas e uma caixa. Aqui é igual -- a bolha do cliente é preenchida
 * de cinza claro, a da Lia fica com o contorno preto.
 */
export const Bolha: React.FC<{
  children: React.ReactNode;
  de: "cliente" | "lia";
  atrasa?: number;
}> = ({ children, de, atrasa = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.4);
  const doCliente = de === "cliente";
  return (
    <div
      style={{
        alignSelf: doCliente ? "flex-end" : "flex-start",
        maxWidth: "78%",
        background: doCliente ? "#eef2f7" : T.papel,
        border: `2px solid ${doCliente ? "transparent" : T.tinta}`,
        borderRadius: doCliente ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        padding: "16px 20px",
        fontFamily: FONTE,
        fontSize: 29,
        lineHeight: 1.35,
        color: T.tinta,
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** O rosto da Lia, em círculo, para as cenas em que ela é o assunto. */
export const Lia: React.FC<{ tamanho?: number; atrasa?: number }> = ({
  tamanho = 150,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.5);
  return (
    <div
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho,
        overflow: "hidden",
        border: `2px solid ${T.tinta}`,
        opacity: p,
        transform: `scale(${0.85 + p * 0.15})`,
      }}
    >
      <Img src={staticFile("lia.webp")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

/** O ícone do app, para a abertura e o fecho. */
export const Icone: React.FC<{ tamanho?: number; atrasa?: number }> = ({
  tamanho = 150,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.5);
  return (
    <div
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho * 0.23,
        overflow: "hidden",
        opacity: p,
        transform: `scale(${0.85 + p * 0.15})`,
        boxShadow: "0 12px 34px rgba(15,17,21,0.14)",
      }}
    >
      <Img
        src={staticFile("icone-menufacil.png")}
        style={{ width: "116%", height: "116%", marginLeft: "-8%", marginTop: "-8%", objectFit: "cover" }}
      />
    </div>
  );
};

/**
 * O fundo: papel branco com uma grade técnica quase invisível.
 *
 * Na referência ela aparece atrás dos desenhos, como papel milimetrado
 * velado. Serve para o branco não ficar chapado quando a tela tem pouca
 * coisa -- e some assim que um desenho entra por cima.
 */
export const Fundo: React.FC = () => (
  <AbsoluteFill
    style={{
      background: T.papel,
      backgroundImage: `linear-gradient(${T.grade} 1px, transparent 1px), linear-gradient(90deg, ${T.grade} 1px, transparent 1px)`,
      backgroundSize: "120px 120px",
      backgroundPosition: "center",
    }}
  />
);

/** A moldura da cena: tudo vive entre o selo do topo e a legenda do pé. */
export const Tela: React.FC<{ children: React.ReactNode; gap?: number }> = ({
  children,
  gap = 48,
}) => (
  <AbsoluteFill style={{ padding: "140px 80px 300px", gap, alignItems: "center", justifyContent: "center" }}>
    {children}
  </AbsoluteFill>
);

/** A marca, no fecho. */
export const Marca: React.FC<{ atrasa?: number }> = ({ atrasa = 0 }) => (
  <Entra atrasa={atrasa}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <Icone tamanho={160} atrasa={atrasa} />
      {/* "Menu" preto, "Fácil" laranja: é como ele quer a assinatura, e
          funciona porque separa o que é descrição do que é marca. */}
      <div style={{ fontFamily: FONTE, fontSize: 64, fontWeight: 800, letterSpacing: -1.4 }}>
        <span style={{ color: T.tinta }}>Menu </span>
        <span style={{ color: T.marca }}>Fácil</span>
      </div>
      <div style={{ fontFamily: FONTE, fontSize: 34, fontWeight: 600, color: COR.brandPress }}>
        menufacildelivery.com.br
      </div>
    </div>
  </Entra>
);
