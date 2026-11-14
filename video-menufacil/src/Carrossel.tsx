import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

import {
  Balao,
  BRANCO,
  COMANDA,
  MONO,
  OAudio,
  Pix,
  PratoParado,
  SERIFADA,
  Telefone,
  TINTA,
  VELADO,
  ZAP,
} from "./Comercial";
import { COR, FONTE } from "./marca";

/**
 * O carrossel de feed do Instagram: seis lâminas de 1080 × 1350.
 *
 * A capa é o `PostSistema`, que já existia. As outras cinco contam o
 * mesmo que o comercial, uma parte do sistema por lâmina, com as mesmas
 * peças dele -- o iPhone, as telas de verdade, a conversa da Lia, a
 * comanda. Quem viu o vídeo reconhece o carrossel, e o contrário.
 *
 * **Cada lâmina tem a mesma moldura**: a marca e a contagem no alto, o
 * título de duas vozes, uma linha de apoio e o desenho. Carrossel é lido
 * arrastando; quando a moldura não muda, o olho vai direto para o que
 * mudou.
 *
 * **Por que são composições, e não `Still`.** Os balões e a onda do
 * áudio aparecem conforme o quadro (são as peças animadas do comercial).
 * A lâmina é o quadro 300, quando tudo já assentou -- renderizar com
 * `remotion still Carrossel2 --frame=300`.
 */

export const QUADRO_DA_LAMINA = 300;
const TOTAL = 6;

const FUNDO = [
  "radial-gradient(70% 45% at 82% 72%, rgba(249,104,11,0.14), transparent 70%)",
  "radial-gradient(80% 40% at 10% 100%, rgba(230,219,202,0.85), transparent 72%)",
  COR.bg,
].join(",");

/** a moldura comum: marca, contagem, título, apoio */
const Lamina: React.FC<{
  n: number;
  a: string;
  b: string;
  apoio: string;
  children: React.ReactNode;
}> = ({ n, a, b, apoio, children }) => (
  <AbsoluteFill style={{ fontFamily: FONTE, background: FUNDO, overflow: "hidden" }}>
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
        <Img src={staticFile("logo-menufacil.svg")} style={{ width: 72 }} />
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>
          <span style={{ color: TINTA }}>Menu </span>
          <span style={{ color: COR.brand }}>Fácil</span>
        </div>
      </div>
      <div
        style={{
          padding: "8px 20px",
          borderRadius: 999,
          background: COR.surface,
          border: `1.5px solid ${COR.line}`,
          fontSize: 26,
          fontWeight: 800,
          color: VELADO,
        }}
      >
        {n}/{TOTAL}
      </div>
    </div>

    <div style={{ position: "absolute", top: 160, left: 70, right: 70 }}>
      <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: -3, lineHeight: 1.04, color: TINTA }}>
        {a}
      </div>
      <div
        style={{
          fontFamily: SERIFADA,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 88,
          lineHeight: 1.12,
          color: COR.brand,
        }}
      >
        {b}
      </div>
      <div
        style={{
          marginTop: 18,
          maxWidth: 860,
          fontSize: 34,
          fontWeight: 600,
          lineHeight: 1.3,
          color: VELADO,
        }}
      >
        {apoio}
      </div>
    </div>

    {children}
  </AbsoluteFill>
);

/** um argumento com o sinal laranja, como os da capa */
const Argumento: React.FC<{ children: React.ReactNode; cheio?: boolean }> = ({ children, cheio }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 26px 16px 18px",
      borderRadius: 999,
      background: cheio ? COR.brand : COR.surface,
      border: cheio ? "none" : `1.5px solid ${COR.line}`,
      boxShadow: cheio ? "0 18px 40px -14px rgba(249,104,11,0.65)" : "none",
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: -0.4,
      color: cheio ? BRANCO : TINTA,
      whiteSpace: "nowrap",
    }}
  >
    <span
      style={{
        width: 36,
        height: 36,
        borderRadius: 36,
        background: cheio ? BRANCO : COR.brand,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={cheio ? COR.brand : "#fff"}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
    {children}
  </div>
);

// ─── 2: o cardápio ────────────────────────────────────────────────────

export const Lamina2: React.FC = () => (
  <Lamina
    n={2}
    a="O seu cardápio."
    b="no seu link."
    apoio="O cliente escolhe, pede e paga direto para você. O que você vende é seu."
  >
    <div style={{ position: "absolute", left: 318, top: 610, transform: "scale(0.82)", transformOrigin: "0 0" }}>
      <Telefone rx={3} ry={0} status="clara">
        <Img
          src={staticFile("telas/tela-cardapio-papaleguas.jpg")}
          style={{ width: 520, height: 1068, objectFit: "cover", objectPosition: "top", display: "block" }}
        />
      </Telefone>
    </div>
    <PratoParado foto="pap-picanha.webp" nome="Picanha" preco="R$ 38,00" x={70} y={700} gira={-6} />
    <PratoParado foto="pap-pizza.webp" nome="Pizza 1 sabor" preco="R$ 22,00" x={90} y={1010} gira={5} />
    <PratoParado foto="pap-parmegiana.webp" nome="Parmegiana" preco="R$ 40,00" x={800} y={760} gira={6} />
    <PratoParado foto="pap-contra-file.webp" nome="Contra filé" preco="R$ 34,00" x={790} y={1060} gira={-5} />
  </Lamina>
);

// ─── 3: a Lia ─────────────────────────────────────────────────────────

export const Lamina3: React.FC = () => (
  <Lamina
    n={3}
    a="A Lia atende"
    b="o WhatsApp por você."
    apoio="Ela responde na hora, a qualquer hora, e o pedido já chega fechado."
  >
    <div
      style={{
        position: "absolute",
        left: 70,
        top: 590,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 18,
      }}
    >
      <Argumento>Anota o pedido</Argumento>
      <Argumento>Entende áudio</Argumento>
      <Argumento>Avisa quando sai</Argumento>
      <Argumento cheio>Manda o Pix</Argumento>
    </div>

    <div style={{ position: "absolute", left: 540, top: 545, transform: "scale(0.84)", transformOrigin: "0 0" }}>
      <Telefone rx={3} ry={-8}>
        <div style={{ position: "absolute", inset: 0, background: ZAP.fundo, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "70px 22px 16px",
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
          <div style={{ flex: 1, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 11 }}>
            <Balao de="cliente" atrasa={0} hora="20:41">
              Boa noite! Quero uma picanha e um refri 2L
            </Balao>
            <Balao de="lia" atrasa={0} hora="20:41">
              Boa noite, Marina! Anotado. É entrega ou retirada?
            </Balao>
            <Balao de="cliente" atrasa={0} hora="20:42">
              <OAudio atrasa={0} />
            </Balao>
            <Balao de="lia" atrasa={0} hora="20:42">
              Retirada, combinado! Deu R$ 53,00. Segue o Pix:
            </Balao>
            <Balao de="lia" atrasa={0} hora="20:42">
              <Pix />
            </Balao>
          </div>
        </div>
      </Telefone>
    </div>

    <div
      style={{
        position: "absolute",
        left: 262,
        top: 1000,
        width: 250,
        height: 250,
        borderRadius: 250,
        padding: 7,
        background: `linear-gradient(140deg, ${COR.brand}, ${COR.brandLine})`,
        boxShadow: "0 30px 50px -20px rgba(29,32,38,0.5)",
      }}
    >
      <Img
        src={staticFile("lia-joia.webp")}
        style={{ width: "100%", height: "100%", borderRadius: 250, objectFit: "cover", display: "block" }}
      />
    </div>
  </Lamina>
);

// ─── 4: o painel e a comanda ──────────────────────────────────────────

export const Lamina4: React.FC = () => {
  const L = 900;
  const A = (L * 556) / 800;
  const k = L / 800;
  return (
    <Lamina
      n={4}
      a="O pedido chega pronto."
      b="e sai impresso."
      apoio="No painel do restaurante e na impressora da cozinha, sem ninguém digitar nada."
    >
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 570,
          width: L,
          borderRadius: 26,
          overflow: "hidden",
          background: "#1b1e24",
          boxShadow: "0 60px 90px -34px rgba(29,32,38,0.5), 0 0 0 1.5px rgba(29,32,38,0.12)",
        }}
      >
        <div style={{ height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 20px" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 14, height: 14, borderRadius: 14, background: c }} />
          ))}
        </div>
        <div style={{ position: "relative", width: L, height: A }}>
          <Img src={staticFile("telas/tela-pedidos.jpg")} style={{ width: L, height: A, display: "block" }} />
          <span
            style={{
              position: "absolute",
              left: 70 * k,
              top: 194 * k,
              width: 714 * k,
              height: 46 * k,
              borderRadius: 10 * k,
              boxShadow: "0 0 0 5px rgba(249,104,11,0.8), 0 0 44px rgba(249,104,11,0.55)",
            }}
          />
        </div>
      </div>

      {/* a comanda, já impressa, deitada de leve sobre o painel */}
      <div
        style={{
          position: "absolute",
          right: 60,
          top: 800,
          width: 400,
          padding: "22px 26px 30px",
          background: "#fbfaf6",
          border: `1.5px solid ${COR.line}`,
          boxShadow: "0 40px 60px -22px rgba(29,32,38,0.55)",
          fontFamily: MONO,
          color: "#1c1c1c",
          transform: "rotate(4deg)",
        }}
      >
        {COMANDA.map(([x, y], i) => {
          const forte = x === "PEDIDO #1" || x === "TOTAL";
          return (
            <div
              key={i}
              style={{
                height: 34,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                fontSize: forte ? 24 : 20,
                fontWeight: forte ? 800 : 600,
              }}
            >
              <span>{x}</span>
              <span>{y}</span>
            </div>
          );
        })}
      </div>
    </Lamina>
  );
};

// ─── 5: o atendente de verdade ────────────────────────────────────────

export const Lamina5: React.FC = () => (
  <Lamina
    n={5}
    a="Pediu uma pessoa?"
    b="a Lia te chama."
    apoio="Quando o assunto é com você, o aviso sobe no painel e no seu celular."
  >
    <div
      style={{
        position: "absolute",
        left: 135,
        top: 590,
        width: 500,
        padding: "20px 18px",
        borderRadius: 28,
        background: ZAP.fundo,
        border: `1.5px solid ${COR.line}`,
        boxShadow: "0 30px 50px -28px rgba(29,32,38,0.4)",
        display: "flex",
        flexDirection: "column",
        gap: 11,
        transform: "scale(1.62)",
        transformOrigin: "0 0",
      }}
    >
      <Balao de="cliente" atrasa={0} hora="20:47">
        Dá pra trocar a macaxeira por batata frita?
      </Balao>
      <Balao de="lia" atrasa={0} hora="20:47">
        Vou chamar uma pessoa do restaurante pra ver isso com você. Só um instante!
      </Balao>
    </div>

    {/* o aviso do painel, no tamanho de quem lê arrastando */}
    <div
      style={{
        position: "absolute",
        left: 50,
        right: 50,
        top: 1105,
        padding: "30px 32px",
        borderRadius: 34,
        background: COR.surface,
        border: `2.5px solid ${COR.brandLine}`,
        boxShadow: "0 50px 80px -24px rgba(29,32,38,0.5)",
        display: "flex",
        alignItems: "center",
        gap: 20,
      }}
    >
      <span
        style={{
          width: 80,
          height: 80,
          borderRadius: 80,
          background: COR.brandTint,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke={COR.brand}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
          <path d="M21 16a2 2 0 0 1-2 2h-1v-6h3zM3 16a2 2 0 0 0 2 2h1v-6H3z" />
          <path d="M21 16v2a4 4 0 0 1-4 4h-5" />
        </svg>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: TINTA, letterSpacing: -0.8, whiteSpace: "nowrap" }}>
          Marina quer falar com você
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, color: VELADO, whiteSpace: "nowrap" }}>
          Quer trocar a macaxeira por batata frita
        </div>
      </div>
      <span
        style={{
          padding: "18px 30px",
          borderRadius: 18,
          background: COR.brand,
          color: BRANCO,
          fontSize: 30,
          fontWeight: 800,
          boxShadow: "0 14px 30px -12px rgba(249,104,11,0.8)",
        }}
      >
        Responder
      </span>
    </div>
  </Lamina>
);

// ─── 6: o convite ─────────────────────────────────────────────────────

/**
 * A última lâmina é a única laranja: é o mesmo gesto da virada do
 * comercial, e quem chegou até aqui arrastando precisa ver na hora que
 * esta é a que pede alguma coisa.
 */
export const Lamina6: React.FC = () => (
  <AbsoluteFill
    style={{
      fontFamily: FONTE,
      background: `radial-gradient(90% 60% at 50% 0%, #ff8a3d, ${COR.brand} 60%)`,
      alignItems: "center",
      justifyContent: "center",
      padding: 80,
      textAlign: "center",
    }}
  >
    <Img
      src={staticFile("logo-menufacil.svg")}
      style={{ width: 260, filter: "brightness(0) invert(1)", marginBottom: 46 }}
    />
    <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: -3.4, lineHeight: 1.04, color: BRANCO }}>
      Quer ver funcionando
    </div>
    <div
      style={{
        fontFamily: SERIFADA,
        fontStyle: "italic",
        fontWeight: 500,
        fontSize: 96,
        lineHeight: 1.14,
        color: COR.brandInk,
      }}
    >
      com o seu cardápio?
    </div>
    <div style={{ marginTop: 34, fontSize: 38, fontWeight: 600, lineHeight: 1.3, color: "rgba(255,255,255,0.92)" }}>
      A gente monta o cardápio junto com você.
      <br />
      Delivery, salão e balcão, sem comissão por pedido.
    </div>
    <div
      style={{
        marginTop: 56,
        padding: "26px 52px",
        borderRadius: 999,
        background: BRANCO,
        color: COR.brandPress,
        fontSize: 42,
        fontWeight: 800,
        letterSpacing: -0.6,
        boxShadow: "0 30px 60px -20px rgba(26,13,3,0.5)",
      }}
    >
      Chama a gente no link da bio
    </div>
    <div style={{ marginTop: 40, fontSize: 34, fontWeight: 700, color: BRANCO }}>
      menufacildelivery.com.br
    </div>
  </AbsoluteFill>
);
