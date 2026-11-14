import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadInstrument } from "@remotion/google-fonts/InstrumentSerif";

import { Telefone } from "./Comercial";
import { COR } from "./marca";

/**
 * O segundo carrossel: a conta da comissão.
 *
 * O primeiro (`Carrossel.tsx`) mostrava o sistema, parte por parte --
 * a mesma propaganda do vídeo, e ele já tinha postado o vídeo. Este é
 * outro argumento, para outra pessoa: o dono que vende pelo aplicativo
 * de delivery e nunca fez a conta de quanto deixa lá. Não mostra tela
 * nenhuma até a quinta lâmina; antes disso é número.
 *
 * **A conta é um exemplo, e está escrito que é.** R$ 10.000 vendidos no
 * mês, 20% de comissão. A taxa real muda de aplicativo para aplicativo
 * e de plano para plano, então nenhuma lâmina diz "o app cobra X": diz
 * "com 20%, dá isto", e o rodapé repete que é exemplo. O preço do Menu
 * Fácil é o publicado no site (`src/components/venda/conteudo.ts`,
 * plano Delivery) -- mudou lá, muda aqui.
 *
 * **Nenhum aplicativo é citado pelo nome**, e a última lâmina não manda
 * ninguém sair dele. É de propósito: quem vende lá não vai largar por
 * causa de um post, e o conselho honesto é usar os dois.
 *
 * **A fonte é outra.** Ele não gostava da Nunito nas peças de
 * propaganda. Aqui o texto é Bricolage Grotesque e o destaque é
 * Instrument Serif itálica. A Nunito continua sendo a fonte do sistema;
 * isto vale só para as peças de divulgação.
 */

const { fontFamily: GROTESCA } = loadBricolage("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
});
const { fontFamily: SERIFA } = loadInstrument("italic", { weights: ["400"], subsets: ["latin"] });

const TOTAL = 6;

/** os números do exemplo, num lugar só */
const EX = {
  vendas: "R$ 10.000",
  taxa: "20%",
  comissao: "R$ 2.000",
  porAno: "R$ 24.000",
  mensalidade: "R$ 120",
  sobra: "R$ 1.880",
} as const;

// ─── a moldura ────────────────────────────────────────────────────────

const Topo: React.FC<{ n: number; claro?: boolean }> = ({ n, claro }) => (
  <div
    style={{
      position: "absolute",
      top: 60,
      left: 70,
      right: 70,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Img
        src={staticFile("logo-menufacil.svg")}
        style={{ width: 70, filter: claro ? "brightness(0) invert(1)" : "none" }}
      />
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>
        <span style={{ color: claro ? "#fff" : COR.ink }}>Menu </span>
        <span style={{ color: claro ? COR.brandInk : COR.brand }}>Fácil</span>
      </div>
    </div>
    <div style={{ fontSize: 26, fontWeight: 700, color: claro ? "rgba(255,255,255,0.85)" : COR.faint }}>
      {n}/{TOTAL}
    </div>
  </div>
);

/** o pé: os pontinhos da contagem e o convite para arrastar */
const Pe: React.FC<{ n: number; semSeta?: boolean }> = ({ n, semSeta }) => (
  <div
    style={{
      position: "absolute",
      bottom: 62,
      left: 70,
      right: 70,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <div style={{ display: "flex", gap: 10 }}>
      {Array.from({ length: TOTAL }, (_, i) => (
        <span
          key={i}
          style={{
            width: i + 1 === n ? 44 : 12,
            height: 12,
            borderRadius: 12,
            background: i + 1 === n ? COR.brand : COR.surface3,
          }}
        />
      ))}
    </div>
    {semSeta ? null : <div style={{ fontSize: 28, fontWeight: 700, color: COR.muted }}>arraste →</div>}
  </div>
);

const Lamina: React.FC<{ n: number; children: React.ReactNode; semSeta?: boolean }> = ({
  n,
  children,
  semSeta,
}) => (
  <AbsoluteFill style={{ fontFamily: GROTESCA, background: COR.bg, color: COR.ink, overflow: "hidden" }}>
    <Topo n={n} />
    {children}
    <Pe n={n} semSeta={semSeta} />
  </AbsoluteFill>
);

/** o título de duas vozes, na fonte nova */
const Titulo: React.FC<{ a: React.ReactNode; b: React.ReactNode; topo?: number; tamanho?: number }> = ({
  a,
  b,
  topo = 180,
  tamanho = 104,
}) => (
  <div style={{ position: "absolute", top: topo, left: 70, right: 70 }}>
    <div style={{ fontSize: tamanho, fontWeight: 800, letterSpacing: -4.2, lineHeight: 0.98 }}>{a}</div>
    <div
      style={{
        fontFamily: SERIFA,
        fontStyle: "italic",
        fontSize: tamanho * 1.12,
        lineHeight: 1.04,
        letterSpacing: -1.5,
        color: COR.brand,
        marginTop: 6,
      }}
    >
      {b}
    </div>
  </div>
);

const Rodape: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: 70,
      right: 70,
      bottom: 128,
      fontSize: 24,
      fontWeight: 500,
      lineHeight: 1.3,
      color: COR.faint,
    }}
  >
    {children}
  </div>
);

// ─── 1: a pergunta ────────────────────────────────────────────────────

export const Comissao1: React.FC = () => (
  <Lamina n={1}>
    <div style={{ position: "absolute", top: 190, left: 70, right: 70 }}>
      <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2.6, lineHeight: 1 }}>De cada</div>
      <div
        style={{
          fontSize: 300,
          fontWeight: 800,
          letterSpacing: -15,
          lineHeight: 0.95,
          color: COR.brand,
          marginLeft: -10,
        }}
      >
        R$100
      </div>
      <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2.6, lineHeight: 1.04, marginTop: 8 }}>
        que você vende no
        <br />
        app de delivery,
      </div>
      <div
        style={{
          fontFamily: SERIFA,
          fontStyle: "italic",
          fontSize: 124,
          lineHeight: 1.02,
          letterSpacing: -2,
          marginTop: 16,
        }}
      >
        quanto fica
        <br />
        com você?
      </div>
    </div>

    {/* a nota de cem, com um pedaço já destacado */}
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 150,
        height: 92,
        borderRadius: 22,
        display: "flex",
        overflow: "hidden",
        border: `2px solid ${COR.ink}`,
      }}
    >
      <div
        style={{
          flex: 80,
          background: COR.surface,
          display: "flex",
          alignItems: "center",
          paddingLeft: 30,
          fontSize: 32,
          fontWeight: 700,
        }}
      >
        o que é seu
      </div>
      <div
        style={{
          flex: 20,
          background: `repeating-linear-gradient(135deg, ${COR.brand} 0 14px, ${COR.brandHover} 14px 28px)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 44,
          fontWeight: 800,
          color: "#fff",
          borderLeft: `2px solid ${COR.ink}`,
        }}
      >
        ?
      </div>
    </div>
  </Lamina>
);

// ─── 2: a conta ───────────────────────────────────────────────────────

const Linha: React.FC<{ a: string; b: string; forte?: boolean; cor?: string }> = ({ a, b, forte, cor }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 20,
      padding: "22px 0",
    }}
  >
    <span style={{ fontSize: forte ? 38 : 34, fontWeight: forte ? 800 : 600, color: forte ? COR.ink : COR.muted }}>
      {a}
    </span>
    <span
      style={{
        fontSize: forte ? 62 : 52,
        fontWeight: 800,
        letterSpacing: -2,
        color: cor ?? COR.ink,
        whiteSpace: "nowrap",
      }}
    >
      {b}
    </span>
  </div>
);

export const Comissao2: React.FC = () => (
  <Lamina n={2}>
    <Titulo a="A comissão come" b="o seu lucro." />

    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 500,
        padding: "22px 40px 30px",
        borderRadius: 34,
        background: COR.surface,
        border: `1.5px solid ${COR.line}`,
      }}
    >
      <Linha a="Você vendeu no mês" b={EX.vendas} />
      <div style={{ height: 1.5, background: COR.line }} />
      <Linha a={`Comissão do app (${EX.taxa})`} b={`− ${EX.comissao}`} cor={COR.danger} />
      <div style={{ height: 1.5, background: COR.line }} />
      <Linha a="Em um ano" b={`− ${EX.porAno}`} cor={COR.danger} forte />
    </div>

    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 960,
        fontSize: 50,
        fontWeight: 700,
        letterSpacing: -1.6,
        lineHeight: 1.12,
      }}
    >
      E quanto mais você vende,{" "}
      <span style={{ fontFamily: SERIFA, fontStyle: "italic", fontWeight: 400, fontSize: 60, color: COR.brand }}>
        mais você paga.
      </span>
    </div>

    <Rodape>
      Exemplo com {EX.taxa} de comissão. A taxa varia conforme o aplicativo e o plano contratado.
    </Rodape>
  </Lamina>
);

// ─── 3: o cliente ─────────────────────────────────────────────────────

const Ponto: React.FC<{ n: string; a: string; b: string }> = ({ n, a, b }) => (
  <div style={{ display: "flex", gap: 26, alignItems: "flex-start" }}>
    <span
      style={{
        fontFamily: SERIFA,
        fontStyle: "italic",
        fontSize: 96,
        lineHeight: 0.86,
        color: COR.brand,
        width: 64,
        flexShrink: 0,
      }}
    >
      {n}
    </span>
    <div>
      <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.4, lineHeight: 1.08 }}>{a}</div>
      <div style={{ fontSize: 32, fontWeight: 500, lineHeight: 1.28, color: COR.muted, marginTop: 6 }}>{b}</div>
    </div>
  </div>
);

export const Comissao3: React.FC = () => (
  <Lamina n={3}>
    <Titulo a="E o cliente" b="nem é seu." />
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 530,
        display: "flex",
        flexDirection: "column",
        gap: 72,
      }}
    >
      <Ponto n="1" a="O contato fica com o app." b="Você entrega o lanche, mas não fica com o número de quem pediu." />
      <Ponto n="2" a="O concorrente está ao lado." b="O cliente abre para pedir de você e vê outros dez restaurantes." />
      <Ponto n="3" a="Para aparecer mais, paga mais." b="Destaque e promoção saem do seu bolso, em cima da comissão." />
    </div>
  </Lamina>
);

// ─── 4: a comparação ──────────────────────────────────────────────────

const Barra: React.FC<{ rotulo: string; valor: string; largura: string; cor: string; nota: string }> = ({
  rotulo,
  valor,
  largura,
  cor,
  nota,
}) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 34, fontWeight: 700 }}>{rotulo}</span>
      <span style={{ fontSize: 60, fontWeight: 800, letterSpacing: -2, color: cor }}>{valor}</span>
    </div>
    <div style={{ height: 46, borderRadius: 14, background: COR.surface, marginTop: 10, overflow: "hidden" }}>
      <div style={{ width: largura, height: "100%", borderRadius: 14, background: cor }} />
    </div>
    <div style={{ fontSize: 26, fontWeight: 500, color: COR.muted, marginTop: 10 }}>{nota}</div>
  </div>
);

export const Comissao4: React.FC = () => (
  <Lamina n={4}>
    <Titulo a="No seu link," b="a conta muda." />

    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 500,
        display: "flex",
        flexDirection: "column",
        gap: 44,
      }}
    >
      <Barra
        rotulo={`No app, com ${EX.taxa}`}
        valor={EX.comissao}
        largura="100%"
        cor={COR.ink}
        nota="por mês, e sobe junto com as vendas"
      />
      <Barra
        rotulo="No Menu Fácil"
        valor={EX.mensalidade}
        largura="6%"
        cor={COR.brand}
        nota="por mês, fixo: vendeu R$ 10 mil ou R$ 50 mil, é o mesmo"
      />
    </div>

    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 965,
        padding: "26px 36px",
        borderRadius: 30,
        background: COR.brand,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.12 }}>
        Fica no seu caixa,
        <br />
        todo mês
      </span>
      <span style={{ fontSize: 92, fontWeight: 800, letterSpacing: -4, whiteSpace: "nowrap" }}>{EX.sobra}</span>
    </div>

    <Rodape>
      Mesmo exemplo: {EX.vendas} em vendas no mês. Plano Menu Fácil Delivery, {EX.mensalidade} por mês, sem
      comissão por pedido.
    </Rodape>
  </Lamina>
);

// ─── 5: o que você ganha de volta ─────────────────────────────────────

const Tem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
    <span
      style={{
        width: 46,
        height: 46,
        borderRadius: 46,
        background: COR.brand,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
    <span style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1, lineHeight: 1.1 }}>{children}</span>
  </div>
);

export const Comissao5: React.FC = () => (
  <Lamina n={5} semSeta>
    <Titulo a="E o cliente" b="volta pra você." />

    <div
      style={{
        position: "absolute",
        left: 70,
        top: 520,
        width: 500,
        display: "flex",
        flexDirection: "column",
        gap: 34,
      }}
    >
      <Tem>O link é do seu restaurante</Tem>
      <Tem>Só o seu cardápio na tela</Tem>
      <Tem>O cliente paga direto pra você</Tem>
      <Tem>Atendimento no seu WhatsApp</Tem>
    </div>

    <div style={{ position: "absolute", left: 610, top: 500, transform: "scale(0.8)", transformOrigin: "0 0" }}>
      <Telefone rx={3} ry={-10} status="clara">
        <Img
          src={staticFile("telas/tela-cardapio-papaleguas.jpg")}
          style={{ width: 520, height: 1068, objectFit: "cover", objectPosition: "top", display: "block" }}
        />
      </Telefone>
    </div>
  </Lamina>
);

// ─── 6: o convite ─────────────────────────────────────────────────────

export const Comissao6: React.FC = () => (
  <AbsoluteFill
    style={{
      fontFamily: GROTESCA,
      background: `radial-gradient(90% 60% at 50% 0%, #ff8a3d, ${COR.brand} 60%)`,
      color: "#fff",
      overflow: "hidden",
    }}
  >
    <Topo n={6} claro />
    <div style={{ position: "absolute", top: 250, left: 70, right: 70 }}>
      <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -4.6, lineHeight: 0.98 }}>
        Não precisa
        <br />
        sair do app.
      </div>
      <div
        style={{
          fontFamily: SERIFA,
          fontStyle: "italic",
          fontSize: 122,
          lineHeight: 1.02,
          letterSpacing: -2,
          color: COR.brandInk,
          marginTop: 14,
        }}
      >
        só parar de
        <br />
        depender dele.
      </div>
      <div style={{ fontSize: 40, fontWeight: 500, lineHeight: 1.26, marginTop: 40, maxWidth: 880 }}>
        Deixe o app trazer cliente novo. Quem já conhece o seu restaurante pede pelo seu link, sem comissão.
      </div>
    </div>

    <div style={{ position: "absolute", left: 70, right: 70, bottom: 90 }}>
      <div
        style={{
          display: "inline-block",
          padding: "26px 50px",
          borderRadius: 999,
          background: "#fff",
          color: COR.brandPress,
          fontSize: 42,
          fontWeight: 800,
          letterSpacing: -0.8,
        }}
      >
        Chama a gente no link da bio
      </div>
      <div style={{ fontSize: 32, fontWeight: 600, marginTop: 22 }}>menufacildelivery.com.br</div>
    </div>
  </AbsoluteFill>
);
