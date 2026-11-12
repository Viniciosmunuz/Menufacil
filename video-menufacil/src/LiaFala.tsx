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
import {
  Bolha,
  Destaque,
  Fundo,
  Legenda,
  Marca as MarcaDoFecho,
  Nota,
  Quadro,
  T,
  Titulo,
} from "./tutorial-pecas";

/**
 * A Lia se apresentando, na voz dela.
 *
 * É outro vídeo, não uma versão do comercial: lá um locutor fala do
 * produto, aqui é ela quem fala, em primeira pessoa.
 *
 * **Os tempos saem da narração, não o contrário.** Cada cena começa onde
 * a frase dela começa, medido pelas pausas de `public/narracao-lia.mp3`.
 * Narração nova obriga a medir de novo -- e é por isso que esta rodada
 * mexeu no desenho de todas as cenas sem tocar em um único número de
 * `CENA` nem nos atrasos de dentro delas.
 *
 * **O desenho é o do vídeo tutorial**, que é o mais novo e o que ele
 * aprovou: papel branco com grade velada, título em duas vozes (sans
 * pesada preta em cima, serifada itálica laranja embaixo, sublinhada) e
 * interface desenhada a traço fino em vez de cartão com sombra. O que
 * havia aqui antes -- cartões flutuando com sombra colorida, janela de
 * WhatsApp imitada, rótulos em caixa alta soltos no ar -- era de uma
 * geração anterior e destoava do resto do canal.
 *
 * **O que foi preservado da versão anterior**, porque funcionava: o
 * fundo e o rosto dela vivem FORA das cenas. Antes cada cena desenhava o
 * seu próprio fundo e o seu próprio cabeçalho, e a cada corte os dois
 * piscavam -- ela sumia e voltava sete vezes num vídeo em que ela é quem
 * está falando. O fundo é um só do começo ao fim, o rosto atravessa as
 * cenas do meio sem piscar, e o que troca é só o conteúdo.
 */

export const DURACAO_LIAFALA = 43.3;

/**
 * Onde cada cena entra, em segundos, pelo áudio.
 *
 * Cada uma abre uns dois décimos antes da primeira palavra do bloco: a
 * imagem precisa de um instante para assentar antes da voz chegar.
 */
const CENA = {
  oi: [0, 3.7],
  onde: [3.7, 8.6],
  sabe: [8.6, 18.0],
  pedido: [18.0, 27.3],
  limites: [27.3, 35.65],
  porque: [35.65, 40.2],
  marca: [40.2, 43.3],
} as const;

/** enquanto ela fica no alto: da segunda cena ao fim da quinta */
const ALTO = [CENA.onde[0], CENA.limites[1]] as const;

/** o tempo do fundido entre cenas, em segundos */
const FUNDIDO = 0.3;

/**
 * O envelope de cada cena: entra e sai em fundido.
 *
 * Como o fundo é um só, o fundido do conteúdo é a transição inteira --
 * sem ele os cortes ficam secos, que é o que mais denunciava que isto
 * foi montado peça por peça.
 */
const Cena: React.FC<{ children: React.ReactNode; dura: number }> = ({ children, dura }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = FUNDIDO * fps;
  const fim = dura * fps;
  const op = Math.min(
    interpolate(frame, [0, f], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(frame, [fim - f, fim], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return <AbsoluteFill style={{ opacity: op, fontFamily: FONTE }}>{children}</AbsoluteFill>;
};

// ─── o rosto dela ─────────────────────────────────────────────────────

/**
 * Ela, solta no papel -- sem moldura, sem círculo, sem caixa.
 *
 * O primeiro corte punha o retrato dentro do mesmo quadro de traço que
 * desenha as telas do vídeo, e ele pediu o contrário: ela não precisa
 * estar dentro de nada. Está certo, e por um motivo que vale guardar --
 * a arte dela já vem com fundo branco, igual ao papel do vídeo. Sem
 * moldura, o branco da arte e o branco da página viram o mesmo branco e
 * ela aparece recortada, colada na folha. Com moldura, aquele mesmo
 * branco vira um retângulo visível e ela passa a ser uma foto dentro de
 * uma caixa, que é o oposto de orgânico.
 *
 * O preço disso é que ela só funciona sobre papel: num fundo colorido o
 * branco da arte reaparece como bloco. É por isso que a cena laranja não
 * tem rosto nenhum.
 */
/**
 * O rosto do cabeçalho, trocando de expressão a cada cena.
 *
 * A folha de expressões existe para isto: ela ouve a pergunta sorrindo,
 * mostra o cardápio com a mão aberta e confirma o pedido com o polegar.
 * Um rosto parado durante quarenta segundos é um adesivo; um rosto que
 * acompanha o que está sendo dito é alguém falando.
 *
 * A troca é cruzada e lenta (meio segundo), nunca um corte: as duas
 * artes são do mesmo enquadramento, então o que o olho vê é a expressão
 * mudando, e não a imagem sendo substituída.
 */
const EXPRESSAO: { arte: string; de: number; ate: number }[] = [
  { arte: "lia-sorriso.webp", de: CENA.onde[0], ate: CENA.sabe[0] },
  { arte: "lia-mao.webp", de: CENA.sabe[0], ate: CENA.pedido[0] },
  { arte: "lia-joia.webp", de: CENA.pedido[0], ate: CENA.limites[0] },
  { arte: "lia-sorriso.webp", de: CENA.limites[0], ate: CENA.limites[1] },
];

const RostoQueMuda: React.FC<{ tamanho: number }> = ({ tamanho }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // o tempo aqui é o da Sequence do cabeçalho, que começa em ALTO[0]
  const t = frame / fps + ALTO[0];
  const CRUZA = 0.5;
  const respira = Math.sin((frame / fps) * 1.1) * 5;
  return (
    <div
      style={{
        position: "relative",
        width: tamanho,
        height: tamanho,
        flexShrink: 0,
        transform: `translateY(${respira}px)`,
      }}
    >
      {EXPRESSAO.map((e, i) => {
        const op = Math.min(
          interpolate(t, [e.de - CRUZA, e.de], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          interpolate(t, [e.ate - CRUZA, e.ate], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        );
        if (op <= 0) return null;
        return (
          <Img
            key={i}
            src={staticFile(e.arte)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              opacity: op,
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * O rosto dela no alto, fixo, atravessando as cenas do meio.
 *
 * Fica ancorado no topo em vez de entrar no fluxo de cada cena: assim
 * ele não sobe e desce conforme o conteúdo de baixo muda de tamanho. A
 * linha fina que sai do nome é o mesmo gesto do selo numerado do
 * tutorial -- é ela que amarra o cabeçalho à largura da tela.
 */
const ElaNoAlto: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dura = ALTO[1] - ALTO[0];
  const f = FUNDIDO * fps;
  const fim = dura * fps;
  const op = Math.min(
    interpolate(frame, [0, f], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(frame, [fim - f, fim], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const risco = interpolate(frame, [0.2 * fps, 0.8 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <div
        style={{
          position: "absolute",
          top: 150,
          left: 80,
          right: 80,
          display: "flex",
          alignItems: "center",
          gap: 26,
          fontFamily: FONTE,
        }}
      >
        <RostoQueMuda tamanho={150} />
        <div>
          <div style={{ fontSize: 46, fontWeight: 800, color: T.tinta, letterSpacing: -1.4 }}>
            Lia
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.marca, letterSpacing: 0.4 }}>
            atendente do Menu Fácil
          </div>
        </div>
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
    </AbsoluteFill>
  );
};

/**
 * A área de conteúdo das cenas do meio, abaixo do rosto fixo.
 *
 * O topo grande reserva a faixa do cabeçalho fixo; o resto da tela é a
 * área do conteúdo, e é nela que ele se centra. O primeiro corte usava
 * um fundo de 300 a 460px para "puxar o bloco para cima" -- o efeito era
 * o oposto, deixava um buraco de meia tela embaixo de cada cena, que é
 * exatamente o que fazia o vídeo parecer inacabado.
 */
const Meio: React.FC<{ children: React.ReactNode; gap?: number; baixo?: number }> = ({
  children,
  gap = 36,
  baixo = 180,
}) => (
  <AbsoluteFill
    style={{ padding: `330px 80px ${baixo}px`, gap, justifyContent: "center", alignItems: "center" }}
  >
    {children}
  </AbsoluteFill>
);

/**
 * O rótulo de seção: caixa alta, cinza, com a linha atravessando.
 *
 * É o selo numerado do tutorial sem o número -- aqui não há passo 1, 2,
 * 3, porque ela está se apresentando e não ensinando. O que fica é o
 * gesto: a etiqueta curta dizendo de onde vem o que está na tela.
 */
const Rotulo: React.FC<{ children: React.ReactNode; atrasa?: number }> = ({
  children,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [atrasa * fps, (atrasa + 0.4) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const risco = interpolate(frame, [(atrasa + 0.15) * fps, (atrasa + 0.75) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", opacity: p }}>
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
        {children}
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

/** A janela de conversa, desenhada a traço: a barra de cima e as bolhas. */
const Conversa: React.FC<{ children: React.ReactNode; atrasa?: number; largura?: number }> = ({
  children,
  atrasa = 0,
  largura = 820,
}) => (
  <Quadro largura={largura} atrasa={atrasa}>
    <div
      style={{
        padding: "16px 22px",
        borderBottom: `2px solid ${T.tinta}`,
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: FONTE,
        fontSize: 24,
        color: T.tinta2,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 12,
          background: COR.success,
          flexShrink: 0,
        }}
      />
      WhatsApp do restaurante
    </div>
    <div
      style={{ display: "flex", flexDirection: "column", gap: 14, padding: "22px 24px" }}
    >
      {children}
    </div>
  </Quadro>
);

// ─── 1. oi, eu sou a Lia ─────────────────────────────────────────────

/**
 * A abertura é a única cena em que ela aparece de corpo inteiro.
 *
 * Em todo o resto do vídeo ela é um retrato, porque o assunto está na
 * tela ao lado dela. Aqui o assunto é ela -- é o segundo em que alguém
 * decide se vai continuar vendo --, e corpo inteiro sobre papel branco
 * é o que uma marca faz quando apresenta um personagem. Sem moldura: a
 * arte já tem fundo branco e se funde ao papel, o que a faz parecer
 * recortada e colada na página, não uma foto dentro de uma caixa.
 */
const Oi: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = interpolate(frame, [0, 0.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const respira = Math.sin((frame / fps) * 1.1) * 5;
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", gap: 10, padding: "40px 90px 0" }}
    >
      <Img
        src={staticFile("lia-corpo.webp")}
        style={{
          height: 1120,
          objectFit: "contain",
          opacity: entra,
          transform: `translateY(${(1 - entra) * 24 + respira}px) scale(${0.97 + entra * 0.03})`,
        }}
      />
      <Titulo preta="Oi, eu sou a" azul="Lia." tamanho={86} atrasa={0.1} />
      <div style={{ height: 18 }} />
      <Nota atrasa={1.9}>atendente virtual do Menu Fácil</Nota>
    </AbsoluteFill>
  );
};

// ─── 2. onde eu fico ─────────────────────────────────────────────────

const Onde: React.FC = () => (
  <Meio gap={30}>
    <Rotulo atrasa={0.2}>no seu WhatsApp</Rotulo>
    <Conversa atrasa={0.4}>
      <Bolha de="cliente" atrasa={1.3}>
        Boa noite, vocês estão abertos?
      </Bolha>
      <Bolha de="lia" atrasa={2.2}>
        Boa noite! Estamos sim, até 23:30 😊
      </Bolha>
    </Conversa>
  </Meio>
);

// ─── 3. o que eu sei ─────────────────────────────────────────────────

/**
 * O ponto desta cena é que ela não inventa: o que ela diz sai do
 * cardápio do dono. Por isso as linhas mostram item e preço de verdade,
 * e não um texto falando sobre isso.
 */
const Linha: React.FC<{
  nome: string;
  valor: string;
  atrasa: number;
  /** o preço vira este, neste segundo: a mudança no lugar da frase */
  vira?: string;
  viraEm?: number;
  ultima?: boolean;
}> = ({ nome, valor, atrasa, vira, viraEm = 0, ultima }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;
  const entra = interpolate(frame, [d, d + 0.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const trocou = Boolean(vira) && frame >= viraEm * fps;
  // o preço novo chega subindo e a linha acende por um instante: é o
  // "eu já sei na hora" acontecendo, em vez de escrito
  const pisca = vira
    ? interpolate(
        frame,
        [viraEm * fps, viraEm * fps + 0.18 * fps, viraEm * fps + 1.1 * fps],
        [0, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 24,
        padding: "26px 0",
        borderBottom: ultima ? "none" : `1px solid ${T.linha}`,
        fontFamily: FONTE,
        opacity: entra,
        transform: `translateY(${(1 - entra) * 12}px)`,
        background:
          pisca > 0 ? `rgba(249,104,11,${0.09 * pisca})` : "transparent",
      }}
    >
      <span style={{ fontSize: 46, fontWeight: 600, color: T.tinta }}>{nome}</span>
      <span
        style={{
          fontSize: 46,
          fontWeight: 800,
          color: pisca > 0 ? T.marca : T.tinta,
          whiteSpace: "nowrap",
          transform: `translateY(${pisca * -3}px)`,
        }}
      >
        {trocou ? vira : valor}
      </span>
    </div>
  );
};

const Sabe: React.FC = () => (
  <Meio gap={26}>
    {/* O rótulo diz de onde vêm os números -- que é a informação que a
        voz dela não carrega. As frases que ela fala saíram daqui. */}
    <Rotulo atrasa={0.2}>do seu cardápio</Rotulo>
    {/* os três entram enquanto ela lista, um por item, e o primeiro
        troca de preço quando ela chega em "eu já sei na hora" */}
    <Quadro largura={880} atrasa={0.6}>
      <div style={{ padding: "10px 36px 16px" }}>
        <Linha nome="X-Burger" valor="R$ 18,00" atrasa={1.2} vira="R$ 19,50" viraEm={7.1} />
        <Linha nome="Entrega · Centro" valor="R$ 3,00" atrasa={1.7} />
        <Linha nome="Hoje" valor="até 23:30" atrasa={2.2} ultima />
      </div>
    </Quadro>
    <Legenda atrasa={7.6}>
      mudou o preço, eu já sei <Destaque>na hora</Destaque>.
    </Legenda>
  </Meio>
);

// ─── 4. eu também anoto o pedido ─────────────────────────────────────

const PedidoNoPainel: React.FC<{ atrasa: number }> = ({ atrasa }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;
  const entra = interpolate(frame, [d, d + 0.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        width: "100%",
        opacity: entra,
        transform: `translateY(${(1 - entra) * 30}px)`,
      }}
    >
      {/* A seta separa as duas telas: em cima o WhatsApp do cliente,
          embaixo o painel do dono. Sem ela os dois quadros encostam e
          viram a mesma coisa. */}
      <svg width="30" height="34" viewBox="0 0 24 24" fill={T.tinta2}>
        <path d="M12 21 4.5 10.5h5V3h5v7.5h5z" />
      </svg>
      <Quadro largura={820} atrasa={atrasa}>
        <div
          style={{
            padding: "14px 24px",
            borderBottom: `2px solid ${T.tinta}`,
            fontFamily: FONTE,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: T.tinta2,
          }}
        >
          painel do restaurante
        </div>
        <div style={{ padding: "24px 28px", fontFamily: FONTE }}>
          <div
            style={{
              display: "inline-block",
              border: `2px solid ${COR.success}`,
              color: COR.successInk,
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 23,
              fontWeight: 800,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            pedido novo · feito pela Lia
          </div>
          <div style={{ fontSize: 46, fontWeight: 700, color: T.tinta, marginTop: 16 }}>
            2× X-Burger · 1× Coca lata
          </div>
          <div style={{ fontSize: 42, fontWeight: 800, color: T.marca, marginTop: 6 }}>
            R$ 42,00 · Centro
          </div>
        </div>
      </Quadro>
    </div>
  );
};

const PedidoCena: React.FC = () => (
  <Meio gap={22} baixo={130}>
    <Conversa atrasa={0.6}>
      <Bolha de="cliente" atrasa={1.8}>
        quero 2 x-burger e uma coca
      </Bolha>
      <Bolha de="lia" atrasa={2.8}>
        Anotei! Total: <b>R$ 42,00</b>. Confirma?
      </Bolha>
      <Bolha de="cliente" atrasa={3.9}>
        pode 👍
      </Bolha>
    </Conversa>
    <PedidoNoPainel atrasa={5.0} />
  </Meio>
);

// ─── 5. eu sei a minha hora ──────────────────────────────────────────

/**
 * A cena dos limites é a que faz ela confiável. Um dono desconfia de uma
 * máquina solta no WhatsApp dele -- e desconfia com razão. Mostrar onde
 * ela para vale mais do que mais uma coisa que ela faz.
 */
const Regra: React.FC<{ texto: string; atrasa: number; forte?: boolean }> = ({
  texto,
  atrasa,
  forte,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;
  const entra = interpolate(frame, [d, d + 0.45 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "30px 36px",
        borderRadius: 10,
        background: T.papel,
        border: `2px solid ${forte ? T.marca : T.linha}`,
        opacity: entra,
        transform: `translateY(${(1 - entra) * 22}px)`,
        fontFamily: FONTE,
      }}
    >
      <span
        style={{
          flex: 1,
          fontSize: 48,
          fontWeight: 700,
          color: forte ? T.tinta : T.tinta2,
        }}
      >
        {texto}
      </span>
      {/* o rosto dela apagado, com o sinal de desligado por cima.
          O rótulo sozinho não dizia nada -- "restaurante fechado" e daí?
          É este rosto apagado que mostra que, nessa situação, quem sai de
          cena é ela. Sem moldura, como em todo o resto: o que marca que
          ela está fora é o cinza e o traço, não uma caixa em volta. */}
      <div style={{ position: "relative", width: 92, height: 92, flexShrink: 0 }}>
        <Img
          src={staticFile("lia-sorriso.webp")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity: 0.3,
            filter: "grayscale(1)",
          }}
        />
        <svg
          width="92"
          height="92"
          viewBox="0 0 24 24"
          style={{ position: "absolute", inset: 0 }}
          fill="none"
          stroke={T.tinta2}
          strokeWidth="1.1"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9.6" />
          <path d="M5.2 5.2 18.8 18.8" />
        </svg>
      </div>
    </div>
  );
};

const Limites: React.FC = () => (
  <Meio gap={44}>
    <Rotulo atrasa={0.2}>onde eu paro</Rotulo>
    {/* rótulos de estado, não as frases dela: o que está escrito aqui é
        o que a voz não diz -- em que situação ela se cala. */}
    <div style={{ display: "flex", flexDirection: "column", gap: 22, width: "100%" }}>
      <Regra texto="Restaurante fechado" atrasa={2.0} />
      <Regra texto="Você entrou na conversa" atrasa={4.4} forte />
    </div>
    <Titulo preta="Quem manda" azul="é você." tamanho={70} atrasa={6.85} />
  </Meio>
);

// ─── 6. por que eu estou aqui ────────────────────────────────────────

/**
 * A única cena de fundo laranja, e de propósito.
 *
 * É a frase em que ela diz para que serve, e é a única do roteiro que
 * não explica nada -- depois de cinco cenas de papel branco com traço
 * fino, virar a tela inteira na cor da marca faz o olho parar. Gastar a
 * inversão aqui é o que lhe dá peso; usá-la duas vezes a gastaria.
 *
 * A serifada itálica continua aqui, em branco: é o que mantém esta cena
 * no mesmo vídeo que as outras, mesmo com tudo o mais invertido.
 */
const Porque: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vira = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const texto = interpolate(frame, [1.8 * fps, 2.3 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: T.marca, opacity: vira }} />
      <AbsoluteFill
        style={{
          background: "radial-gradient(60% 40% at 50% 34%, rgba(255,255,255,0.20), transparent 70%)",
          opacity: vira,
        }}
      />
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", gap: 54, padding: "0 90px" }}
      >
        {/* Esta é a única cena sem o rosto dela, e não é falta: a arte
            tem fundo branco e só se funde ao papel. Sobre o laranja ela
            voltaria a ser um bloco branco recortado -- justamente o que
            ele não quis. Sem rosto, a frase fica sozinha na cor da
            marca, que é o que esta cena tem a fazer. */}
        <div
          style={{
            textAlign: "center",
            opacity: texto,
            transform: `translateY(${(1 - texto) * 14}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONTE,
              fontSize: 78,
              fontWeight: 800,
              letterSpacing: -1.8,
              lineHeight: 1.08,
              color: "#ffffff",
            }}
          >
            Nenhum cliente seu
          </div>
          <div
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 80,
              fontStyle: "italic",
              fontWeight: 500,
              lineHeight: 1.12,
              color: "#ffffff",
            }}
          >
            sem resposta.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── 7. a marca ──────────────────────────────────────────────────────

/**
 * O fecho é o mesmo do tutorial, peça por peça.
 *
 * Dois vídeos do mesmo canal terminando igual é o que faz a assinatura
 * grudar: quem vê o segundo já sabe de quem é antes de ler.
 */
const Fecho: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <MarcaDoFecho atrasa={0.2} />
  </AbsoluteFill>
);

export const LiaFala: React.FC = () => (
  <AbsoluteFill style={{ background: T.papel }}>
    <Fundo />
    {/* A voz dela cobre o vídeo inteiro e manda nos tempos das cenas. */}
    <Audio src={staticFile("narracao-lia.mp3")} />

    <Sequence from={seg(ALTO[0])} durationInFrames={seg(ALTO[1] - ALTO[0])}>
      <ElaNoAlto />
    </Sequence>

    {(
      [
        [CENA.oi, Oi],
        [CENA.onde, Onde],
        [CENA.sabe, Sabe],
        [CENA.pedido, PedidoCena],
        [CENA.limites, Limites],
        [CENA.porque, Porque],
        [CENA.marca, Fecho],
      ] as const
    ).map(([[de, ate], Conteudo], i) => (
      <Sequence key={i} from={seg(de)} durationInFrames={seg(ate - de)}>
        <Cena dura={ate - de}>
          <Conteudo />
        </Cena>
      </Sequence>
    ))}
  </AbsoluteFill>
);
