import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

import { GROTESCA, Lamina, Ponto, SERIFA, Tem, Titulo, Topo } from "./CarrosselComissao";
import { Telefone, ZAP } from "./Comercial";
import { COR } from "./marca";

/**
 * O terceiro carrossel: o restaurante que vende pelo WhatsApp.
 *
 * O da comissão (`CarrosselComissao.tsx`) fala de um problema que não
 * existe onde ele vende. Em Presidente Figueiredo não há aplicativo de
 * delivery: o restaurante atende pelo próprio WhatsApp, e é com essa
 * conversa que o Menu Fácil concorre -- "manda o cardápio", "quanto é a
 * entrega", "aceita Pix", respondidos um por um com a chapa ligada.
 *
 * **Nenhum número é inventado.** Não há "você perde X pedidos por
 * noite": não temos essa medida. As lâminas descrevem a cena, que o
 * dono reconhece porque vive, e deixam a conta para ele.
 *
 * **O WhatsApp não é o vilão.** A cidade inteira pede por ali, e pedir
 * para o restaurante largar seria pedir para perder cliente. A quinta
 * lâmina diz isso com todas as letras: o canal continua, o que acaba é
 * digitar a mesma resposta quarenta vezes.
 *
 * A moldura, a fonte e os pontos numerados vêm do carrossel da
 * comissão, que foi o jeito que ele aprovou.
 */

// ─── a conversa desenhada ─────────────────────────────────────────────

const Fala: React.FC<{ de: "cliente" | "casa"; hora: string; children: React.ReactNode }> = ({
  de,
  hora,
  children,
}) => {
  const cliente = de === "cliente";
  return (
    <div
      style={{
        alignSelf: cliente ? "flex-start" : "flex-end",
        maxWidth: 640,
        padding: "16px 22px 10px",
        borderRadius: cliente ? "26px 26px 26px 6px" : "26px 26px 6px 26px",
        background: cliente ? ZAP.dela : ZAP.dele,
        color: ZAP.tinta,
        fontSize: 36,
        fontWeight: 500,
        lineHeight: 1.24,
        boxShadow: "0 1px 1px rgba(0,0,0,0.12)",
      }}
    >
      {children}
      <div style={{ fontSize: 20, color: ZAP.cinza, textAlign: "right", marginTop: 2 }}>{hora}</div>
    </div>
  );
};

/** onde isto vale: a cidade, no alto da capa e no convite */
const Cidade: React.FC<{ claro?: boolean }> = ({ claro }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 22px 10px 16px",
      borderRadius: 999,
      background: claro ? "rgba(255,255,255,0.18)" : COR.surface,
      border: claro ? "1.5px solid rgba(255,255,255,0.5)" : `1.5px solid ${COR.line}`,
      fontSize: 28,
      fontWeight: 700,
      color: claro ? "#fff" : COR.ink,
    }}
  >
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke={claro ? "#fff" : COR.brand}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.900 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
    Presidente Figueiredo · AM
  </div>
);

// ─── 1: a pergunta ────────────────────────────────────────────────────

export const Whats1: React.FC = () => (
  <Lamina n={1}>
    <div style={{ position: "absolute", top: 180, left: 70, right: 70 }}>
      <Cidade />
      <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: -2.8, lineHeight: 1.02, marginTop: 36 }}>
        Seu restaurante
        <br />
        vende pelo
      </div>
      <div
        style={{
          fontSize: 172,
          fontWeight: 800,
          letterSpacing: -9,
          lineHeight: 1,
          color: COR.brand,
          marginLeft: -8,
        }}
      >
        WhatsApp?
      </div>
      <div
        style={{
          fontFamily: SERIFA,
          fontStyle: "italic",
          fontSize: 112,
          lineHeight: 1.04,
          letterSpacing: -2,
          marginTop: 18,
        }}
      >
        então você conhece
        <br />
        essa conversa.
      </div>
    </div>

    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 140,
        padding: "22px 24px",
        borderRadius: 30,
        background: ZAP.fundo,
        border: `1.5px solid ${COR.line}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Fala de="cliente" hora="19:42">
        oi, boa noite. manda o cardápio?
      </Fala>
    </div>
  </Lamina>
);

// ─── 2: a conversa de toda noite ──────────────────────────────────────

export const Whats2: React.FC = () => (
  <Lamina n={2}>
    <Titulo a="Toda noite," b="a mesma conversa." />

    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 460,
        padding: "26px 28px",
        borderRadius: 34,
        background: ZAP.fundo,
        border: `1.5px solid ${COR.line}`,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Fala de="cliente" hora="19:42">
        manda o cardápio?
      </Fala>
      <Fala de="cliente" hora="19:44">
        quanto fica a entrega no Centro?
      </Fala>
      <Fala de="cliente" hora="19:45">
        aceita Pix? qual a chave?
      </Fala>
      <Fala de="cliente" hora="20:05">
        moço??
      </Fala>
      <Fala de="cliente" hora="20:31">
        já saiu?
      </Fala>
    </div>

    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 1100,
        fontSize: 44,
        fontWeight: 700,
        letterSpacing: -1.4,
        lineHeight: 1.14,
      }}
    >
      E você respondendo uma por uma,{" "}
      <span style={{ fontFamily: SERIFA, fontStyle: "italic", fontWeight: 400, fontSize: 56, color: COR.brand }}>
        com a chapa ligada.
      </span>
    </div>
  </Lamina>
);

// ─── 3: o que se perde ────────────────────────────────────────────────

export const Whats3: React.FC = () => (
  <Lamina n={3}>
    <Titulo a="O que se perde" b="no meio da conversa." tamanho={96} />
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 520,
        display: "flex",
        flexDirection: "column",
        gap: 68,
      }}
    >
      <Ponto
        n="1"
        a="O cliente que cansou de esperar."
        b="Você demorou dez minutos para responder e ele já pediu em outro lugar."
      />
      <Ponto n="2" a="O pedido anotado errado." b="Era sem cebola, foi com. E quem paga o lanche de novo é você." />
      <Ponto
        n="3"
        a="O Pix que ninguém conferiu."
        b="O comprovante ficou perdido no meio de vinte conversas abertas."
      />
    </div>
  </Lamina>
);

// ─── 4: o link ────────────────────────────────────────────────────────

const Passo: React.FC<{ n: string; children: React.ReactNode }> = ({ n, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
    <span
      style={{
        width: 62,
        height: 62,
        borderRadius: 20,
        background: COR.ink,
        color: "#fff",
        fontSize: 34,
        fontWeight: 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {n}
    </span>
    <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1, lineHeight: 1.12 }}>{children}</span>
  </div>
);

export const Whats4: React.FC = () => (
  <Lamina n={4} semSeta>
    <Titulo a="Com o seu link," b="o cliente pede sozinho." tamanho={94} />

    <div
      style={{
        position: "absolute",
        left: 70,
        top: 520,
        width: 500,
        display: "flex",
        flexDirection: "column",
        gap: 40,
      }}
    >
      <Passo n="1">Abre o cardápio, com foto e preço</Passo>
      <Passo n="2">Escolhe o bairro e já vê a taxa de entrega</Passo>
      <Passo n="3">Paga no Pix sem pedir a chave</Passo>
      <Passo n="4">O pedido chega pronto e sai impresso</Passo>
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

// ─── 5: o WhatsApp continua ───────────────────────────────────────────

export const Whats5: React.FC = () => (
  <Lamina n={5}>
    <Titulo a="E o WhatsApp" b="continua seu." />

    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 470,
        fontSize: 36,
        fontWeight: 500,
        lineHeight: 1.26,
        color: COR.muted,
      }}
    >
      Ninguém precisa baixar aplicativo. O link vai no seu perfil e no seu status, e o cliente continua te
      chamando onde sempre chamou.
    </div>

    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 690,
        padding: "34px 36px",
        borderRadius: 34,
        background: COR.surface,
        border: `1.5px solid ${COR.line}`,
        display: "flex",
        gap: 30,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 210,
          height: 210,
          borderRadius: 210,
          padding: 6,
          background: `linear-gradient(140deg, ${COR.brand}, ${COR.brandLine})`,
          flexShrink: 0,
        }}
      >
        <Img
          src={staticFile("lia-joia.webp")}
          style={{ width: "100%", height: "100%", borderRadius: 210, objectFit: "cover", display: "block" }}
        />
      </div>
      <div>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.4, lineHeight: 1.06 }}>
          E quem chamar no WhatsApp, a Lia atende.
        </div>
        <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.28, color: COR.muted, marginTop: 10 }}>
          Ela responde, anota o pedido e manda o Pix. Quando o assunto é com você, ela te chama.
        </div>
      </div>
    </div>

    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 1010,
        display: "flex",
        flexDirection: "column",
        gap: 26,
      }}
    >
      <Tem>Você para de digitar a mesma resposta</Tem>
      <Tem>O pedido já chega certo, com endereço e taxa</Tem>
    </div>
  </Lamina>
);

// ─── 6: o convite ─────────────────────────────────────────────────────

export const Whats6: React.FC = () => (
  <AbsoluteFill
    style={{
      fontFamily: GROTESCA,
      background: `radial-gradient(90% 60% at 50% 0%, #ff8a3d, ${COR.brand} 60%)`,
      color: "#fff",
      overflow: "hidden",
    }}
  >
    <Topo n={6} claro />
    <div style={{ position: "absolute", top: 230, left: 70, right: 70 }}>
      <Cidade claro />
      <div style={{ fontSize: 128, fontWeight: 800, letterSpacing: -6, lineHeight: 0.96, marginTop: 30 }}>
        Menos
        <br />
        digitar.
      </div>
      <div
        style={{
          fontFamily: SERIFA,
          fontStyle: "italic",
          fontSize: 140,
          lineHeight: 1,
          letterSpacing: -3,
          color: COR.brandInk,
          marginTop: 10,
        }}
      >
        mais vender.
      </div>
      <div style={{ fontSize: 40, fontWeight: 500, lineHeight: 1.26, marginTop: 36, maxWidth: 900 }}>
        Feito aqui em Presidente Figueiredo, para os restaurantes daqui. A gente monta o seu cardápio junto
        com você.
      </div>
      {/* A taxa, dita com todas as letras. Ele pediu: o Menu Fácil não
          cobra por pedido, mas o pagamento online passa pelo Mercado
          Pago, que cobra a taxa dele. É assim que ele explica ao
          cliente pessoalmente, e a peça não pode prometer mais do que
          a conversa. Por isso aqui não se escreve "sem taxa". */}
      <div style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.3, marginTop: 26, maxWidth: 900, opacity: 0.92 }}>
        Mensalidade fixa, sem comissão nossa por pedido. No pagamento online, a taxa é a do Mercado Pago.
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
