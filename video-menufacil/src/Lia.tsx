import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COR, FONTE, seg } from "./marca";
import { Aviso, Bolha, Digitando, Fala, Forte, JanelaWhats, RostoDaLia, Selo } from "./lia-pecas";

/**
 * O comercial da Lia, a atendente do MenuFácil.
 *
 * Vertical, para Reels e story. O assunto é uma conversa, então o vídeo é
 * a conversa acontecendo -- bolha por bolha, no ritmo de quem digita, e
 * dentro de uma janela de WhatsApp, que é onde ela acontece de verdade.
 * Sem nada de técnico: ninguém que vende lanche quer saber como ela
 * funciona por dentro.
 *
 * **Os tempos saem da narração, não o contrário.** O arquivo
 * `public/narracao.mp3` é a locução pronta, e cada cena começa onde a
 * frase dela começa -- medido pelas pausas do próprio áudio, não no olho.
 * Se a narração for regravada, os números abaixo precisam ser medidos de
 * novo; não dá para apertar a fala para caber num vídeo já montado.
 */

export const DURACAO_LIA = 48.5;

/**
 * Onde cada cena entra, em segundos, pelo áudio.
 *
 * Cada uma abre uns três décimos antes da primeira palavra do bloco: a
 * imagem precisa de um instante para assentar antes da voz chegar, senão
 * o corte parece atrasado mesmo estando certo.
 */
const CENA = {
  novidade: [0, 4.9],
  problema: [4.9, 16.8],
  chegada: [16.8, 25.0],
  atende: [25.0, 33.1],
  pedido: [33.1, 39.6],
  respeito: [39.6, 45.0],
  marca: [45.0, 48.5],
} as const;

/** o fundo escuro da abertura: o celular na bancada, na hora do rush */
const Noite: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: COR.night, fontFamily: FONTE }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(70% 40% at 50% 20%, rgba(255,255,255,0.07), transparent 70%)`,
      }}
    />
    {children}
  </AbsoluteFill>
);

/** o fundo claro do resto: o papel do sistema */
const Dia: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: COR.bg, fontFamily: FONTE }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(60% 34% at 50% 84%, ${COR.brandTint}, transparent 72%)`,
      }}
    />
    {children}
  </AbsoluteFill>
);

// ─── 0. é lançamento ─────────────────────────────────────────────────
/**
 * "Novidade no Menu Fácil. Agora o seu restaurante tem atendente própria."
 *
 * Quem assiste já conhece o Menu Fácil; sem este cartão o vídeo parece
 * propaganda do produto inteiro, e o dono que já é cliente passa direto.
 * A novidade é o gancho, o problema que vem depois é a razão.
 */
const Novidade: React.FC = () => (
  <Dia>
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", gap: 58, padding: "0 90px" }}
    >
      <Selo atrasa={0.1}>NOVIDADE</Selo>
      <div style={{ textAlign: "center" }}>
        <Fala atrasa={1.9} tamanho={76}>
          O Menu Fácil agora tem
          <br />
          <Forte>atendente própria.</Forte>
        </Fala>
      </div>
    </AbsoluteFill>
  </Dia>
);

// ─── 1. o problema ───────────────────────────────────────────────────
/**
 * O problema não é o restaurante vazio de madrugada -- restaurante nenhum
 * do nicho dele abre às 3h, e vender um problema que o dono não tem é o
 * jeito mais rápido de perder a atenção dele nos primeiros segundos.
 *
 * O problema é a hora do rush: movimento demais, e ninguém que possa
 * largar o salão para digitar. As mensagens chegam justo quando não dá.
 */
const Problema: React.FC = () => (
  <Noite>
    <AbsoluteFill style={{ padding: "180px 80px", justifyContent: "center", gap: 34 }}>
      <Fala atrasa={0.2} sai={11.2} tamanho={64} cor="rgba(255,255,255,0.96)">
        Sexta, 19h40.
        <br />
        Salão lotado.
      </Fala>
      {/* os avisos chegam em cima de "o WhatsApp não para de tocar" */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 24 }}>
        <Aviso texto="Boa noite, tem X-Burger?" hora="19:41" atrasa={3.1} sai={11.2} />
        <Aviso texto="Quanto é a entrega pro Centro?" hora="19:46" atrasa={3.9} sai={11.2} />
        <Aviso texto="Oi? Alguém aí?" hora="19:53" atrasa={4.7} sai={11.2} />
      </div>
      <Fala atrasa={5.5} sai={11.2} tamanho={46} cor="rgba(255,255,255,0.6)">
        Ninguém pode largar o salão pra responder.
        <br />
        Cada uma dessas vira pedido do concorrente.
      </Fala>
    </AbsoluteFill>
  </Noite>
);

// ─── 2. ela chega ────────────────────────────────────────────────────
const Chegada: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // a noite vira dia junto com ela: a troca de fundo é a virada do vídeo
  const clareia = interpolate(frame, [0.1 * fps, 0.9 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: COR.night, fontFamily: FONTE }}>
      <AbsoluteFill style={{ background: COR.bg, opacity: clareia }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(60% 34% at 50% 50%, ${COR.brandTint}, transparent 72%)`,
          opacity: clareia,
        }}
      />
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", gap: 54, padding: "0 90px" }}
      >
        <RostoDaLia tamanho={300} atrasa={0.1} />
        {/* as duas linhas são frases separadas na narração, e por isso
            entram separadas: juntas, uma delas apareceria antes de ser dita */}
        <div style={{ textAlign: "center" }}>
          <Fala atrasa={0.4} tamanho={86}>
            Essa é a <Forte>Lia</Forte>.
          </Fala>
          <div style={{ height: 26 }} />
          <Fala atrasa={3.6} tamanho={50} cor={COR.muted}>
            A atendente do seu restaurante.
          </Fala>
          <div style={{ height: 10 }} />
          <Fala atrasa={5.8} tamanho={50} cor={COR.muted}>
            Ela responde enquanto você atende.
          </Fala>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── 3. ela atende ───────────────────────────────────────────────────
/**
 * A conversa dentro da janela do WhatsApp.
 *
 * A janela entra inteira antes da primeira mensagem: o espectador precisa
 * saber onde está antes de começar a ler. E a tela é a do cliente -- o
 * verde à direita é dele, como em qualquer conversa no telefone dele.
 */
const Atende: React.FC = () => (
  <Dia>
    <AbsoluteFill style={{ padding: "110px 50px 100px", gap: 34, justifyContent: "center" }}>
      <JanelaWhats atrasa={0}>
        <Bolha de="cliente" atrasa={0.5} hora="19:57">
          Tem X-Burger ainda?
        </Bolha>
        <Digitando atrasa={0.9} some={1.4} />
        <Bolha de="lia" atrasa={1.4} hora="19:57">
          Temos sim! X-Burger sai R$ 18,00 🍔
        </Bolha>

        <Bolha de="cliente" atrasa={2.6} hora="19:58">
          Quanto é a entrega pro Centro?
        </Bolha>
        <Digitando atrasa={3.0} some={3.5} />
        <Bolha de="lia" atrasa={3.5} hora="19:58">
          Pro Centro é R$ 3,00, chega em uns 40 min
        </Bolha>

        <Bolha de="cliente" atrasa={4.6} hora="19:59">
          Até que horas vocês ficam?
        </Bolha>
        <Digitando atrasa={5.0} some={5.4} />
        <Bolha de="lia" atrasa={5.4} hora="19:59">
          Hoje até 23:30 😊
        </Bolha>
      </JanelaWhats>

      <Fala atrasa={6.2} tamanho={52}>
        Seu cardápio, seus preços, seus horários.
        <br />
        <Forte>Na hora.</Forte>
      </Fala>
    </AbsoluteFill>
  </Dia>
);

// ─── 4. o pedido ─────────────────────────────────────────────────────
/**
 * O cartão do pedido fica FORA da janela do WhatsApp, e isso é o recado
 * da cena: em cima, o que o cliente vê; embaixo, o que aparece sozinho na
 * tela do dono. Pôr os dois no mesmo lugar desfaria a ponte que a cena
 * existe para mostrar.
 */
const PedidoNaTela: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = interpolate(frame, [4.3 * fps, 4.9 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 14,
        opacity: entra,
        translate: `0px ${(1 - entra) * 50}px`,
        scale: String(0.92 + entra * 0.08),
      }}
    >
      {/* A seta e o rótulo são o que separa as duas telas.
          Sem eles o cartão verde encosta na janela verde do WhatsApp e os
          dois viram a mesma coisa -- justo na cena que existe para mostrar
          que são lugares diferentes. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: "0.14em",
          color: COR.brand,
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 20 4.5 10h5V3h5v7h5z" />
        </svg>
        NO SEU PAINEL
      </div>
      <div
        style={{
          padding: "30px 40px",
          borderRadius: 38,
          background: COR.bg,
          border: `4px solid ${COR.success}`,
          boxShadow: "0 30px 70px -36px rgba(22,163,74,0.75)",
        }}
      >
        <div
          style={{ fontSize: 32, fontWeight: 900, color: COR.successInk, letterSpacing: "0.04em" }}
        >
          PEDIDO NOVO · FEITO PELA LIA
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, color: COR.ink, marginTop: 10 }}>
          2× X-Burger · 1× Coca lata
        </div>
        <div style={{ fontSize: 42, fontWeight: 900, color: COR.successInk, marginTop: 6 }}>
          R$ 42,00 · Centro
        </div>
      </div>
    </div>
  );
};

const Pedido: React.FC = () => (
  <Dia>
    <AbsoluteFill style={{ padding: "110px 50px 100px", gap: 30, justifyContent: "center" }}>
      <Fala atrasa={0.2} tamanho={50}>
        E quem não quer mexer em link nenhum?
      </Fala>

      <JanelaWhats atrasa={0.7}>
        <Bolha de="cliente" atrasa={1.0} hora="20:03">
          quero 2 x-burger e uma coca
        </Bolha>
        <Digitando atrasa={1.5} some={1.9} />
        <Bolha de="lia" atrasa={1.9} hora="20:03">
          Anotei! 2× X-Burger e 1× Coca lata.
          <br />
          Total: <b>R$ 42,00</b>. Confirma?
        </Bolha>
        <Bolha de="cliente" atrasa={3.2} hora="20:04">
          pode 👍
        </Bolha>
      </JanelaWhats>

      <PedidoNaTela />
    </AbsoluteFill>
  </Dia>
);

// ─── 5. ela sabe a hora de parar ─────────────────────────────────────
const Respeito: React.FC = () => (
  <Dia>
    <AbsoluteFill
      style={{ padding: "0 90px", alignItems: "center", justifyContent: "center", gap: 44 }}
    >
      <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
        <div
          style={{
            padding: "26px 44px",
            borderRadius: 999,
            background: COR.surface2,
            border: `3px solid ${COR.lineForte}`,
            fontSize: 44,
            fontWeight: 900,
            color: COR.muted,
          }}
        >
          ● Fechado
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <Fala atrasa={0.2} tamanho={58}>
          Fora do horário, ela não fala.
        </Fala>
        <div style={{ height: 20 }} />
        <Fala atrasa={3.4} tamanho={58} cor={COR.muted}>
          Se você assume a conversa,
          <br />
          <span style={{ color: COR.ink }}>ela sai da frente.</span>
        </Fala>
      </div>
    </AbsoluteFill>
  </Dia>
);

// ─── 6. a marca ──────────────────────────────────────────────────────
const Marca: React.FC = () => (
  <Dia>
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", gap: 46, padding: "0 90px" }}
    >
      <RostoDaLia tamanho={190} atrasa={0} />
      <Img src={staticFile("logo-menufacil.svg")} style={{ width: 560, opacity: 1 }} />
      <div style={{ textAlign: "center" }}>
        <Fala atrasa={0.2} tamanho={62}>
          <Forte>Lia.</Forte> Só no Menu Fácil.
        </Fala>
        <div style={{ height: 18 }} />
        <Fala atrasa={1.0} tamanho={40} cor={COR.muted}>
          menufacildelivery.com.br
        </Fala>
      </div>
    </AbsoluteFill>
  </Dia>
);

export const Lia: React.FC = () => (
  <AbsoluteFill style={{ background: COR.bg }}>
    {/* A locução cobre o vídeo inteiro e manda nos tempos das cenas. */}
    <Audio src={staticFile("narracao.mp3")} />
    {(
      [
        [CENA.novidade, Novidade],
        [CENA.problema, Problema],
        [CENA.chegada, Chegada],
        [CENA.atende, Atende],
        [CENA.pedido, Pedido],
        [CENA.respeito, Respeito],
        [CENA.marca, Marca],
      ] as const
    ).map(([[de, ate], Cena], i) => (
      <Sequence key={i} from={seg(de)} durationInFrames={seg(ate - de)}>
        <Cena />
      </Sequence>
    ))}
  </AbsoluteFill>
);
