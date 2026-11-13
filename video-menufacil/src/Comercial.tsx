import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { COR, FONTE, seg } from "./marca";

/**
 * O comercial do sistema, só em design gráfico -- sem ator e sem voz.
 *
 * Ele pediu um "comercial de app caro". O que faz um comercial desses
 * parecer caro não é efeito, é contenção: fundo escuro, um aparelho só
 * em cena, luz laranja por trás, e uma frase curta por vez. Por isso
 * este é o único vídeo do canal de fundo preto -- os outros são papel
 * branco porque explicam; este vende.
 *
 * **As telas são as de verdade.** O cardápio e o painel de pedidos são
 * capturas do sistema, as mesmas do site. A conversa da Lia é desenhada,
 * porque print de WhatsApp não aguenta o tamanho da tela, mas o que ela
 * diz é o que ela faz: anota, ouve áudio, manda o Pix.
 *
 * **Uma história só atravessa as cenas.** A Marina pede uma picanha
 * pela Lia, o pedido #1 dela aparece no painel e é o mesmo que sai na
 * comanda: R$ 53,00, retirada, Pix. O painel é uma captura, então a
 * conversa e a comanda foram escritas para bater com ele, e não o
 * contrário.
 *
 * **Não há narração.** Todo texto na tela está ali porque ninguém fala.
 * Se entrar locução por cima, as chamadas de cada cena saem.
 */

export const DURACAO_COMERCIAL = 32;

const SERIFADA = '"Playfair Display", Georgia, serif';
const MONO = '"JetBrains Mono", Consolas, monospace';

const NOITE = COR.night;
const BRANCO = "#ffffff";
const VELADO = "rgba(255,255,255,0.62)";

/** Onde cada cena entra e sai, em segundos. As vizinhas se sobrepõem
    três décimos: é o fundido de uma na outra. */
const CENA = {
  caos: [0, 4.3],
  virada: [3.7, 6.6],
  cardapio: [6.0, 13.4],
  lia: [13.1, 20.6],
  painel: [20.3, 26.8],
  marca: [26.5, 32],
} as const;

// ─── movimento ────────────────────────────────────────────────────────

const SUAVE = Easing.bezier(0.22, 1, 0.36, 1);
const PRESO = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 → 1 a partir de `de` segundos, com a curva da casa. */
const vai = (t: number, de: number, dura = 0.6) =>
  interpolate(t, [de, de + dura], [0, 1], { ...PRESO, easing: SUAVE });

/** o tempo da cena em segundos, e um salto de mola a partir de `de` */
const useTempo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const mola = (de: number, rigidez = 140) =>
    spring({ frame: frame - de * fps, fps, config: { damping: 15, stiffness: rigidez, mass: 0.8 } });
  return { t, mola, frame, fps };
};

/** O envelope de uma cena: entra subindo, sai encolhendo. */
const Cena: React.FC<{ children: React.ReactNode; dura: number; semSaida?: boolean }> = ({
  children,
  dura,
  semSaida,
}) => {
  const { t } = useTempo();
  const entra = vai(t, 0, 0.5);
  const sai = semSaida ? 0 : vai(t, dura - 0.4, 0.4);
  return (
    <AbsoluteFill
      style={{
        fontFamily: FONTE,
        opacity: entra * (1 - sai),
        transform: `translateY(${(1 - entra) * 50}px) scale(${1 - sai * 0.06})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ─── o fundo ──────────────────────────────────────────────────────────

/**
 * Preto com duas luzes laranja que andam devagar.
 *
 * São gradientes radiais, e não desfoque: `filter: blur` numa área deste
 * tamanho dobra o tempo de render, e o gradiente dá a mesma luz.
 */
const Fundo: React.FC = () => {
  const frame = useCurrentFrame();
  const a = frame / 30;
  const x1 = 50 + Math.sin(a * 0.35) * 28;
  const y1 = 34 + Math.cos(a * 0.27) * 10;
  const x2 = 50 + Math.cos(a * 0.3) * 30;
  const y2 = 78 + Math.sin(a * 0.22) * 8;
  return (
    <AbsoluteFill
      style={{
        background: [
          `radial-gradient(60% 34% at ${x1}% ${y1}%, rgba(249,104,11,0.34), transparent 70%)`,
          `radial-gradient(55% 30% at ${x2}% ${y2}%, rgba(249,104,11,0.16), transparent 70%)`,
          NOITE,
        ].join(","),
      }}
    />
  );
};

// ─── a chamada de cada cena ───────────────────────────────────────────

/**
 * Duas linhas: a primeira firme e branca, a segunda serifada, itálica e
 * laranja. É o mesmo título de duas vozes dos outros vídeos do canal,
 * só que no escuro -- é o que mantém este comercial na mesma família.
 */
const Chamada: React.FC<{
  a: string;
  b?: string;
  atrasa?: number;
  topo?: number;
  tamanho?: number;
}> = ({ a, b, atrasa = 0.2, topo = 150, tamanho = 84 }) => {
  const { t } = useTempo();
  const p1 = vai(t, atrasa);
  const p2 = vai(t, atrasa + 0.25);
  return (
    <div style={{ position: "absolute", top: topo, left: 60, right: 60, textAlign: "center" }}>
      <div
        style={{
          fontSize: tamanho,
          fontWeight: 800,
          letterSpacing: -2.4,
          lineHeight: 1.06,
          color: BRANCO,
          opacity: p1,
          transform: `translateY(${(1 - p1) * 26}px)`,
        }}
      >
        {a}
      </div>
      {b ? (
        <div
          style={{
            fontFamily: SERIFADA,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: tamanho * 1.02,
            lineHeight: 1.14,
            color: COR.brand,
            opacity: p2,
            transform: `translateY(${(1 - p2) * 26}px)`,
          }}
        >
          {b}
        </div>
      ) : null}
    </div>
  );
};

/** A pílula de vidro que fecha uma cena com um argumento só. */
const Pilula: React.FC<{ children: React.ReactNode; atrasa: number; cheia?: boolean }> = ({
  children,
  atrasa,
  cheia,
}) => {
  const { mola } = useTempo();
  const p = mola(atrasa);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "20px 38px",
        borderRadius: 999,
        fontSize: 36,
        fontWeight: 800,
        letterSpacing: -0.4,
        whiteSpace: "nowrap",
        color: cheia ? COR.brandInk : BRANCO,
        background: cheia ? COR.brand : "rgba(255,255,255,0.08)",
        border: cheia ? "none" : "1.5px solid rgba(255,255,255,0.18)",
        boxShadow: cheia ? "0 18px 50px -12px rgba(249,104,11,0.7)" : "none",
        opacity: Math.min(1, p * 1.4),
        transform: `scale(${0.7 + p * 0.3})`,
      }}
    >
      {children}
    </span>
  );
};

// ─── o aparelho ───────────────────────────────────────────────────────

/**
 * O celular: moldura escura, canto bem redondo, luz laranja por trás.
 *
 * A perspectiva fica no pai e o giro no filho -- com as duas no mesmo
 * elemento o giro sai achatado, sem profundidade.
 */
const Telefone: React.FC<{
  children: React.ReactNode;
  largura?: number;
  altura?: number;
  rx?: number;
  ry?: number;
}> = ({ children, largura = 520, altura = 1068, rx = 0, ry = 0 }) => (
  <div style={{ perspective: 2200 }}>
    <div
      style={{
        width: largura + 28,
        height: altura + 28,
        padding: 14,
        borderRadius: 74,
        background: "linear-gradient(145deg,#2b2e35,#0b0c0f 55%)",
        boxShadow: [
          "0 0 0 2px rgba(255,255,255,0.10) inset",
          "0 70px 120px -30px rgba(0,0,0,0.85)",
          "0 0 140px -10px rgba(249,104,11,0.45)",
        ].join(","),
        transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: largura,
          height: altura,
          borderRadius: 60,
          overflow: "hidden",
          background: BRANCO,
        }}
      >
        {children}
        {/* o brilho do vidro: uma faixa diagonal quase invisível */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 28%)",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  </div>
);

// ─── cena 1: o sábado à noite ─────────────────────────────────────────

const AVISOS = [
  { quem: "Marina", texto: "boa noite, tá aberto?", hora: "19:42" },
  { quem: "Rafael", texto: "quero 2 x-tudo e 1 coca 2L", hora: "19:44" },
  { quem: "Júlia", texto: "moço??", hora: "20:05" },
  { quem: "Pedro", texto: "alguém aí?", hora: "20:19" },
  { quem: "Rafael", texto: "cadê meu pedido, já faz 1 hora", hora: "20:38" },
  { quem: "Marina", texto: "vou pedir em outro lugar", hora: "20:41" },
];

/**
 * A tela de bloqueio de quem toca o restaurante: o relógio e os avisos
 * empilhando sem resposta. É a mesma cena do cartão "sem o Menu Fácil"
 * do site, agora em movimento.
 */
const Caos: React.FC = () => {
  const { t, mola } = useTempo();
  const dura = CENA.caos[1] - CENA.caos[0];
  const treme = t > 2.9 ? Math.sin(t * 60) * 3 * vai(t, 2.9, 0.3) : 0;
  return (
    <Cena dura={dura}>
      <div
        style={{
          position: "absolute",
          top: 150,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: vai(t, 0.1),
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700, color: VELADO, letterSpacing: 0.6 }}>
          sábado à noite
        </div>
        <div style={{ fontSize: 190, fontWeight: 300, color: BRANCO, letterSpacing: -6, lineHeight: 1 }}>
          20:41
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 470,
          left: 70,
          right: 70,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          transform: `translateX(${treme}px)`,
        }}
      >
        {AVISOS.map((a, i) => {
          const de = 0.45 + i * 0.38;
          const p = mola(de, 170);
          if (t < de) return null;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "22px 26px",
                borderRadius: 34,
                background: "rgba(255,255,255,0.10)",
                border: "1.5px solid rgba(255,255,255,0.14)",
                opacity: Math.min(1, p * 1.5),
                transform: `translateY(${(1 - p) * 46}px) scale(${0.9 + p * 0.1})`,
              }}
            >
              <span
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 20,
                  background: "#25d366",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.6 4v-4h-.1A2.5 2.5 0 0 1 4 13.5v-8Z"
                    fill="#fff"
                  />
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 31, fontWeight: 800, color: BRANCO }}>{a.quem}</span>
                  <span style={{ fontSize: 24, fontWeight: 600, color: VELADO }}>{a.hora}</span>
                </div>
                <div style={{ fontSize: 31, fontWeight: 500, color: "rgba(255,255,255,0.86)" }}>
                  {a.texto}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Chamada a="37 conversas." b="nenhuma resposta." atrasa={2.2} topo={1500} tamanho={80} />
    </Cena>
  );
};

// ─── cena 2: a virada ─────────────────────────────────────────────────

/**
 * A laranja toma a tela a partir do centro, diz uma frase e sobe.
 *
 * É a única transição com gesto do vídeo, e fica aqui de propósito: é
 * o ponto em que o assunto deixa de ser o problema e passa a ser o
 * sistema. Todas as outras são fundido.
 */
const Virada: React.FC = () => {
  const { t } = useTempo();
  const dura = CENA.virada[1] - CENA.virada[0];
  const abre = vai(t, 0, 0.7);
  const sobe = interpolate(t, [dura - 0.6, dura], [0, 1], {
    ...PRESO,
    easing: Easing.bezier(0.7, 0, 0.3, 1),
  });
  const p1 = vai(t, 0.55);
  const p2 = vai(t, 0.8);
  return (
    <AbsoluteFill
      style={{
        background: COR.brand,
        clipPath: `circle(${abre * 125}% at 50% 50%)`,
        transform: `translateY(${-sobe * 100}%)`,
        fontFamily: FONTE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 118,
            fontWeight: 800,
            letterSpacing: -4,
            lineHeight: 1.02,
            color: BRANCO,
            opacity: p1,
            transform: `translateY(${(1 - p1) * 30}px)`,
          }}
        >
          Tem um jeito
        </div>
        <div
          style={{
            fontFamily: SERIFADA,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 138,
            lineHeight: 1.1,
            color: COR.brandInk,
            opacity: p2,
            transform: `translateY(${(1 - p2) * 30}px)`,
          }}
        >
          melhor.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── cena 3: o cardápio ───────────────────────────────────────────────

const PRATOS = [
  { foto: "picanha.webp", nome: "Picanha", preco: "R$ 38,00", x: -372, y: -250, gira: -7 },
  { foto: "parmegiana-frango.webp", nome: "Parmegiana", preco: "R$ 40,00", x: 376, y: -120, gira: 6 },
  { foto: "pizza-especial.webp", nome: "Pizza especial", preco: "R$ 62,00", x: -380, y: 250, gira: 5 },
  { foto: "tambaqui.webp", nome: "Tambaqui", preco: "R$ 54,00", x: 372, y: 360, gira: -5 },
];

/** Um prato que salta de dentro do aparelho e fica boiando ao lado. */
const Prato: React.FC<{ p: (typeof PRATOS)[number]; atrasa: number; i: number }> = ({
  p,
  atrasa,
  i,
}) => {
  const { t, mola } = useTempo();
  const m = mola(atrasa, 110);
  if (t < atrasa) return null;
  const boia = Math.sin(t * 1.3 + i * 1.7) * 10;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 236,
        marginLeft: -118,
        marginTop: -150,
        borderRadius: 30,
        overflow: "hidden",
        background: COR.surface,
        boxShadow: "0 40px 70px -20px rgba(0,0,0,0.75), 0 0 0 1.5px rgba(255,255,255,0.14)",
        opacity: Math.min(1, m * 1.6),
        transform: `translate(${p.x * m}px, ${p.y * m + boia}px) rotate(${p.gira * m}deg) scale(${0.35 + m * 0.65})`,
      }}
    >
      <Img
        src={staticFile(`fotos/${p.foto}`)}
        style={{ width: 236, height: 190, objectFit: "cover", display: "block" }}
      />
      <div style={{ padding: "14px 18px 18px" }}>
        <div style={{ fontSize: 25, fontWeight: 800, color: COR.ink, whiteSpace: "nowrap" }}>{p.nome}</div>
        <div style={{ fontSize: 23, fontWeight: 800, color: COR.brand }}>{p.preco}</div>
      </div>
    </div>
  );
};

const Cardapio: React.FC = () => {
  const { t, mola } = useTempo();
  const dura = CENA.cardapio[1] - CENA.cardapio[0];
  const chega = vai(t, 0.2, 1.1);
  // O aparelho chega deitado e se levanta; depois balança de leve, para
  // nunca ficar parado -- aparelho imóvel é print, não comercial.
  const ry = (1 - chega) * -34 + Math.sin(t * 0.8) * 5;
  const rx = (1 - chega) * 26 + 4;

  // o toque no "+" da picanha, nas coordenadas da captura
  const TOQUE = 2.4;
  const onda = vai(t, TOQUE, 0.55);
  const barra = mola(TOQUE + 0.35, 150);

  return (
    <Cena dura={dura}>
      <Chamada a="O seu cardápio." b="no seu link." />

      <div
        style={{
          position: "absolute",
          top: 410,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `translateY(${(1 - chega) * 220}px)`,
        }}
      >
        <div style={{ position: "relative" }}>
          <Telefone rx={rx} ry={ry}>
            <Img
              src={staticFile("telas/tela-cardapio.jpg")}
              style={{
                width: 520,
                height: 1068,
                objectFit: "cover",
                objectPosition: "top",
                display: "block",
              }}
            />
            {t >= TOQUE ? (
              <span
                style={{
                  position: "absolute",
                  left: 294 - 60,
                  top: 666 - 60,
                  width: 120,
                  height: 120,
                  borderRadius: 120,
                  background: "rgba(249,104,11,0.35)",
                  border: "3px solid rgba(249,104,11,0.9)",
                  opacity: 1 - onda,
                  transform: `scale(${0.3 + onda * 1.1})`,
                }}
              />
            ) : null}
            {/* a barra do carrinho, que nasce quando o primeiro item entra */}
            <div
              style={{
                position: "absolute",
                left: 18,
                right: 18,
                bottom: 22,
                padding: "20px 26px",
                borderRadius: 26,
                background: COR.brand,
                color: BRANCO,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 25,
                fontWeight: 800,
                boxShadow: "0 16px 34px -10px rgba(201,79,8,0.8)",
                transform: `translateY(${(1 - barra) * 140}px)`,
              }}
            >
              <span>1 item · R$ 38,00</span>
              <span>Ver carrinho →</span>
            </div>
          </Telefone>

          {PRATOS.map((p, i) => (
            <Prato key={p.nome} p={p} i={i} atrasa={3.3 + i * 0.22} />
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 1630, textAlign: "center" }}>
        <Pilula atrasa={4.9} cheia>
          Sem comissão por pedido
        </Pilula>
      </div>
    </Cena>
  );
};

// ─── cena 4: a Lia ────────────────────────────────────────────────────

const ZAP = {
  fundo: "#efeae2",
  dele: "#d9fdd3",
  dela: "#ffffff",
  tinta: "#111b21",
  cinza: "#667781",
};

const Balao: React.FC<{
  children: React.ReactNode;
  de: "cliente" | "lia";
  atrasa: number;
  hora: string;
}> = ({ children, de, atrasa, hora }) => {
  const { t, mola } = useTempo();
  if (t < atrasa) return null;
  const p = mola(atrasa, 190);
  const dele = de === "cliente";
  return (
    <div
      style={{
        alignSelf: dele ? "flex-end" : "flex-start",
        maxWidth: 400,
        padding: "12px 16px 8px",
        borderRadius: dele ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
        background: dele ? ZAP.dele : ZAP.dela,
        color: ZAP.tinta,
        fontSize: 25,
        lineHeight: 1.3,
        fontWeight: 500,
        boxShadow: "0 1px 1px rgba(0,0,0,0.12)",
        opacity: Math.min(1, p * 1.6),
        transformOrigin: dele ? "100% 100%" : "0% 100%",
        transform: `scale(${0.6 + p * 0.4})`,
      }}
    >
      {children}
      <div style={{ fontSize: 16, color: ZAP.cinza, textAlign: "right", marginTop: 2 }}>{hora}</div>
    </div>
  );
};

/** O áudio do cliente: o botão, a onda e o tempo. A onda vai se
    pintando, que é ela sendo ouvida. */
const OAudio: React.FC<{ atrasa: number }> = ({ atrasa }) => {
  const { t } = useTempo();
  const ouvido = interpolate(t, [atrasa + 0.3, atrasa + 1.5], [0, 1], PRESO);
  const barras = Array.from(
    { length: 26 },
    (_, i) => 8 + Math.abs(Math.sin(i * 1.9) * Math.cos(i * 0.6)) * 30,
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, width: 330 }}>
      <svg width="34" height="34" viewBox="0 0 24 24">
        <path d="M7 4.5v15l12-7.5-12-7.5Z" fill={ZAP.cinza} />
      </svg>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
        {barras.map((h, i) => (
          <span
            key={i}
            style={{
              width: 5,
              height: h,
              borderRadius: 4,
              background: i / barras.length < ouvido ? COR.brand : "#a8b3ba",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 18, color: ZAP.cinza }}>0:07</span>
    </div>
  );
};

/** O cartão do Pix: um QR desenhado, o valor e o botão de copiar. */
const Pix: React.FC = () => {
  const N = 11;
  const canto = (l: number, c: number) =>
    (l < 3 && c < 3) || (l < 3 && c >= N - 3) || (l >= N - 3 && c < 3);
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", width: 350 }}>
      <div
        style={{
          width: 120,
          height: 120,
          padding: 8,
          borderRadius: 12,
          background: BRANCO,
          border: `1.5px solid ${COR.line}`,
          display: "grid",
          gridTemplateColumns: `repeat(${N}, 1fr)`,
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        {Array.from({ length: N * N }, (_, k) => {
          const l = Math.floor(k / N);
          const c = k % N;
          const cheio = canto(l, c) || (l * 7 + c * 13 + l * c) % 3 === 0;
          return (
            <span key={k} style={{ background: cheio ? ZAP.tinta : "transparent", borderRadius: 1 }} />
          );
        })}
      </div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 700, color: ZAP.cinza }}>Pix · pedido #1</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: ZAP.tinta, letterSpacing: -1 }}>R$ 53,00</div>
        <div
          style={{
            marginTop: 6,
            display: "inline-block",
            padding: "7px 16px",
            borderRadius: 999,
            background: COR.brand,
            color: BRANCO,
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          Copiar código
        </div>
      </div>
    </div>
  );
};

const CenaLia: React.FC = () => {
  const { t, mola } = useTempo();
  const dura = CENA.lia[1] - CENA.lia[0];
  const chega = vai(t, 0.15, 1);
  const ry = (1 - chega) * 30 + 7 + Math.sin(t * 0.8) * 4;
  const rosto = mola(0.7, 120);
  const digita = t > 1.25 && t < 1.85;
  return (
    <Cena dura={dura}>
      <Chamada a="A Lia atende" b="o WhatsApp por você." />

      <div
        style={{
          position: "absolute",
          top: 410,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `translateY(${(1 - chega) * 200}px)`,
        }}
      >
        <div style={{ position: "relative" }}>
          <Telefone rx={4} ry={ry}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: ZAP.fundo,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "46px 22px 16px",
                  background: "#f7f5f3",
                  borderBottom: "1px solid #e3ded6",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <Img
                  src={staticFile("lia-sorriso.webp")}
                  style={{ width: 62, height: 62, borderRadius: 62, objectFit: "cover" }}
                />
                <div>
                  <div style={{ fontSize: 25, fontWeight: 800, color: ZAP.tinta }}>Papaléguas</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: COR.success }}>online</div>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: "20px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                }}
              >
                <Balao de="cliente" atrasa={0.8} hora="20:41">
                  Boa noite! Quero uma picanha e um refri 2L
                </Balao>
                {digita ? (
                  <div
                    style={{
                      alignSelf: "flex-start",
                      padding: "16px 20px",
                      borderRadius: "20px 20px 20px 4px",
                      background: ZAP.dela,
                      display: "flex",
                      gap: 7,
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: 11,
                          background: "#9aa5ab",
                          transform: `translateY(${Math.sin(t * 14 - i * 0.9) * 4}px)`,
                        }}
                      />
                    ))}
                  </div>
                ) : null}
                <Balao de="lia" atrasa={1.85} hora="20:41">
                  Boa noite, Marina! Anotado. É entrega ou retirada?
                </Balao>
                <Balao de="cliente" atrasa={2.8} hora="20:42">
                  <OAudio atrasa={2.8} />
                </Balao>
                <Balao de="lia" atrasa={4.3} hora="20:42">
                  Retirada, combinado! Deu R$ 53,00. Segue o Pix:
                </Balao>
                <Balao de="lia" atrasa={4.9} hora="20:42">
                  <Pix />
                </Balao>
                <Balao de="cliente" atrasa={5.7} hora="20:43">
                  Paguei!
                </Balao>
                <Balao de="lia" atrasa={6.3} hora="20:43">
                  Recebido! Seu pedido já está na cozinha.
                </Balao>
              </div>
            </div>
          </Telefone>

          {/* ela, do lado de fora do aparelho, com o anel da marca */}
          <div
            style={{
              position: "absolute",
              right: -150,
              top: -70,
              width: 250,
              height: 250,
              borderRadius: 250,
              padding: 7,
              background: `linear-gradient(140deg, ${COR.brand}, ${COR.brandLine})`,
              boxShadow: "0 40px 70px -20px rgba(0,0,0,0.8), 0 0 90px -10px rgba(249,104,11,0.7)",
              opacity: Math.min(1, rosto * 1.5),
              transform: `scale(${0.4 + rosto * 0.6}) translateY(${Math.sin(t * 1.2) * 8}px)`,
            }}
          >
            <Img
              src={staticFile(t > 4.3 ? "lia-joia.webp" : "lia-mao.webp")}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 250,
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 30,
          right: 30,
          top: 1630,
          display: "flex",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <Pilula atrasa={2.2}>Anota o pedido</Pilula>
        <Pilula atrasa={3.4}>Entende áudio</Pilula>
        <Pilula atrasa={5.2} cheia>
          Manda o Pix
        </Pilula>
      </div>
    </Cena>
  );
};

// ─── cena 5: o painel e a comanda ─────────────────────────────────────

const COMANDA = [
  ["PAPALEGUAS", ""],
  ["--------------------------", ""],
  ["PEDIDO #1", "20:42"],
  ["Marina Souza", ""],
  ["RETIRADA", ""],
  ["--------------------------", ""],
  ["1x Picanha", "38,00"],
  ["1x Refrigerante 2L", "15,00"],
  ["--------------------------", ""],
  ["TOTAL", "R$ 53,00"],
  ["PIX", "PAGO"],
];

const Painel: React.FC = () => {
  const { t, mola } = useTempo();
  const dura = CENA.painel[1] - CENA.painel[0];
  const chega = vai(t, 0.15, 1);
  const pulso = 0.5 + Math.sin(t * 6) * 0.5;
  const aviso = mola(1.1, 150);
  // A comanda sai aos trancos, linha por linha, que é como impressora
  // térmica anda. Subindo liso ela parece um papel sendo puxado.
  const LINHAS = COMANDA.length + 2;
  const saiu = Math.floor(interpolate(t, [2.2, 4.6], [0, LINHAS], PRESO));
  const ALTURA_DA_LINHA = 38;
  const papel = saiu * ALTURA_DA_LINHA;

  const L = 940;
  const A = (L * 556) / 800;
  const k = L / 800;

  return (
    <Cena dura={dura}>
      <Chamada a="O pedido chega pronto." b="e sai impresso na cozinha." tamanho={76} />

      <div
        style={{
          position: "absolute",
          top: 440,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          perspective: 2200,
          transform: `translateY(${(1 - chega) * 160}px)`,
        }}
      >
        <div
          style={{
            width: L,
            borderRadius: 26,
            overflow: "hidden",
            background: "#1b1e24",
            boxShadow:
              "0 70px 120px -30px rgba(0,0,0,0.9), 0 0 140px -20px rgba(249,104,11,0.5), 0 0 0 1.5px rgba(255,255,255,0.12)",
            transform: `rotateX(${10 + (1 - chega) * 20}deg) rotateY(${Math.sin(t * 0.7) * 4}deg)`,
          }}
        >
          <div style={{ height: 46, display: "flex", alignItems: "center", gap: 10, padding: "0 20px" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <span key={c} style={{ width: 14, height: 14, borderRadius: 14, background: c }} />
            ))}
            <span
              style={{
                marginLeft: 18,
                flex: 1,
                height: 26,
                borderRadius: 13,
                background: "rgba(255,255,255,0.08)",
                color: VELADO,
                fontSize: 15,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
              }}
            >
              menufacildelivery.com.br/painel
            </span>
          </div>
          <div style={{ position: "relative", width: L, height: A }}>
            <Img
              src={staticFile("telas/tela-pedidos.jpg")}
              style={{ width: L, height: A, display: "block" }}
            />
            {/* o pedido que acabou de chegar: a linha dele acende */}
            <span
              style={{
                position: "absolute",
                left: 70 * k,
                top: 194 * k,
                width: 714 * k,
                height: 46 * k,
                borderRadius: 10 * k,
                boxShadow: `0 0 0 ${3 + pulso * 3}px rgba(249,104,11,${0.75 * aviso}), 0 0 ${30 + pulso * 30}px rgba(249,104,11,${0.55 * aviso})`,
              }}
            />
          </div>
        </div>
      </div>

      {/* a impressora: só a boca dela, e o papel descendo */}
      <div
        style={{
          position: "absolute",
          top: 1195,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 560,
            height: 74,
            borderRadius: "22px 22px 12px 12px",
            background: "linear-gradient(180deg,#2c3038,#15181d)",
            boxShadow: "0 0 0 1.5px rgba(255,255,255,0.10) inset, 0 30px 60px -20px rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            opacity: vai(t, 1.4),
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 800, color: VELADO, letterSpacing: 2 }}>COZINHA</span>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 14,
              background: t > 2.1 && t < 4.7 && pulso < 0.5 ? "#0f5a2a" : COR.success,
              boxShadow: `0 0 16px ${COR.success}`,
            }}
          />
        </div>
        <div style={{ width: 450, height: papel, overflow: "hidden", marginTop: -8 }}>
          <div
            style={{
              height: LINHAS * ALTURA_DA_LINHA,
              marginTop: papel - LINHAS * ALTURA_DA_LINHA,
              background: "#fbfaf6",
              padding: `${ALTURA_DA_LINHA * 0.6}px 28px`,
              fontFamily: MONO,
              color: "#1c1c1c",
            }}
          >
            {COMANDA.map(([a, b], i) => {
              const forte = a === "PEDIDO #1" || a === "TOTAL";
              return (
                <div
                  key={i}
                  style={{
                    height: ALTURA_DA_LINHA,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    fontSize: forte ? 27 : 23,
                    fontWeight: forte ? 800 : 600,
                  }}
                >
                  <span>{a}</span>
                  <span>{b}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Cena>
  );
};

// ─── cena 6: a marca ──────────────────────────────────────────────────

const Marca: React.FC = () => {
  const { t, mola } = useTempo();
  const dura = CENA.marca[1] - CENA.marca[0];
  const logo = mola(0.05, 90);
  const nome = vai(t, 0.5);
  const risco = vai(t, 1.0, 0.7);
  return (
    <Cena dura={dura} semSaida>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
        <Img
          src={staticFile("logo-menufacil.svg")}
          style={{
            width: 380,
            opacity: Math.min(1, logo * 1.4),
            transform: `scale(${0.5 + logo * 0.5})`,
          }}
        />
        <div
          style={{
            fontSize: 124,
            fontWeight: 800,
            letterSpacing: -4,
            lineHeight: 1,
            opacity: nome,
            transform: `translateY(${(1 - nome) * 24}px)`,
          }}
        >
          <span style={{ color: BRANCO }}>Menu </span>
          <span style={{ color: COR.brand }}>Fácil</span>
        </div>
        <div style={{ width: 420 * risco, height: 2, background: "rgba(255,255,255,0.22)" }} />
        <div style={{ display: "flex", gap: 14 }}>
          <Pilula atrasa={1.5}>Delivery</Pilula>
          <Pilula atrasa={1.7}>Salão</Pilula>
          <Pilula atrasa={1.9}>Balcão</Pilula>
        </div>
        <div
          style={{
            fontFamily: SERIFADA,
            fontStyle: "italic",
            fontSize: 58,
            color: COR.brand,
            opacity: vai(t, 2.3),
          }}
        >
          sem comissão por pedido.
        </div>
        <div
          style={{
            marginTop: 30,
            fontSize: 38,
            fontWeight: 700,
            color: VELADO,
            letterSpacing: 0.4,
            opacity: vai(t, 2.9),
          }}
        >
          menufacildelivery.com.br
        </div>
      </AbsoluteFill>
    </Cena>
  );
};

// ─── a montagem ───────────────────────────────────────────────────────

const Trecho: React.FC<{ de: readonly [number, number]; children: React.ReactNode }> = ({
  de,
  children,
}) => (
  <Sequence from={seg(de[0])} durationInFrames={seg(de[1] - de[0])}>
    {children}
  </Sequence>
);

export const Comercial: React.FC = () => (
  <AbsoluteFill style={{ background: NOITE }}>
    <Fundo />
    <Trecho de={CENA.caos}>
      <Caos />
    </Trecho>
    <Trecho de={CENA.cardapio}>
      <Cardapio />
    </Trecho>
    <Trecho de={CENA.lia}>
      <CenaLia />
    </Trecho>
    <Trecho de={CENA.painel}>
      <Painel />
    </Trecho>
    <Trecho de={CENA.marca}>
      <Marca />
    </Trecho>
    {/* a laranja passa por cima de tudo: é ela que cobre a troca do
        problema pelo sistema */}
    <Trecho de={CENA.virada}>
      <Virada />
    </Trecho>
  </AbsoluteFill>
);
