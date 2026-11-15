import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GROTESCA } from "./CarrosselComissao";
import { COMANDA, Telefone, ZAP } from "./Comercial";
import { COR, FONTE, FPS, seg } from "./marca";

// "Chamada": o comercial feito para chamar o dono de restaurante.
//
// Pedido dele em 14/11/2026, depois de a página de venda ficar pronta. É
// outro vídeo, e não uma versão do Comercial: aquele é narrado, tem 37
// segundos e conta a história inteira. Este não tem voz. É letra grande e
// tela de verdade, em 24 segundos, para rodar sem som no feed e no story
// -- por isso tudo o que importa está escrito.
//
// O fio é a frase do topo do site: "Pedidos chegando prontos. Sem você
// digitar nada." As três cenas do meio são as três partes dela (o link, a
// Lia, a comanda), e a frase inteira só aparece depois que o dono viu cada
// uma acontecer.
//
// Na segunda rodada ele pediu para o vídeo mostrar os dois caminhos do
// cliente, que é como o sistema funciona de verdade: a Lia recebe quem
// chama e manda o link na boas-vindas; uns pedem pelo link, e quem
// prefere pede ali mesmo na conversa. A boas-vindas da tela segue o
// modelo de src/server/ia/responder.ts, encurtada para caber no balão.
//
// Depois ele pediu narração e mandou a locução do ElevenLabs (a mesma voz
// do Comercial). Ela foi cortada em uma faixa por frase, em
// public/voz-chamada/1..7.wav, já em -14 LUFS, e cada faixa entra pouco
// depois de a cena dela abrir. Assim o vídeo pode andar no passo calmo
// que ele pediu sem esticar a voz: o respiro fica entre as frases. As
// letras grandes continuam, para quem assiste sem som.
//
// Valem as regras das outras peças: fundo claro, título na Bricolage
// pesada, nenhuma cidade, e nada de "sem taxa" (o pagamento online passa
// pelo Mercado Pago, que cobra a dele).

const PRESO = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** as cenas, em segundos: [entra, sai]. Cada uma se cruza um pouco com a seguinte. */
const CENA = {
  // medidas para a locução: cada cena dura a frase dela e mais um respiro
  dor: [0, 3.85],
  recebe: [3.62, 8.38],
  link: [8.15, 11.69],
  conversa: [11.46, 16.85],
  cozinha: [16.62, 20.92],
  frase: [20.69, 23.85],
  marca: [23.62, 27.31],
} as const;

/**
 * O passo do vídeo. Ele achou a primeira versão corrida e pediu "uma
 * pegada mais devagar": em vez de mexer cena por cena, o relógio inteiro
 * anda mais lento. Tudo o que está escrito em segundos neste arquivo
 * (cenas, entradas, molas, sons) é multiplicado por este número.
 */
const CALMA = 1.3;

export const DURACAO_CHAMADA = CENA.marca[1] * CALMA;

/** o tempo da cena, em segundos, e uma mola que parte de um instante */
const useTempo = () => {
  const frame = useCurrentFrame() / CALMA;
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const mola = (em: number, rigidez = 130, amortece = 16) =>
    spring({ frame: frame - em * fps, fps, config: { stiffness: rigidez, damping: amortece, mass: 0.9 } });
  return { t, mola };
};

/** A cena aparece e some com um esmaecer curto e um passo para cima. */
const Cena: React.FC<{ de: readonly [number, number]; children: React.ReactNode }> = ({ de, children }) => {
  const dura = de[1] - de[0];
  const Dentro: React.FC = () => {
    const { t } = useTempo();
    const entra = interpolate(t, [0, 0.32], [0, 1], PRESO);
    const sai = interpolate(t, [dura - 0.3, dura], [1, 0], PRESO);
    return (
      <AbsoluteFill
        style={{
          opacity: Math.min(entra, sai),
          transform: `translateY(${(1 - entra) * 26 - (1 - sai) * 26}px)`,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  };
  return (
    <Sequence from={seg(de[0] * CALMA)} durationInFrames={seg(dura * CALMA)}>
      <Dentro />
    </Sequence>
  );
};

/** Um título que entra palavra por palavra. `laranja` marca de qual palavra em diante a cor muda. */
const Titulo: React.FC<{
  texto: string;
  em: number;
  tamanho?: number;
  laranja?: number;
  centro?: boolean;
  passo?: number;
}> = ({ texto, em, tamanho = 104, laranja, centro = true, passo = 0.075 }) => {
  const { mola } = useTempo();
  const palavras = texto.split(" ");
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: centro ? "center" : "flex-start",
        columnGap: tamanho * 0.24,
        fontFamily: GROTESCA,
        fontWeight: 800,
        fontSize: tamanho,
        lineHeight: 1.02,
        letterSpacing: "-0.04em",
        color: COR.ink,
      }}
    >
      {palavras.map((p, i) => {
        const m = mola(em + i * passo, 150, 17);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: Math.min(1, m * 1.5),
              transform: `translateY(${(1 - m) * tamanho * 0.5}px)`,
              color: laranja !== undefined && i >= laranja ? COR.brand : undefined,
            }}
          >
            {p}
          </span>
        );
      })}
    </div>
  );
};

/** a etiqueta pequena em cima de cada cena: o número e o assunto */
const Etiqueta: React.FC<{ n: string; children: React.ReactNode; em?: number }> = ({ n, children, em = 0.1 }) => {
  const { mola } = useTempo();
  const m = mola(em);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        fontFamily: FONTE,
        fontWeight: 800,
        fontSize: 30,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: COR.brand,
        opacity: m,
        transform: `translateY(${(1 - m) * 14}px)`,
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 52,
          height: 52,
          borderRadius: 99,
          background: COR.brand,
          color: "#fff",
          letterSpacing: 0,
          fontSize: 28,
        }}
      >
        {n}
      </span>
      {children}
    </div>
  );
};

/** o papel claro da marca, com a luz laranja que muda de canto devagar */
const Fundo: React.FC = () => {
  const frame = useCurrentFrame();
  const x = 78 + Math.sin(frame / 95) * 10;
  const y = 20 + Math.cos(frame / 120) * 6;
  return (
    <AbsoluteFill
      style={{
        background: COR.surface,
        backgroundImage: [
          `radial-gradient(58% 34% at ${x}% ${y}%, rgba(249,104,11,0.2), transparent 70%)`,
          "radial-gradient(70% 36% at 6% 96%, rgba(230,219,202,0.95), transparent 72%)",
        ].join(","),
      }}
    />
  );
};

// ─── 1. a dor: o WhatsApp que não para ────────────────────────────────
// Sem dia nem hora na tela: ele cansou de toda peça abrir com "sábado à
// noite". A cena abre direto no título.

const RECADOS = [
  "boa noite, tá aberto?",
  "quero 2 x-tudo e 1 coca 2L",
  "moço??",
  "cadê meu pedido, já faz 1 hora",
];

const Dor: React.FC = () => {
  const { t, mola } = useTempo();
  // o contador das não lidas sobe enquanto os recados chegam
  const naoLidas = Math.round(interpolate(t, [0.5, 2.6], [3, 37], PRESO));
  return (
    <AbsoluteFill style={{ padding: "320px 84px 0" }}>
      <div>
        <Titulo texto="O WhatsApp não para." em={0.15} tamanho={112} />
      </div>

      <div style={{ marginTop: 90, display: "flex", flexDirection: "column", gap: 20, alignItems: "flex-start" }}>
        {RECADOS.map((r, i) => {
          const m = mola(0.55 + i * 0.42, 190, 15);
          return (
            <div
              key={r}
              style={{
                padding: "22px 30px",
                borderRadius: "30px 30px 30px 8px",
                background: ZAP.dela,
                color: ZAP.tinta,
                fontFamily: FONTE,
                fontWeight: 600,
                fontSize: 42,
                boxShadow: "0 18px 34px -22px rgba(29,32,38,0.5)",
                opacity: Math.min(1, m * 1.6),
                transform: `scale(${0.7 + m * 0.3})`,
                transformOrigin: "0% 100%",
              }}
            >
              {r}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          right: 84,
          top: 1080,
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontFamily: FONTE,
          fontWeight: 800,
          fontSize: 36,
          color: COR.muted,
          opacity: mola(0.6),
        }}
      >
        não lidas
        <span
          style={{
            display: "grid",
            placeItems: "center",
            minWidth: 110,
            height: 110,
            borderRadius: 99,
            background: "#25d366",
            color: "#fff",
            fontFamily: GROTESCA,
            fontSize: 58,
          }}
        >
          {naoLidas}
        </span>
      </div>

      <div style={{ position: "absolute", left: 84, right: 84, top: 1330 }}>
        <Titulo texto="E pedido se perde no meio." em={2.3} tamanho={84} laranja={1} />
      </div>
    </AbsoluteFill>
  );
};

// ─── 3. o primeiro caminho: pelo link ────────────────────────────────

const Link: React.FC = () => {
  const { t, mola } = useTempo();
  const sobe = mola(0.35, 90, 18);
  // A captura tem exatamente a altura da tela, então não há para onde
  // rolar: ela só se aproxima um pouco, devagar, para a cena não ficar parada.
  const perto = interpolate(t, [0.8, 4.3], [1, 1.07], PRESO);
  return (
    <AbsoluteFill style={{ padding: "210px 84px 0", alignItems: "center" }}>
      <Etiqueta n="2">Pelo link</Etiqueta>
      <div style={{ marginTop: 30 }}>
        <Titulo texto="Quem quer, pede sozinho." em={0.2} tamanho={100} laranja={2} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 640,
          transform: `translateY(${(1 - sobe) * 500}px) scale(1.02)`,
          transformOrigin: "50% 0%",
          opacity: Math.min(1, sobe * 1.4),
        }}
      >
        <Telefone>
          <Img
            src={staticFile("telas/tela-cardapio-papaleguas.jpg")}
            style={{ width: "100%", display: "block", transform: `scale(${perto})`, transformOrigin: "50% 30%" }}
          />
        </Telefone>
      </div>
    </AbsoluteFill>
  );
};

// ─── a conversa do WhatsApp, usada nas duas cenas da Lia ──────────────

type Fala = { de: "cliente" | "lia"; texto: string; em: number; link?: string };

/** a boas-vindas: quem chama recebe o link logo na primeira resposta */
const BOAS: Fala[] = [
  { de: "cliente", texto: "Oi, boa noite!", em: 0.8 },
  {
    de: "lia",
    texto: "Olá! 👋 Bem-vindo ao Papaléguas! Eu sou a Lia. Para ver o cardápio e fazer seu pedido, é só tocar no link:",
    link: "menufacildelivery.com.br/restaurante/papaleguas",
    em: 1.6,
  },
];

/** o segundo caminho: o cliente que prefere pedir ali mesmo */
const FALAS: Fala[] = [
  { de: "cliente", texto: "Prefiro pedir por aqui: uma picanha e um refri 2L", em: 0.9 },
  { de: "lia", texto: "Claro! Anotado. É entrega ou retirada?", em: 1.8 },
  { de: "cliente", texto: "Retirada", em: 2.6 },
  { de: "lia", texto: "Combinado! Segue o Pix do pedido 👇", em: 3.3 },
  { de: "lia", texto: "Pagamento confirmado! ✅ Já está em preparo.", em: 4.2 },
];

const Zap: React.FC<{ falas: Fala[]; letra?: number }> = ({ falas, letra = 27 }) => {
  const { mola } = useTempo();
  return (
    <Telefone>
      <div style={{ height: "100%", background: ZAP.fundo, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "74px 26px 18px",
            background: "#f7f5f3",
            borderBottom: "1px solid #e3ded6",
          }}
        >
          <Img
            src={staticFile("lia.webp")}
            style={{ width: 70, height: 70, borderRadius: 99, objectFit: "cover", border: `2px solid ${COR.brand}` }}
          />
          <div style={{ fontFamily: FONTE, lineHeight: 1.15 }}>
            <div style={{ fontWeight: 800, fontSize: 30, color: ZAP.tinta }}>Lia</div>
            <div style={{ fontWeight: 700, fontSize: 21, color: COR.success }}>online</div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, padding: "22px 20px" }}>
          {falas.map((f) => {
            const m = mola(f.em, 190, 16);
            const dele = f.de === "cliente";
            return (
              <div
                key={f.texto}
                style={{
                  alignSelf: dele ? "flex-end" : "flex-start",
                  maxWidth: 410,
                  padding: "14px 18px",
                  borderRadius: dele ? "22px 22px 5px 22px" : "22px 22px 22px 5px",
                  background: dele ? ZAP.dele : ZAP.dela,
                  color: ZAP.tinta,
                  fontFamily: FONTE,
                  fontWeight: 600,
                  fontSize: letra,
                  lineHeight: 1.3,
                  boxShadow: "0 1px 1px rgba(0,0,0,0.12)",
                  opacity: Math.min(1, m * 1.6),
                  transform: `scale(${0.6 + m * 0.4})`,
                  transformOrigin: dele ? "100% 100%" : "0% 100%",
                }}
              >
                {f.texto}
                {f.link && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: COR.brandTint,
                      color: COR.brand,
                      fontWeight: 800,
                      fontSize: letra * 0.86,
                      lineHeight: 1.25,
                      wordBreak: "break-all",
                    }}
                  >
                    📲 {f.link}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Telefone>
  );
};

// ─── 2. a Lia recebe e manda o link ───────────────────────────────────

const Recebe: React.FC = () => {
  const { mola } = useTempo();
  const ela = mola(0.25, 90, 17);
  const fone = mola(0.45, 90, 18);
  return (
    <AbsoluteFill style={{ padding: "210px 84px 0", alignItems: "center" }}>
      <Etiqueta n="1">A Lia</Etiqueta>
      <div style={{ marginTop: 30 }}>
        <Titulo texto="Ela recebe e manda o link." em={0.2} tamanho={100} laranja={2} />
      </div>

      {/* o aparelho com a conversa, um pouco para a direita para ela caber */}
      <div
        style={{
          position: "absolute",
          top: 650,
          left: 400,
          transform: `translateY(${(1 - fone) * 460}px)`,
          opacity: Math.min(1, fone * 1.4),
        }}
      >
        <Zap falas={BOAS} letra={29} />
      </div>

      {/* a Lia em pé, na frente do aparelho */}
      <Img
        src={staticFile("lia-recorte.webp")}
        style={{
          position: "absolute",
          left: -30,
          top: 900,
          width: 470,
          opacity: Math.min(1, ela * 1.4),
          transform: `translateX(${(1 - ela) * -220}px)`,
          filter: "drop-shadow(0 30px 30px rgba(29,32,38,0.25))",
        }}
      />
    </AbsoluteFill>
  );
};

// ─── 4. o segundo caminho: ali mesmo, na conversa ─────────────────────

const Conversa: React.FC = () => {
  const { mola } = useTempo();
  const fone = mola(0.35, 90, 18);
  return (
    <AbsoluteFill style={{ padding: "210px 84px 0", alignItems: "center" }}>
      <Etiqueta n="3">Pelo WhatsApp</Etiqueta>
      <div style={{ marginTop: 30 }}>
        <Titulo texto="Quem prefere, pede ali mesmo." em={0.2} tamanho={100} laranja={2} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 650,
          transform: `translateY(${(1 - fone) * 500}px) scale(1.02)`,
          transformOrigin: "50% 0%",
          opacity: Math.min(1, fone * 1.4),
        }}
      >
        <Zap falas={FALAS} />
      </div>
    </AbsoluteFill>
  );
};

// ─── 5. a cozinha: o pedido no painel e a comanda impressa ────────────

const Cozinha: React.FC = () => {
  const { t, mola } = useTempo();
  const tela = mola(0.3, 90, 18);
  const aviso = mola(1.05, 170, 14);
  // a comanda desce linha a linha, que é como a impressora térmica anda
  const LINHAS = COMANDA.length;
  const saiu = Math.floor(interpolate(t, [1.5, 3.3], [0, LINHAS], PRESO));
  return (
    <AbsoluteFill style={{ padding: "210px 84px 0", alignItems: "center" }}>
      <Etiqueta n="4">Dos dois jeitos</Etiqueta>
      <div style={{ marginTop: 30 }}>
        <Titulo texto="A comanda sai impressa." em={0.2} tamanho={100} laranja={2} />
      </div>

      {/* o painel, num notebook */}
      <div
        style={{
          position: "absolute",
          top: 660,
          left: 70,
          width: 760,
          opacity: Math.min(1, tela * 1.4),
          transform: `translateY(${(1 - tela) * 200}px)`,
        }}
      >
        <div
          style={{
            background: "linear-gradient(#1b1c20,#0c0d10)",
            borderRadius: "22px 22px 6px 6px",
            padding: "14px 14px 18px",
            boxShadow: "0 50px 70px -34px rgba(40,25,10,0.5)",
          }}
        >
          <Img src={staticFile("telas/painel-computador.webp")} style={{ width: "100%", display: "block", borderRadius: 6 }} />
        </div>
        <div
          style={{
            height: 20,
            margin: "0 -54px",
            borderRadius: "3px 3px 18px 18px",
            background: "linear-gradient(#e7e8ec 0,#c9cbd1 28%,#a9abb3 62%,#7d7f87 100%)",
            boxShadow: "0 26px 34px -16px rgba(40,25,10,0.5)",
          }}
        />
      </div>

      {/* o aviso de pedido novo, por cima do painel */}
      <div
        style={{
          position: "absolute",
          top: 610,
          left: 110,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "20px 30px 20px 20px",
          borderRadius: 30,
          background: "#fff",
          border: `2px solid ${COR.line}`,
          boxShadow: "0 30px 44px -24px rgba(29,32,38,0.5)",
          fontFamily: FONTE,
          opacity: Math.min(1, aviso * 1.5),
          transform: `scale(${0.7 + aviso * 0.3})`,
          transformOrigin: "0% 100%",
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 76,
            height: 76,
            borderRadius: 99,
            background: COR.brandTint,
            fontSize: 38,
          }}
        >
          🔔
        </span>
        <span style={{ lineHeight: 1.2 }}>
          <span style={{ display: "block", fontWeight: 800, fontSize: 36, color: COR.ink }}>Pedido novo no painel</span>
          <span style={{ display: "block", fontWeight: 600, fontSize: 28, color: COR.muted }}>Pix pago · comanda impressa</span>
        </span>
      </div>

      {/* a comanda saindo */}
      <div
        style={{
          position: "absolute",
          top: 1010,
          right: 70,
          width: 430,
          padding: "30px 30px 40px",
          background: "#fffdf8",
          boxShadow: "0 40px 50px -26px rgba(29,32,38,0.5)",
          fontFamily: '"JetBrains Mono", Consolas, monospace',
          fontSize: 25,
          lineHeight: 1.5,
          color: "#1d2026",
          transform: "rotate(3deg)",
          opacity: saiu > 0 ? 1 : 0,
          minHeight: 60,
        }}
      >
        {COMANDA.slice(0, saiu).map(([a, b], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontWeight: i === 0 || a === "TOTAL" ? 700 : 400 }}>
            <span>{a}</span>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ─── 5. a frase inteira ───────────────────────────────────────────────

const Frase: React.FC = () => (
  <AbsoluteFill style={{ padding: "0 84px", justifyContent: "center" }}>
    <Titulo texto="Pedidos chegando prontos." em={0.15} tamanho={138} centro={false} passo={0.11} />
    <div style={{ marginTop: 18 }}>
      <Titulo texto="Sem você digitar nada." em={0.75} tamanho={138} laranja={0} centro={false} passo={0.11} />
    </div>
  </AbsoluteFill>
);

// ─── 6. a marca e o convite ───────────────────────────────────────────

const PROMESSAS = ["Cardápio montado por nós", "Mensalidade fixa", "Suporte no WhatsApp"];

const Marca: React.FC = () => {
  const { mola } = useTempo();
  const logo = mola(0.15, 120, 14);
  const botao = mola(1.25, 150, 14);
  return (
    <AbsoluteFill style={{ alignItems: "center", padding: "300px 84px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 26,
          opacity: Math.min(1, logo * 1.5),
          transform: `scale(${0.8 + logo * 0.2})`,
        }}
      >
        <Img src={staticFile("logo-menufacil.svg")} style={{ height: 130 }} />
        <span style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 104, letterSpacing: "-0.03em", color: COR.ink }}>
          Menu<span style={{ color: COR.brand }}>Fácil</span>
        </span>
      </div>

      <div style={{ marginTop: 70 }}>
        <Titulo texto="Quer ver funcionando com o seu cardápio?" em={0.45} tamanho={84} laranja={3} />
      </div>

      <div style={{ marginTop: 70, display: "flex", flexDirection: "column", gap: 22, alignItems: "flex-start" }}>
        {PROMESSAS.map((p, i) => {
          const m = mola(0.9 + i * 0.14);
          return (
            <div
              key={p}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                fontFamily: FONTE,
                fontWeight: 800,
                fontSize: 40,
                color: COR.ink,
                opacity: m,
                transform: `translateX(${(1 - m) * -30}px)`,
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 48,
                  height: 48,
                  borderRadius: 99,
                  background: COR.brand,
                  color: "#fff",
                  fontSize: 28,
                }}
              >
                ✓
              </span>
              {p}
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 90,
          padding: "34px 60px",
          borderRadius: 36,
          background: COR.brand,
          color: COR.brandInk,
          fontFamily: FONTE,
          fontWeight: 800,
          fontSize: 46,
          boxShadow: "0 30px 50px -22px rgba(249,104,11,0.75)",
          opacity: Math.min(1, botao * 1.5),
          transform: `scale(${0.85 + botao * 0.15})`,
        }}
      >
        menufacildelivery.com.br
      </div>

      {/* a Lia fecha o vídeo em pé, no pé do quadro */}
      <Img
        src={staticFile("lia-recorte.webp")}
        style={{
          position: "absolute",
          bottom: -40,
          left: 380,
          width: 320,
          opacity: Math.min(1, mola(0.6, 90, 17) * 1.4),
          transform: `translateY(${(1 - mola(0.6, 90, 17)) * 160}px)`,
          filter: "drop-shadow(0 24px 24px rgba(29,32,38,0.22))",
        }}
      />
    </AbsoluteFill>
  );
};

// ─── os sons ──────────────────────────────────────────────────────────

// Poucos e curtos, como ele pediu no outro comercial: mensagem chegando,
// mensagem saindo e o sino do pedido. Nada comprido de fundo. Cada som
// espera um instante para tocar com o objeto já na tela, e não antes.
const ESPERA = 0.12;
// Com a voz por cima, os sons descem para pouco mais da metade.
const SOB_A_VOZ = 0.55;

/** quanto a frase espera, em segundos de verdade, depois de a cena abrir */
const FOLEGO = 0.55;
const VOZ: (keyof typeof CENA)[] = ["dor", "recebe", "link", "conversa", "cozinha", "frase", "marca"];

const SONS: { em: number; som: string; vol: number }[] = [
  ...[0, 1, 2, 3].map((i) => ({ em: CENA.dor[0] + 0.55 + i * 0.42, som: "chega", vol: 0.3 })),
  ...BOAS.map((f) => ({ em: CENA.recebe[0] + f.em, som: f.de === "cliente" ? "chega" : "sai", vol: 0.28 })),
  ...FALAS.map((f) => ({ em: CENA.conversa[0] + f.em, som: f.de === "cliente" ? "chega" : "sai", vol: 0.28 })),
  { em: CENA.cozinha[0] + 1.05, som: "sino", vol: 0.3 },
  { em: CENA.marca[0] + 1.25, som: "toque", vol: 0.3 },
];

export const Chamada: React.FC = () => (
  <AbsoluteFill style={{ background: COR.surface }}>
    <Fundo />
    <Cena de={CENA.dor}>
      <Dor />
    </Cena>
    <Cena de={CENA.recebe}>
      <Recebe />
    </Cena>
    <Cena de={CENA.link}>
      <Link />
    </Cena>
    <Cena de={CENA.conversa}>
      <Conversa />
    </Cena>
    <Cena de={CENA.cozinha}>
      <Cozinha />
    </Cena>
    <Cena de={CENA.frase}>
      <Frase />
    </Cena>
    <Cena de={CENA.marca}>
      <Marca />
    </Cena>
    {SONS.map((s, i) => (
      <Sequence key={i} from={seg(s.em * CALMA + ESPERA)} layout="none">
        <Audio src={staticFile(`sons/${s.som}.wav`)} volume={s.vol * SOB_A_VOZ} />
      </Sequence>
    ))}
    {VOZ.map((cena, i) => (
      <Sequence key={cena} from={seg(CENA[cena][0] * CALMA + (i === 0 ? 0.35 : FOLEGO))} layout="none">
        <Audio src={staticFile(`voz-chamada/${i + 1}.wav`)} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

export const QUADROS_DA_CHAMADA = Math.round(DURACAO_CHAMADA * FPS);
