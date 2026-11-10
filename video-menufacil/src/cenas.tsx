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
import { COR } from "./marca";
import { Apoio, Celular, Etapa, Palco, Sobe, Titulo } from "./pecas";

const SUAVE = Easing.bezier(0.16, 1, 0.3, 1);

/* ── 0 · abertura ─────────────────────────────────────────────
   A marca sozinha, e a promessa em uma linha. */
export const Abertura: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Palco>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Img
          src={staticFile("logo-menufacil.svg")}
          style={{
            width: 560,
            // o logo entra por cortina, da esquerda para a direita, no
            // sentido das linhas de velocidade do próprio desenho
            clipPath: `inset(0 ${interpolate(frame, [0, 1.5 * fps], [100, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: SUAVE,
            })}% 0 0)`,
          }}
        />
        <Sobe atrasa={1.3} style={{ marginTop: 56 }}>
          <div
            style={{
              fontSize: 118,
              fontWeight: 800,
              letterSpacing: "-0.045em",
              color: COR.ink,
              textAlign: "center",
            }}
          >
            Menu<span style={{ color: COR.brand, fontWeight: 400 }}>Fácil</span>
          </div>
        </Sobe>
        <Sobe atrasa={2.0} style={{ marginTop: 28 }}>
          <div style={{ fontSize: 38, color: COR.muted, textAlign: "center" }}>
            O sistema que organiza o seu delivery
          </div>
        </Sobe>
      </AbsoluteFill>
    </Palco>
  );
};

/* ── 1 · o cardápio ──────────────────────────────────────────── */
export const Cardapio: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const endereco = "menufacildelivery.com.br/papaleguas";
  const letras = Math.round(
    interpolate(frame, [1.1 * fps, 3.0 * fps], [0, endereco.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <Palco>
      <Etapa n="1" texto="Cardápio digital" />
      <Titulo linhas={["Seu cardápio.", "Seu link."]} />
      <Sobe atrasa={0.9} style={{ marginTop: 30 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "18px 28px",
            borderRadius: 999,
            border: `1px solid ${COR.brandLine}`,
            background: COR.brandTint,
            color: COR.brandPress,
            fontSize: 28,
            fontWeight: 700,
            fontFamily: "ui-monospace, Menlo, monospace",
            whiteSpace: "nowrap",
          }}
        >
          {endereco.slice(0, letras)}
          <i
            style={{
              width: 2,
              height: 28,
              background: COR.brandPress,
              opacity: Math.floor(frame / 8) % 2,
            }}
          />
        </span>
      </Sobe>
      <AbsoluteFill style={{ top: 660, alignItems: "center" }}>
        <Celular arquivo="telas/tela-cardapio.jpg" escorre={420} />
      </AbsoluteFill>
    </Palco>
  );
};

/* ── 2 · o pedido no painel ─────────────────────────────────── */
export const Painel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Palco>
      <Etapa n="2" texto="Painel de pedidos" />
      <Titulo linhas={["O pedido cai", "na hora."]} />
      <Apoio>Com aviso sonoro no balcão. Nada se perde no WhatsApp.</Apoio>

      <AbsoluteFill style={{ top: 700, alignItems: "center" }}>
        {/* o aviso é filho do cartão, e não da tela: preso à tela ele
            flutuava solto, longe da lista que deveria apontar */}
        <div
          style={{
            position: "relative",
            width: 912,
            opacity: interpolate(frame, [0.4 * fps, 1.0 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: SUAVE,
            }),
            translate: interpolate(frame, [0.4 * fps, 1.2 * fps], ["0px 60px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: SUAVE,
            }),
          }}
        >
          <div
            style={{
              borderRadius: 30,
              overflow: "hidden",
              border: `1px solid ${COR.line}`,
              background: COR.bg,
              boxShadow: "0 50px 100px -45px rgba(29,32,38,0.4)",
            }}
          >
            <Img src={staticFile("telas/tela-pedidos.jpg")} style={{ display: "block", width: "100%" }} />
          </div>

          {/* na captura o aviso é pequeno, e é justamente ele que esta
              cena quer mostrar: aqui ele é redesenhado, grande, no canto
              de baixo do cartão */}
          <div
            style={{
              position: "absolute",
              right: -18,
              bottom: -34,
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "26px 34px",
              borderRadius: 24,
              background: COR.brand,
              color: COR.brandInk,
              fontSize: 32,
              fontWeight: 800,
              whiteSpace: "nowrap",
              boxShadow: "0 24px 60px -18px rgba(249,104,11,0.65)",
              opacity: interpolate(frame, [2.0 * fps, 2.5 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: interpolate(frame, [2.0 * fps, 2.6 * fps], [0.86, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.34, 1.56, 0.64, 1),
                output: "perceptual-scale",
              }),
            }}
          >
            Pedido novo
            <span style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>#1 · R$ 53,00</span>
          </div>
        </div>
      </AbsoluteFill>
    </Palco>
  );
};

/* ── 3 · a comanda ───────────────────────────────────────────── */
export const Comanda: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const linha = (a: string, b: string, forte = false) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: forte ? 30 : 25,
        fontWeight: forte ? 700 : 400,
        margin: "12px 0",
      }}
    >
      <span>{a}</span>
      <span>{b}</span>
    </div>
  );

  return (
    <Palco>
      <Etapa n="3" texto="Impressão automática" />
      <Titulo linhas={["A comanda", "sai sozinha."]} />
      <Apoio>Itens, observações, endereço e o pagamento. Ninguém anota nada.</Apoio>

      <AbsoluteFill style={{ top: 700, alignItems: "center" }}>
        {/* a impressora */}
        <div
          style={{
            width: 640,
            height: 150,
            borderRadius: "30px 30px 16px 16px",
            background: `linear-gradient(160deg, ${COR.surface3}, ${COR.lineForte})`,
            boxShadow: "0 30px 60px -30px rgba(29,32,38,0.5)",
            position: "relative",
            zIndex: 3,
          }}
        >
          <span
            style={{
              position: "absolute",
              right: 36,
              top: 34,
              width: 14,
              height: 14,
              borderRadius: 999,
              background: COR.success,
              opacity: Math.floor(frame / 6) % 2 ? 1 : 0.35,
            }}
          />
          <span
            style={{
              position: "absolute",
              left: 54,
              right: 54,
              bottom: 22,
              height: 11,
              borderRadius: 6,
              background: COR.ink,
            }}
          />
        </div>

        {/* o papel: nasce de dentro da máquina, e é a altura da janela que
            cresce -- não o papel que desce por baixo de uma máscara */}
        <div
          style={{
            width: 520,
            overflow: "hidden",
            height: interpolate(frame, [1.0 * fps, 4.6 * fps], [0, 640], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.inOut(Easing.ease),
            }),
          }}
        >
          <div
            style={{
              background: COR.surface,
              color: COR.ink,
              padding: "36px 40px 46px",
              fontFamily: "ui-monospace, Menlo, monospace",
              boxShadow: "0 30px 60px -30px rgba(29,32,38,0.45)",
            }}
          >
            <div style={{ textAlign: "center", fontSize: 30, fontWeight: 700 }}>PAPALÉGUAS</div>
            <div style={{ textAlign: "center", fontSize: 20, color: COR.muted, marginBottom: 22 }}>
              PEDIDO #1 · 19:33 · ENTREGA
            </div>
            <div style={{ borderTop: `2px dashed ${COR.lineForte}`, margin: "18px 0" }} />
            {linha("1x Contra filé", "34,00")}
            <div style={{ fontSize: 20, color: COR.muted, marginLeft: 26 }}>sem cebola</div>
            {linha("1x Suco de lata", "8,00")}
            {linha("1x Farofa", "9,00")}
            <div style={{ borderTop: `2px dashed ${COR.lineForte}`, margin: "18px 0" }} />
            {linha("Entrega", "3,00")}
            {linha("TOTAL", "54,00", true)}
            <div style={{ borderTop: `2px dashed ${COR.lineForte}`, margin: "18px 0" }} />
            <div style={{ fontSize: 20, color: COR.muted, textAlign: "center" }}>
              R. das Flores, 128 · Centro
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </Palco>
  );
};

/* ── 4 · o entregador ────────────────────────────────────────── */
export const Entregador: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // a tela troca quando ele aceita a corrida
  const virou = frame > 3.4 * fps;

  return (
    <Palco escuro>
      <div style={{ color: COR.surface }}>
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
            4
          </span>
          <span
            style={{
              fontSize: 27,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: COR.faint,
            }}
          >
            Entrega
          </span>
        </Sobe>
        <Sobe atrasa={0.25}>
          <h1
            style={{
              margin: "26px 0 0",
              fontSize: 92,
              lineHeight: 1.0,
              letterSpacing: "-0.035em",
              fontWeight: 800,
              color: COR.bg,
            }}
          >
            O entregador
            <br />
            <span style={{ color: COR.brand }}>recebe no celular.</span>
          </h1>
        </Sobe>
        <Sobe atrasa={0.5}>
          <p style={{ margin: "24px 0 0", fontSize: 34, lineHeight: 1.4, color: COR.faint, maxWidth: 820 }}>
            Ele aceita, pega o endereço e leva. Você acompanha do balcão.
          </p>
        </Sobe>
      </div>

      <AbsoluteFill style={{ top: 700, alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <div style={{ opacity: virou ? 0 : 1 }}>
            <Celular arquivo="telas/tela-entregador-chamada.jpg" escuro />
          </div>
          <AbsoluteFill style={{ opacity: virou ? 1 : 0 }}>
            <Celular arquivo="telas/tela-entregador-home.jpg" atrasa={0} escuro />
          </AbsoluteFill>
        </div>
      </AbsoluteFill>
    </Palco>
  );
};

/* ── 5 · zero comissão ───────────────────────────────────────── */
export const SemComissao: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const linha = (rotulo: string, valor: string, cor: string, atrasa: number) => (
    <Sobe atrasa={atrasa} distancia={18}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontSize: 32,
          fontFamily: "ui-monospace, Menlo, monospace",
          color: COR.muted,
          margin: "18px 0",
        }}
      >
        <span>{rotulo}</span>
        <b style={{ color: cor, fontSize: 36 }}>{valor}</b>
      </div>
    </Sobe>
  );

  return (
    <Palco>
      <Etapa n="5" texto="O lucro é seu" />
      <Titulo linhas={["Zero comissão", "por pedido."]} />

      <AbsoluteFill style={{ top: 620, alignItems: "center" }}>
        <div
          style={{
            fontSize: 400,
            lineHeight: 0.85,
            fontWeight: 900,
            letterSpacing: "-0.06em",
            color: COR.brand,
            scale: interpolate(frame, [0.5 * fps, 1.4 * fps], [0.72, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.34, 1.4, 0.64, 1),
              output: "perceptual-scale",
            }),
            opacity: interpolate(frame, [0.5 * fps, 1.0 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          0%
        </div>

        <div
          style={{
            marginTop: 54,
            width: 760,
            padding: "36px 44px",
            borderRadius: 28,
            background: COR.surface,
            border: `1px solid ${COR.line}`,
          }}
        >
          {linha("Pedido #1", "R$ 54,00", COR.ink, 1.5)}
          {linha("Comissão do app", "R$ 0,00", COR.ink, 1.8)}
          <div style={{ borderTop: `1px dashed ${COR.lineForte}`, margin: "22px 0" }} />
          {linha("Você recebe", "R$ 54,00", COR.brand, 2.1)}
        </div>
      </AbsoluteFill>
    </Palco>
  );
};

/* ── 6 · o preço ─────────────────────────────────────────────── */
export const Planos: React.FC = () => (
  <Palco>
    <Etapa n="6" texto="Planos" />
    <Titulo linhas={["A partir de", "R$ 100 por mês."]} />
    <Apoio>Sem taxa de adesão e sem fidelidade. A gente monta o seu cardápio junto com você.</Apoio>

    <AbsoluteFill style={{ top: 780, alignItems: "center", gap: 26 }}>
      {[
        { nome: "Essencial", preco: "R$ 100", linha: "cardápio digital e pedidos" },
        { nome: "100% Delivery", preco: "R$ 180", linha: "com entregadores e impressão" },
        { nome: "Completo", preco: "R$ 280", linha: "delivery e salão no mesmo sistema" },
      ].map((p, i) => (
        <Sobe key={p.nome} atrasa={0.6 + i * 0.22} distancia={26}>
          <div
            style={{
              width: 830,
              display: "flex",
              alignItems: "center",
              gap: 24,
              padding: "30px 36px",
              borderRadius: 24,
              background: i === 1 ? COR.brandTint : COR.surface,
              border: `1px solid ${i === 1 ? COR.brandLine : COR.line}`,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 38, fontWeight: 800, color: COR.ink }}>{p.nome}</div>
              <div style={{ fontSize: 26, color: COR.muted, marginTop: 6 }}>{p.linha}</div>
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, color: i === 1 ? COR.brandPress : COR.ink }}>
              {p.preco}
            </div>
          </div>
        </Sobe>
      ))}
    </AbsoluteFill>
  </Palco>
);

/* ── 7 · o fecho ─────────────────────────────────────────────── */
export const Fecho: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Palco>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Img
          src={staticFile("logo-menufacil.svg")}
          style={{
            width: 460,
            clipPath: `inset(0 ${interpolate(frame, [0, 1.2 * fps], [100, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: SUAVE,
            })}% 0 0)`,
          }}
        />
        <Sobe atrasa={1.0} style={{ marginTop: 48 }}>
          <div
            style={{
              fontSize: 104,
              fontWeight: 800,
              letterSpacing: "-0.045em",
              color: COR.ink,
              textAlign: "center",
            }}
          >
            Menu<span style={{ color: COR.brand, fontWeight: 400 }}>Fácil</span>
          </div>
        </Sobe>
        <Sobe atrasa={1.5} style={{ marginTop: 44 }}>
          <div
            style={{
              padding: "22px 36px",
              borderRadius: 999,
              border: `1px solid ${COR.brandLine}`,
              background: COR.brandTint,
              color: COR.brandPress,
              fontSize: 30,
              fontWeight: 700,
              fontFamily: "ui-monospace, Menlo, monospace",
            }}
          >
            menufacildelivery.com.br
          </div>
        </Sobe>
        <Sobe atrasa={2.0} style={{ marginTop: 26 }}>
          <div style={{ fontSize: 34, color: COR.muted }}>(92) 99913-0838</div>
        </Sobe>
      </AbsoluteFill>
    </Palco>
  );
};
