import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { COR, FONTE } from "./marca";

/**
 * As peças do vídeo técnico.
 *
 * **O vídeo veste as cores do sistema.** Nada aqui é cor nova: cada
 * token abaixo aponta para o mesmo valor de src/app/globals.css, pelo
 * apelido que ele tem lá. O papel é o branco do app, as camadas são o
 * creme dos cartões, e a laranja é a mesma da marca. Quem assiste e
 * depois abre o sistema vê a mesma coisa -- que é o ponto de um vídeo
 * que fala do produto por dentro.
 *
 * Se a paleta mudar em globals.css, muda aqui também; os dois arquivos
 * andam juntos.
 */
export const T = {
  fundo: COR.bg,
  painel: COR.surface,
  painel2: COR.surface2,
  borda: COR.line,
  bordaForte: COR.lineForte,
  tinta: COR.ink,
  tinta2: COR.muted,
  tinta3: COR.faint,
  brand: COR.brand,
  /**
   * A laranja dos textos.
   *
   * Sobre papel claro a laranja da marca cheia (#f9680b) fica no limite
   * de legibilidade em corpo pequeno, então o texto usa a versão
   * pressionada, que é mais escura e já existe na paleta. Marcas
   * gráficas -- pontos, barras, anéis -- continuam na laranja cheia,
   * onde contraste de leitura não se aplica.
   */
  brandTexto: COR.brandPress,
  brandTint: COR.brandTint,
  brandLine: COR.brandLine,
  ok: COR.successInk,
  okSoft: COR.successSoft,
  ruim: COR.danger,
} as const;

/**
 * As cores do código, todas tiradas da paleta.
 *
 * Um tema de editor claro, montado com os tokens que o sistema já tem:
 * o verde de sucesso nas strings, o azul de informação nos números, a
 * laranja da marca nas palavras-chave. Poucas cores, e cada uma com um
 * trabalho só.
 */
const COD = {
  coment: COR.faint,
  texto: COR.successInk,
  chave: COR.brandPress,
  numero: COR.infoInk,
  fn: COR.warning,
  tinta: COR.ink,
} as const;

const MONO = '"JetBrains Mono", "Cascadia Mono", Consolas, "SF Mono", monospace';

/**
 * As ligaduras da JetBrains Mono desligadas.
 *
 * Num editor elas ajudam: `===` vira um símbolo só e o olho acostumado
 * lê mais rápido. Num vídeo não -- quem assiste vê uma barra tripla
 * contínua e não reconhece o operador. Aqui o código é para ser lido por
 * quem nunca o viu.
 */
const SEM_LIGADURA = { fontVariantLigatures: "none" } as const;

// ─── movimento ────────────────────────────────────────────────────────

const SUAVE = Easing.bezier(0.22, 1, 0.36, 1);

/** Progresso de 0 a 1 ao longo de `dura` segundos, depois de `atrasa`. */
const sobe = (frame: number, fps: number, atrasa: number, dura = 0.45) =>
  interpolate(frame, [atrasa * fps, (atrasa + dura) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: SUAVE,
  });

/** Entrada padrão de qualquer coisa: aparece subindo um pouco. */
export const Entra: React.FC<{
  children: React.ReactNode;
  atrasa?: number;
  sobeDe?: number;
  sai?: number;
}> = ({ children, atrasa = 0, sobeDe = 26, sai }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa);
  const indo = sai === undefined ? 1 : 1 - sobe(frame, fps, sai, 0.3);
  return (
    <div style={{ opacity: p * indo, transform: `translateY(${(1 - p) * sobeDe}px)` }}>
      {children}
    </div>
  );
};

// ─── texto ────────────────────────────────────────────────────────────

/** O rótulo pequeno em maiúsculas que diz de que a cena trata. */
export const Rotulo: React.FC<{ children: React.ReactNode; cor?: string }> = ({
  children,
  cor = T.brandTexto,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      fontFamily: FONTE,
      fontSize: 25,
      fontWeight: 800,
      letterSpacing: 2.4,
      color: cor,
      textTransform: "uppercase",
    }}
  >
    <span style={{ width: 34, height: 4, borderRadius: 2, background: cor }} />
    {children}
  </div>
);

export const Titulo: React.FC<{
  children: React.ReactNode;
  tamanho?: number;
  cor?: string;
}> = ({ children, tamanho = 68, cor = T.tinta }) => (
  <div
    style={{
      fontFamily: FONTE,
      fontSize: tamanho,
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: -1.4,
      color: cor,
    }}
  >
    {children}
  </div>
);

export const Sub: React.FC<{
  children: React.ReactNode;
  tamanho?: number;
  cor?: string;
}> = ({ children, tamanho = 36, cor = T.tinta2 }) => (
  <div
    style={{
      fontFamily: FONTE,
      fontSize: tamanho,
      fontWeight: 600,
      lineHeight: 1.4,
      color: cor,
    }}
  >
    {children}
  </div>
);

/** Destaque dentro de uma frase, na cor da marca. */
export const Forte: React.FC<{ children: React.ReactNode; cor?: string }> = ({
  children,
  cor = T.brandTexto,
}) => <span style={{ color: cor, fontWeight: 800 }}>{children}</span>;

/** Um identificador citado no meio do texto corrido. */
export const Mono: React.FC<{ children: React.ReactNode; cor?: string }> = ({
  children,
  cor = T.tinta,
}) => (
  <span
    style={{
      ...SEM_LIGADURA,
      fontFamily: MONO,
      fontSize: "0.88em",
      color: cor,
      background: T.painel2,
      border: `1px solid ${T.borda}`,
      borderRadius: 7,
      padding: "2px 9px",
    }}
  >
    {children}
  </span>
);

// ─── código ───────────────────────────────────────────────────────────

/**
 * O destaque de sintaxe, numa varredura só.
 *
 * Cada grupo do regex é uma cor, na ordem em que precisam ganhar: o
 * comentário vem primeiro porque dentro dele nada mais vale, e a string
 * vem antes das palavras-chave porque `"const"` escrito dentro de um
 * texto é texto. O que não casa fica com a tinta normal.
 */
const RE_CODIGO =
  /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(\b(?:const|let|await|async|function|return|if|export|type|new|null|true|false|number|string|integer|object|array|boolean|void|from|import)\b)|(\b\d[\d_]*\b)|([A-Za-z_$][\w$]*(?=\s*\())/g;

const CORES_DOS_GRUPOS = [COD.coment, COD.texto, COD.chave, COD.numero, COD.fn];

const pintar = (linha: string) => {
  const saida: React.ReactNode[] = [];
  let fim = 0;
  let i = 0;
  for (const m of linha.matchAll(RE_CODIGO)) {
    const de = m.index ?? 0;
    if (de > fim) saida.push(linha.slice(fim, de));
    const grupo = m.slice(1).findIndex((g) => g !== undefined);
    saida.push(
      <span key={i++} style={{ color: CORES_DOS_GRUPOS[grupo] ?? COD.tinta }}>
        {m[0]}
      </span>,
    );
    fim = de + m[0].length;
  }
  if (fim < linha.length) saida.push(linha.slice(fim));
  return saida;
};

/**
 * Um bloco de código, com o nome do arquivo em cima.
 *
 * `acende` marca uma linha (índice de 1) que fica realçada a partir de
 * `acendeEm` segundos -- é assim que a cena aponta para a linha que
 * importa sem eu precisar desenhar uma seta por cima.
 */
export const Codigo: React.FC<{
  arquivo?: string;
  linhas: string[];
  atrasa?: number;
  tamanho?: number;
  acende?: number[];
  acendeEm?: number;
  porLinha?: boolean;
}> = ({ arquivo, linhas, atrasa = 0, tamanho = 31, acende = [], acendeEm = 0, porLinha = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brilho = acende.length ? sobe(frame, fps, acendeEm, 0.4) : 0;

  return (
    <div
      style={{
        background: T.painel,
        border: `1px solid ${T.borda}`,
        borderRadius: 20,
        overflow: "hidden",
        // Sem isto o flex da cena encolhe o bloco quando o conteúdo passa
        // da altura, e o corte sai limpo: a última linha fica partida ao
        // meio e parece de propósito.
        flexShrink: 0,
        boxShadow: "0 18px 44px rgba(29,32,38,0.09)",
      }}
    >
      {arquivo ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "16px 24px",
            borderBottom: `1px solid ${T.borda}`,
            background: T.painel2,
            ...SEM_LIGADURA,
            fontFamily: MONO,
            fontSize: 23,
            color: T.tinta3,
          }}
        >
          <span style={{ width: 11, height: 11, borderRadius: 6, background: T.bordaForte }} />
          {arquivo}
        </div>
      ) : null}
      <div style={{ padding: "22px 26px", background: COR.bg }}>
        {linhas.map((linha, i) => {
          // Cada linha entra 0,07s depois da anterior: a leitura acompanha
          // o texto aparecendo, em vez de encarar o bloco todo de uma vez.
          const p = porLinha ? sobe(frame, fps, atrasa + i * 0.07, 0.3) : 1;
          const marcada = acende.includes(i + 1);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 20,
                opacity: p * (marcada || !acende.length ? 1 : 1 - brilho * 0.45),
                background: marcada ? `rgba(249,104,11,${0.10 * brilho})` : "transparent",
                borderLeft: `3px solid ${marcada ? `rgba(249,104,11,${brilho})` : "transparent"}`,
                margin: "0 -26px",
                padding: "2px 26px 2px 23px",
              }}
            >
              <span
                style={{
                  ...SEM_LIGADURA,
                  fontFamily: MONO,
                  fontSize: tamanho,
                  color: T.tinta3,
                  minWidth: 36,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  ...SEM_LIGADURA,
                  fontFamily: MONO,
                  fontSize: tamanho,
                  lineHeight: 1.62,
                  color: COD.tinta,
                  whiteSpace: "pre",
                }}
              >
                {linha === "" ? " " : pintar(linha)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── peças de diagrama e de lista ─────────────────────────────────────

/** Uma pílula: stack, campo do pedido, garantia. */
export const Chip: React.FC<{ children: React.ReactNode; atrasa?: number }> = ({
  children,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.35);
  return (
    <span
      style={{
        ...SEM_LIGADURA,
        fontFamily: MONO,
        fontSize: 28,
        // Sobre papel claro o cinza médio desaparece; a tinta cheia com
        // a borda forte é o que faz a pílula se ler de longe no feed.
        color: T.tinta,
        background: T.painel,
        border: `1px solid ${T.bordaForte}`,
        borderRadius: 999,
        padding: "12px 24px",
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      {children}
    </span>
  );
};

/**
 * Um nó do caminho do pedido.
 *
 * O caminho é desenhado de cima para baixo, e não da esquerda para a
 * direita, porque num vídeo quadrado a coluna deixa espaço para o rótulo
 * de cada passo -- que é onde está a informação.
 */
export const No: React.FC<{
  titulo: string;
  nota?: string;
  atrasa?: number;
  destaque?: boolean;
  ultimo?: boolean;
}> = ({ titulo, nota, atrasa = 0, destaque, ultimo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.38);
  const linha = sobe(frame, fps, atrasa + 0.22, 0.32);

  return (
    <div style={{ display: "flex", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 22 }}>
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            flexShrink: 0,
            marginTop: 22,
            background: destaque ? T.brand : T.bordaForte,
            boxShadow: destaque ? `0 0 0 7px ${T.brandTint}` : "none",
            opacity: p,
            transform: `scale(${0.4 + p * 0.6})`,
          }}
        />
        {!ultimo ? (
          <span
            style={{
              flex: 1,
              width: 2,
              marginTop: 8,
              background: T.borda,
              transformOrigin: "top",
              transform: `scaleY(${linha})`,
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          flex: 1,
          paddingBottom: ultimo ? 0 : 28,
          opacity: p,
          transform: `translateX(${(1 - p) * 16}px)`,
        }}
      >
        <div
          style={{
            ...SEM_LIGADURA,
            fontFamily: MONO,
            fontSize: 36,
            fontWeight: 600,
            color: destaque ? T.brandTexto : T.tinta,
          }}
        >
          {titulo}
        </div>
        {nota ? (
          <div style={{ fontFamily: FONTE, fontSize: 30, color: T.tinta3, marginTop: 6, lineHeight: 1.35 }}>
            {nota}
          </div>
        ) : null}
      </div>
    </div>
  );
};

/** Um cartão de ferramenta: o nome como a IA a vê, e o que ela faz. */
export const Ferramenta: React.FC<{
  nome: string;
  faz: string;
  atrasa?: number;
}> = ({ nome, faz, atrasa = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.36);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 22,
        padding: "24px 30px",
        borderRadius: 18,
        background: T.painel,
        border: `1px solid ${T.borda}`,
        opacity: p,
        transform: `translateY(${(1 - p) * 16}px)`,
      }}
    >
      <span
        style={{ ...SEM_LIGADURA, fontFamily: MONO, fontSize: 34, color: T.brandTexto, whiteSpace: "nowrap" }}
      >
        {nome}
      </span>
      <span style={{ fontFamily: FONTE, fontSize: 29, color: T.tinta2, lineHeight: 1.3 }}>{faz}</span>
    </div>
  );
};

/** Um número grande com legenda, para o quadro de medidas. */
export const Medida: React.FC<{ valor: string; oque: string; atrasa?: number }> = ({
  valor,
  oque,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.4);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 18}px)` }}>
      <div
        style={{
          fontFamily: FONTE,
          fontSize: 84,
          fontWeight: 800,
          letterSpacing: -1.6,
          color: T.tinta,
          lineHeight: 1,
        }}
      >
        {valor}
      </div>
      <div style={{ fontFamily: FONTE, fontSize: 29, color: T.tinta3, marginTop: 10 }}>{oque}</div>
    </div>
  );
};

/** Um passo do fluxo do Pix: o que o sistema faz, em ordem. */
export const Passo: React.FC<{
  numero: string;
  texto: string;
  atrasa?: number;
  pronto?: boolean;
}> = ({ numero, texto, atrasa = 0, pronto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.4);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "24px 30px",
        borderRadius: 18,
        background: pronto ? T.okSoft : T.painel,
        border: `1px solid ${pronto ? "rgba(16,121,55,0.3)" : T.borda}`,
        opacity: p,
        transform: `translateX(${(1 - p) * 20}px)`,
      }}
    >
      <span
        style={{
          ...SEM_LIGADURA,
          fontFamily: MONO,
          fontSize: 32,
          color: pronto ? T.ok : T.brandTexto,
          width: 44,
          flexShrink: 0,
        }}
      >
        {numero}
      </span>
      <span style={{ fontFamily: FONTE, fontSize: 34, fontWeight: 600, color: T.tinta, lineHeight: 1.25 }}>
        {texto}
      </span>
    </div>
  );
};

// ─── marca ────────────────────────────────────────────────────────────

/**
 * O ícone do app, nas cores dele.
 *
 * O PNG não tem canal alfa: o que parece transparente em volta do cartão
 * é preto de verdade, e sobre o papel claro do vídeo ele apareceria como
 * uma moldura. A imagem entra ampliada dentro de um container que corta
 * essa borda e devolve o canto arredondado.
 */
export const Icone: React.FC<{ tamanho?: number; atrasa?: number }> = ({
  tamanho = 180,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.5);
  return (
    <div
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho * 0.23,
        overflow: "hidden",
        flexShrink: 0,
        opacity: p,
        transform: `scale(${0.86 + p * 0.14})`,
        boxShadow: "0 16px 40px rgba(249,104,11,0.22)",
      }}
    >
      <Img
        src={staticFile("icone-menufacil.png")}
        style={{ width: "116%", height: "116%", marginLeft: "-8%", marginTop: "-8%", objectFit: "cover" }}
      />
    </div>
  );
};

/**
 * O rosto da Lia, redondo, com um anel na cor da marca.
 *
 * Ela entra uma vez só no vídeo, no passo do caminho em que o Claude
 * responde -- é o único momento em que o diagrama fala dela, e um rosto
 * ali fixa quem é "a atendente" mais rápido que o nome da função.
 */
export const Lia: React.FC<{ tamanho?: number; atrasa?: number }> = ({
  tamanho = 128,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = sobe(frame, fps, atrasa, 0.45);
  return (
    <div
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho,
        overflow: "hidden",
        flexShrink: 0,
        border: `3px solid ${T.brand}`,
        boxShadow: `0 0 0 8px ${T.brandTint}`,
        opacity: p,
        transform: `scale(${0.8 + p * 0.2})`,
      }}
    >
      <Img src={staticFile("lia.webp")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

// ─── fundo e legenda ──────────────────────────────────────────────────

/**
 * O fundo: o papel branco do sistema com um calor creme que anda devagar.
 *
 * Anda porque o vídeo passa a maior parte do tempo com blocos de código
 * parados na tela; sem nada se movendo atrás, os cortes entre cenas
 * parecem slides. O movimento é de propósito quase imperceptível -- é
 * fundo, não efeito.
 */
export const Fundo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const x = 50 + Math.sin(t * 0.17) * 22;
  const y = 18 + Math.cos(t * 0.13) * 14;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1100px 820px at ${x}% ${y}%, ${COR.brandTint}, transparent 66%), radial-gradient(900px 760px at ${100 - x}% ${100 - y}%, ${COR.surface}, transparent 70%)`,
      }}
    />
  );
};

/**
 * A faixa de legenda, no rodapé.
 *
 * Fica num lugar fixo e sempre com a mesma altura reservada, mesmo
 * quando está vazia: legenda que sobe e desce conforme o texto é a coisa
 * que mais cansa de ler num feed.
 */
export const Legenda: React.FC<{
  falas: ReadonlyArray<readonly [number, number, string]>;
  altura?: number;
}> = ({ falas, altura = 210 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // a fala corrente, ou a que acabou de sair (para ela apagar suave)
  const atual = falas.find(([de, ate]) => t >= de - 0.12 && t <= ate + 0.22);
  const p = atual
    ? Math.min(
        interpolate(t, [atual[0] - 0.12, atual[0] + 0.04], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        1 -
          interpolate(t, [atual[1] + 0.06, atual[1] + 0.22], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
      )
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: altura,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 64px 26px",
        background: `linear-gradient(to top, ${COR.bg}, ${COR.bg} 58%, transparent)`,
      }}
    >
      <div
        style={{
          fontFamily: FONTE,
          fontSize: 38,
          fontWeight: 700,
          lineHeight: 1.28,
          textAlign: "center",
          color: T.tinta,
          opacity: p,
          transform: `translateY(${(1 - p) * 8}px)`,
        }}
      >
        {atual?.[2] ?? ""}
      </div>
    </div>
  );
};
