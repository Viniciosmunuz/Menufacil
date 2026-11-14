import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

import { GROTESCA, Lamina, Tem, Topo } from "./CarrosselComissao";
import { Telefone, ZAP } from "./Comercial";
import { COR } from "./marca";

/**
 * O terceiro carrossel: o restaurante que vende pelo WhatsApp.
 *
 * O da comissão (`CarrosselComissao.tsx`) fala de aplicativo de
 * delivery, que não existe onde ele vende. Lá o restaurante atende pelo
 * próprio WhatsApp, e o assunto deste é o trabalho de responder um por
 * um -- "manda o cardápio", "quanto é a entrega", "aceita Pix".
 *
 * **O WhatsApp não é concorrente nem vilão.** Foi ele quem pôs nesses
 * termos, e a capa é a frase dele: "o WhatsApp não foi feito pra
 * vender". O canal continua (a quinta lâmina diz isso); o que acaba é
 * digitar a mesma resposta a noite inteira.
 *
 * **A cidade não aparece.** A primeira versão trazia "Presidente
 * Figueiredo" na capa e no fecho, e ele mandou tirar: vende lá, mas não
 * quer que o sistema pareça ser só de lá.
 *
 * **Uma fonte só.** A primeira versão alternava a Bricolage pesada com
 * uma serifada itálica, e ele gostou da primeira e não da segunda. Aqui
 * tudo é Bricolage: a segunda linha do título se destaca pela cor, e
 * não por trocar de letra.
 *
 * **Nenhum número é medido.** O "37" da capa é cena, como no site: uma
 * tela de conversas lotada. Nenhuma lâmina afirma quantos pedidos se
 * perdem, porque não temos essa conta.
 */

// ─── as peças deste carrossel ─────────────────────────────────────────

/** título em duas linhas, na mesma letra: a segunda muda só de cor */
const Titulo: React.FC<{ a: React.ReactNode; b: React.ReactNode; tamanho?: number }> = ({
  a,
  b,
  tamanho = 104,
}) => (
  <div
    style={{
      position: "absolute",
      top: 180,
      left: 70,
      right: 70,
      fontSize: tamanho,
      fontWeight: 800,
      letterSpacing: -tamanho * 0.045,
      lineHeight: 1,
    }}
  >
    <div>{a}</div>
    <div style={{ color: COR.brand }}>{b}</div>
  </div>
);

const Fala: React.FC<{ hora: string; children: React.ReactNode }> = ({ hora, children }) => (
  <div
    style={{
      alignSelf: "flex-start",
      maxWidth: 800,
      padding: "16px 22px 10px",
      borderRadius: "26px 26px 26px 6px",
      background: ZAP.dela,
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

// ─── 1: a capa ────────────────────────────────────────────────────────

const CONVERSAS = [
  { quem: "Marina", fala: "manda o cardápio?", hora: "20:41", n: 3, cor: "#f59e0b" },
  { quem: "Rafael", fala: "quanto fica a entrega?", hora: "20:40", n: 2, cor: "#3b82f6" },
  { quem: "Júlia", fala: "moço??", hora: "20:38", n: 5, cor: "#ec4899" },
  { quem: "Pedro", fala: "aceita Pix? qual a chave?", hora: "20:36", n: 1, cor: "#10b981" },
  { quem: "Ana", fala: "já saiu?", hora: "20:31", n: 4, cor: "#8b5cf6" },
  { quem: "Carlos", fala: "cadê meu pedido", hora: "20:27", n: 6, cor: "#ef4444" },
  { quem: "Bia", fala: "oi, tá aberto?", hora: "20:25", n: 1, cor: "#14b8a6" },
  { quem: "Léo", fala: "tem promoção hoje?", hora: "20:19", n: 2, cor: "#f97316" },
  { quem: "Dona Cida", fala: "boa noite, quero pedir", hora: "20:12", n: 3, cor: "#6366f1" },
];

/** a tela de conversas do WhatsApp do restaurante, lotada */
const ListaDeConversas: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: "#fff", fontFamily: GROTESCA }}>
    <div style={{ padding: "78px 26px 14px" }}>
      <div style={{ fontSize: 40, fontWeight: 800, color: ZAP.tinta, letterSpacing: -1 }}>Conversas</div>
      <div
        style={{
          marginTop: 14,
          height: 48,
          borderRadius: 24,
          background: "#f0f2f5",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          fontSize: 21,
          color: ZAP.cinza,
        }}
      >
        Pesquisar
      </div>
    </div>
    {CONVERSAS.map((c) => (
      <div key={c.quem} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 26px" }}>
        <span
          style={{
            width: 64,
            height: 64,
            borderRadius: 64,
            background: c.cor,
            color: "#fff",
            fontSize: 28,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {c.quem[0]}
        </span>
        <div style={{ flex: 1, minWidth: 0, borderBottom: "1px solid #eef0f2", paddingBottom: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 25, fontWeight: 700, color: ZAP.tinta }}>{c.quem}</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: "#1fa855" }}>{c.hora}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
            <span style={{ fontSize: 21, color: ZAP.cinza, whiteSpace: "nowrap" }}>{c.fala}</span>
            <span
              style={{
                minWidth: 30,
                height: 30,
                borderRadius: 30,
                padding: "0 8px",
                background: "#25d366",
                color: "#fff",
                fontSize: 18,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {c.n}
            </span>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const Whats1: React.FC = () => (
  <Lamina n={1} semSeta>
    <div
      style={{
        position: "absolute",
        top: 170,
        left: 70,
        right: 70,
        fontSize: 122,
        fontWeight: 800,
        letterSpacing: -5.6,
        lineHeight: 0.98,
      }}
    >
      O WhatsApp
      <br />
      não foi feito
      <br />
      <span style={{ color: COR.brand }}>pra vender.</span>
    </div>
    <div
      style={{
        position: "absolute",
        top: 555,
        left: 70,
        right: 70,
        fontSize: 38,
        fontWeight: 500,
        lineHeight: 1.24,
        color: COR.muted,
      }}
    >
      E quem recebe pedido por ele sente isso toda noite.
    </div>

    <div style={{ position: "absolute", left: 250, top: 690 }}>
      <Telefone rx={6} ry={-9}>
        <ListaDeConversas />
      </Telefone>
    </div>

    {/* o selo: é ele que o olho pega primeiro quando a capa passa */}
    <div
      style={{
        position: "absolute",
        left: 620,
        top: 660,
        padding: "20px 30px",
        borderRadius: 26,
        background: COR.ink,
        color: "#fff",
        boxShadow: "0 30px 50px -20px rgba(29,32,38,0.6)",
        transform: "rotate(4deg)",
      }}
    >
      <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -3, lineHeight: 1, color: "#25d366" }}>37</div>
      <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>
        conversas
        <br />
        sem resposta
      </div>
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
        top: 450,
        padding: "26px 28px",
        borderRadius: 34,
        background: ZAP.fundo,
        border: `1.5px solid ${COR.line}`,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Fala hora="19:42">manda o cardápio?</Fala>
      <Fala hora="19:44">quanto fica a entrega pro meu bairro?</Fala>
      <Fala hora="19:45">aceita Pix? qual a chave?</Fala>
      <Fala hora="20:05">moço??</Fala>
      <Fala hora="20:31">já saiu?</Fala>
    </div>

    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 1085,
        fontSize: 46,
        fontWeight: 700,
        letterSpacing: -1.6,
        lineHeight: 1.12,
      }}
    >
      E você respondendo uma por uma, <span style={{ color: COR.brand }}>com a chapa ligada.</span>
    </div>
  </Lamina>
);

// ─── 3: o que isso custa ──────────────────────────────────────────────

const Ponto: React.FC<{ n: string; a: string; b: string }> = ({ n, a, b }) => (
  <div style={{ display: "flex", gap: 30, alignItems: "flex-start" }}>
    <span
      style={{
        fontSize: 40,
        fontWeight: 800,
        letterSpacing: -1,
        color: COR.brand,
        lineHeight: 1.2,
        width: 62,
        flexShrink: 0,
        borderTop: `4px solid ${COR.brand}`,
        paddingTop: 6,
      }}
    >
      {n}
    </span>
    <div>
      <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1.6, lineHeight: 1.06 }}>{a}</div>
      <div style={{ fontSize: 32, fontWeight: 500, lineHeight: 1.28, color: COR.muted, marginTop: 8 }}>{b}</div>
    </div>
  </div>
);

export const Whats3: React.FC = () => (
  <Lamina n={3}>
    <Titulo a="Responder um por um" b="custa caro." tamanho={84} />
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: 470,
        display: "flex",
        flexDirection: "column",
        gap: 70,
      }}
    >
      <Ponto
        n="01"
        a="O cliente cansa de esperar."
        b="Você demorou dez minutos para responder e ele já pediu em outro lugar."
      />
      <Ponto n="02" a="O pedido sai errado." b="Era sem cebola, foi com. E quem paga o lanche de novo é você." />
      <Ponto
        n="03"
        a="O Pix fica sem conferir."
        b="O comprovante se perde no meio de vinte conversas abertas."
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
    <Titulo a="Com o seu link," b="o cliente pede sozinho." tamanho={90} />

    <div
      style={{
        position: "absolute",
        left: 70,
        top: 500,
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

    <div style={{ position: "absolute", left: 610, top: 480, transform: "scale(0.8)", transformOrigin: "0 0" }}>
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
        top: 440,
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
        top: 670,
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
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.6, lineHeight: 1.06 }}>
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
        top: 1000,
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
    <div style={{ position: "absolute", top: 250, left: 70, right: 70 }}>
      <div style={{ fontSize: 156, fontWeight: 800, letterSpacing: -7.4, lineHeight: 0.94 }}>
        Menos
        <br />
        digitar.
        <br />
        <span style={{ color: COR.brandInk }}>
          Mais
          <br />
          vender.
        </span>
      </div>
      <div style={{ fontSize: 40, fontWeight: 500, lineHeight: 1.26, marginTop: 40, maxWidth: 900 }}>
        A gente monta o seu cardápio junto com você, e ele fica pronto para receber pedido.
      </div>
      {/* A taxa, dita com todas as letras. Ele pediu: o Menu Fácil não
          cobra por pedido, mas o pagamento online passa pelo Mercado
          Pago, que cobra a taxa dele. É assim que ele explica ao
          cliente pessoalmente, e a peça não pode prometer mais do que
          a conversa. Por isso aqui não se escreve "sem taxa". */}
      <div style={{ fontSize: 27, fontWeight: 500, lineHeight: 1.3, marginTop: 22, maxWidth: 900, opacity: 0.92 }}>
        Mensalidade fixa, sem comissão nossa por pedido. No pagamento online, a taxa é a do Mercado Pago.
      </div>
    </div>

    <div style={{ position: "absolute", left: 70, right: 70, bottom: 80 }}>
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
      <div style={{ fontSize: 32, fontWeight: 600, marginTop: 20 }}>menufacildelivery.com.br</div>
    </div>
  </AbsoluteFill>
);
