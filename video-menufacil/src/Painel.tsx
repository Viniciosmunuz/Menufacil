import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COR, FONTE } from "./marca";
import { Barra, Cartao, Chamada, Dinheiro, LinhaPedido, PalcoEscuro, Rotulo } from "./painel-pecas";

const SUAVE = Easing.bezier(0.16, 1, 0.3, 1);

/* ── 1 · o dia do restaurante ─────────────────────────────────
   Abre pelo resultado, não pelo produto: o número é o que faz o dono
   parar de rolar a tela. */
const Ganhos: React.FC = () => (
  <PalcoEscuro foto="pizza-especial.webp">
    <AbsoluteFill style={{ padding: "280px 76px", justifyContent: "flex-start" }}>
      <Cartao atrasa={0.2}>
        <Rotulo texto="Vendas de hoje" apoio="23 pedidos · aberto há 5h" />
        <div style={{ marginTop: 26 }}>
          <Dinheiro ate={1247.5} atrasa={0.6} duracao={1.8} tamanho={118} />
        </div>
        <Barra atrasa={0.8} />
      </Cartao>

      <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 18 }}>
        <LinhaPedido
          titulo="Marina Souza"
          detalhe="Contra filé · entrega"
          valor="+ R$ 53,00"
          quando="agora"
          atrasa={2.3}
        />
        <LinhaPedido
          titulo="Rafael Teixeira"
          detalhe="Parmegiana · retirada"
          valor="+ R$ 34,00"
          quando="2 min"
          atrasa={2.7}
        />
        <LinhaPedido
          titulo="Júlia Mendes"
          detalhe="Pizza especial · entrega"
          valor="+ R$ 62,00"
          quando="6 min"
          atrasa={3.1}
        />
      </div>
    </AbsoluteFill>
  </PalcoEscuro>
);

/* ── 2 · de onde vêm os pedidos ─────────────────────────────── */
const Cardapio: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const endereco = "menufacildelivery.com.br/papaleguas";
  const letras = Math.round(
    interpolate(frame, [1.2 * fps, 3.2 * fps], [0, endereco.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <PalcoEscuro foto="file-de-carne.webp">
      <Chamada linhas={["Vêm do seu", "cardápio digital."]} />
      <AbsoluteFill style={{ top: 430, padding: "0 76px" }}>
        <Cartao atrasa={0.7}>
          <Rotulo texto="Link do restaurante" />
          <div
            style={{
              marginTop: 24,
              fontSize: 34,
              fontWeight: 700,
              color: COR.brand,
              fontFamily: "ui-monospace, Menlo, monospace",
            }}
          >
            {endereco.slice(0, letras)}
            <span style={{ opacity: Math.floor(frame / 8) % 2 }}>|</span>
          </div>
        </Cartao>

        {/* o celular com o cardápio de verdade, entrando por baixo */}
        <div
          style={{
            marginTop: 46,
            alignSelf: "center",
            width: 470,
            height: 700,
            borderRadius: 48,
            padding: 11,
            background: "linear-gradient(160deg, #3a332d, #11100f)",
            boxShadow: "0 50px 90px -40px rgba(0,0,0,0.95)",
            overflow: "hidden",
            opacity: interpolate(frame, [1.4 * fps, 2.1 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: SUAVE,
            }),
            translate: interpolate(frame, [1.4 * fps, 2.4 * fps], ["0px 90px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: SUAVE,
            }),
          }}
        >
          <div style={{ width: "100%", height: "100%", borderRadius: 38, overflow: "hidden" }}>
            <Img
              src={staticFile("telas/tela-cardapio.jpg")}
              style={{
                width: "100%",
                translate: interpolate(frame, [2.4 * fps, 6.5 * fps], ["0px 0px", "0px -330px"], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.linear,
                }),
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </PalcoEscuro>
  );
};

/* ── 3 · a comanda ──────────────────────────────────────────── */
const Comanda: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <PalcoEscuro foto="parmegiana-frango.webp">
      <Chamada linhas={["A comanda sai", "sozinha na cozinha."]} />
      <AbsoluteFill style={{ top: 470, padding: "0 76px", alignItems: "center" }}>
        <Cartao atrasa={0.5} style={{ width: "100%" }}>
          <Rotulo texto="Impressão automática" apoio="pedido #24" cor={COR.success} />
          <div
            style={{
              marginTop: 26,
              padding: "28px 32px",
              borderRadius: 18,
              background: COR.surface,
              color: COR.ink,
              fontFamily: "ui-monospace, Menlo, monospace",
              // o papel cresce de dentro do cartão
              height: interpolate(frame, [1.2 * fps, 4.4 * fps], [0, 430], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.inOut(Easing.ease),
              }),
              overflow: "hidden",
            }}
          >
            <div style={{ textAlign: "center", fontSize: 28, fontWeight: 700 }}>PAPALÉGUAS</div>
            <div style={{ textAlign: "center", fontSize: 20, color: COR.muted, marginBottom: 18 }}>
              PEDIDO #24 · 19:33 · ENTREGA
            </div>
            <div style={{ borderTop: `2px dashed ${COR.lineForte}`, margin: "16px 0" }} />
            {[
              ["1x Contra filé", "34,00"],
              ["1x Suco de lata", "8,00"],
              ["1x Farofa", "9,00"],
              ["Entrega", "3,00"],
            ].map(([a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 24, margin: "10px 0" }}>
                <span>{a}</span>
                <span>{b}</span>
              </div>
            ))}
            <div style={{ borderTop: `2px dashed ${COR.lineForte}`, margin: "16px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 700 }}>
              <span>TOTAL</span>
              <span>54,00</span>
            </div>
            <div style={{ fontSize: 20, color: COR.muted, textAlign: "center", marginTop: 16 }}>
              R. das Flores, 128 · Centro
            </div>
          </div>
        </Cartao>
      </AbsoluteFill>
    </PalcoEscuro>
  );
};

/* ── 4 · o entregador ───────────────────────────────────────── */
const Entregador: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <PalcoEscuro foto="carne-de-sol.webp">
      <Chamada linhas={["O entregador recebe", "no celular dele."]} />
      <AbsoluteFill style={{ top: 470, padding: "0 76px" }}>
        <Cartao atrasa={0.5} destaque>
          <Rotulo texto="Nova corrida" apoio="2,4 km" />
          <div style={{ marginTop: 22, fontSize: 40, fontWeight: 800, color: COR.bg }}>
            Pedro Lima
          </div>
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
            R. das Flores, 128 · Centro
          </div>
          <div
            style={{
              marginTop: 26,
              padding: "22px 0",
              borderRadius: 18,
              background: COR.brand,
              color: COR.brandInk,
              fontSize: 30,
              fontWeight: 800,
              textAlign: "center",
              scale: interpolate(frame, [2.4 * fps, 2.8 * fps, 3.2 * fps], [1, 0.96, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                output: "perceptual-scale",
              }),
            }}
          >
            Aceitar entrega
          </div>
        </Cartao>

        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          <LinhaPedido
            titulo="Carlos aceitou"
            detalhe="saiu do restaurante"
            valor="19:41"
            quando=""
            atrasa={3.4}
            cor={COR.brand}
          />
          <LinhaPedido
            titulo="Entregue"
            detalhe="Pedro Lima recebeu"
            valor="19:58"
            quando=""
            atrasa={4.0}
          />
        </div>
      </AbsoluteFill>
    </PalcoEscuro>
  );
};

/* ── 5 · zero comissão ──────────────────────────────────────── */
const SemComissao: React.FC = () => (
  <PalcoEscuro foto="tambaqui.webp">
    <Chamada linhas={["E no fim do dia,", "o dinheiro é todo seu."]} />
    <AbsoluteFill style={{ top: 480, padding: "0 76px" }}>
      <Cartao atrasa={0.5}>
        <Rotulo texto="Vendas do dia" />
        <div style={{ marginTop: 20 }}>
          <Dinheiro ate={1247.5} atrasa={0.8} duracao={1.2} tamanho={84} />
        </div>
      </Cartao>

      <Cartao atrasa={1.5} style={{ marginTop: 20 }}>
        <Rotulo texto="Comissão do aplicativo" cor={COR.danger} />
        <div style={{ marginTop: 20, fontSize: 84, fontWeight: 800, color: COR.bg, letterSpacing: "-0.04em" }}>
          R$ 0,00
        </div>
      </Cartao>

      <Cartao atrasa={2.4} destaque style={{ marginTop: 20 }}>
        <Rotulo texto="Você recebe" />
        <div style={{ marginTop: 20 }}>
          <Dinheiro ate={1247.5} atrasa={2.6} duracao={1.0} tamanho={96} cor={COR.brand} />
        </div>
      </Cartao>
    </AbsoluteFill>
  </PalcoEscuro>
);

/* ── 6 · o fecho ────────────────────────────────────────────── */
const Fecho: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <PalcoEscuro foto="picanha.webp">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 76px" }}>
        <Img
          src={staticFile("logo-menufacil.svg")}
          style={{
            width: 420,
            filter: "drop-shadow(0 0 50px rgba(249,104,11,0.5))",
            clipPath: `inset(0 ${interpolate(frame, [0.2 * fps, 1.4 * fps], [100, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: SUAVE,
            })}% 0 0)`,
          }}
        />
        <div
          style={{
            marginTop: 44,
            fontSize: 104,
            fontWeight: 800,
            letterSpacing: "-0.045em",
            color: COR.bg,
            opacity: interpolate(frame, [1.2 * fps, 1.8 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Menu<span style={{ color: COR.brand, fontWeight: 400 }}>Fácil</span>
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 34,
            color: "rgba(255,255,255,0.66)",
            textAlign: "center",
            opacity: interpolate(frame, [1.7 * fps, 2.3 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          A partir de R$ 100 por mês, sem fidelidade
        </div>
        <Cartao atrasa={2.4} destaque style={{ marginTop: 44, padding: "24px 38px" }}>
          <span
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: COR.brand,
              fontFamily: "ui-monospace, Menlo, monospace",
            }}
          >
            menufacildelivery.com.br
          </span>
        </Cartao>
      </AbsoluteFill>
    </PalcoEscuro>
  );
};

/* ── a montagem ─────────────────────────────────────────────── */
export const CENAS_PAINEL = [
  { id: "ganhos", dura: 7.0, Cena: Ganhos },
  { id: "cardapio", dura: 7.5, Cena: Cardapio },
  { id: "comanda", dura: 7.0, Cena: Comanda },
  { id: "entregador", dura: 7.5, Cena: Entregador },
  { id: "semComissao", dura: 7.5, Cena: SemComissao },
  { id: "fecho", dura: 6.5, Cena: Fecho },
] as const;

export const DURACAO_PAINEL = CENAS_PAINEL.reduce((t, c) => t + c.dura, 0);

export const PainelDoDia: React.FC = () => {
  const { fps } = useVideoConfig();
  let inicio = 0;

  return (
    <AbsoluteFill style={{ background: "#07090c", fontFamily: FONTE }}>
      {CENAS_PAINEL.map(({ id, dura, Cena }) => {
        const from = Math.round(inicio * fps);
        inicio += dura;
        return (
          <Sequence key={id} from={from} durationInFrames={Math.round(dura * fps)} name={id}>
            <Cena />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
