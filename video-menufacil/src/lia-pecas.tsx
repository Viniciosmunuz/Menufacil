import React from "react";
import {
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COR, FONTE } from "./marca";

/**
 * As peças do vídeo da Lia.
 *
 * O assunto aqui é uma conversa, então o vídeo é uma conversa: bolhas que
 * entram uma a uma, no ritmo de quem digita. Nada de mockup de telefone --
 * num Reels, visto num celular, o telefone dentro do telefone deixa o texto
 * pequeno demais para ler. A janela do WhatsApp aparece sem moldura de
 * aparelho, ocupando a largura toda.
 */

const SUAVE = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * As cores do WhatsApp.
 *
 * Ficam aqui, e não em marca.ts, de propósito: marca.ts é a paleta do
 * MenuFácil e não pode ganhar verde nenhum. Estas são citação de uma
 * interface que o espectador já conhece -- é esse reconhecimento
 * instantâneo que faz o vídeo não precisar explicar onde a conversa
 * acontece.
 */
const ZAP = {
  barra: "#008069",
  parede: "#ECE5DD",
  recebida: "#ffffff",
  enviada: "#D9FDD3",
  tinta: "#111b21",
  hora: "rgba(17,27,33,0.45)",
  visto: "#53BDEB",
} as const;

/** o rosto da Lia, o mesmo que aparece no cardápio */
export const RostoDaLia: React.FC<{ tamanho?: number; atrasa?: number; aro?: string }> = ({
  tamanho = 150,
  atrasa = 0,
  aro = COR.bg,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;
  // entra crescendo um tiquinho além do tamanho final e volta: é o que
  // dá a sensação de alguém chegando, em vez de um adesivo colado
  const escala = interpolate(frame, [d, d + 0.45 * fps, d + 0.7 * fps], [0.6, 1.06, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: SUAVE,
  });
  return (
    <div
      style={{
        position: "relative",
        width: tamanho,
        height: tamanho,
        flexShrink: 0,
        scale: String(escala),
        opacity: interpolate(frame, [d, d + 0.3 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <Img
        src={staticFile("lia.webp")}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 999,
          objectFit: "cover",
          background: COR.surface2,
        }}
      />
      {/* A bolinha de online, a mesma do cardápio.
          Os 5% vêm da conta, não do olho: o rosto é um círculo, e o canto
          do quadrado que o contém fica fora dele. Para o centro da bolinha
          pousar na borda do círculo a 45°, ela precisa recuar meio raio
          dela mais a sobra do canto.
          O `aro` acompanha o fundo de quem chama: dentro da barra verde do
          WhatsApp, um aro branco vira um pingo fora de lugar. */}
      <div
        style={{
          position: "absolute",
          right: tamanho * 0.05,
          top: tamanho * 0.05,
          width: tamanho * 0.22,
          height: tamanho * 0.22,
          borderRadius: 999,
          background: COR.success,
          border: `${Math.max(3, tamanho * 0.035)}px solid ${aro}`,
        }}
      />
    </div>
  );
};

/**
 * A janela do WhatsApp: barra verde em cima, papel de parede atrás.
 *
 * As bolhas vão dentro. A janela inteira entra de uma vez, antes da
 * primeira mensagem, para o espectador saber onde está antes de ler.
 */
export const JanelaWhats: React.FC<{ children: React.ReactNode; atrasa?: number }> = ({
  children,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;
  const entra = interpolate(frame, [d, d + 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: SUAVE,
  });
  return (
    <div
      style={{
        borderRadius: 46,
        overflow: "hidden",
        background: ZAP.parede,
        boxShadow: "0 40px 90px -40px rgba(29,32,38,0.45)",
        fontFamily: FONTE,
        opacity: entra,
        translate: `0px ${(1 - entra) * 30}px`,
        scale: String(0.97 + entra * 0.03),
      }}
    >
      {/* a barra de cima: seta, foto, nome e "online", como em qualquer conversa */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "26px 32px",
          background: ZAP.barra,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="rgba(255,255,255,0.92)">
          <path d="M15.4 4.6 8 12l7.4 7.4 1.4-1.4L10.8 12l6-6z" />
        </svg>
        <RostoDaLia tamanho={84} atrasa={0} aro={ZAP.barra} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: "#fff" }}>Lia</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
            online
          </div>
        </div>
      </div>

      {/* o papel de parede, com a textura discreta de sempre */}
      <div
        style={{
          position: "relative",
          padding: "34px 30px 38px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.5,
            backgroundImage:
              "radial-gradient(rgba(17,27,33,0.05) 2px, transparent 2px), radial-gradient(rgba(17,27,33,0.04) 2px, transparent 2px)",
            backgroundSize: "70px 70px, 70px 70px",
            backgroundPosition: "0 0, 35px 35px",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 20 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/** os dois tiquinhos de "lido", azuis, do lado de quem enviou */
const Visto: React.FC = () => (
  <svg width="30" height="18" viewBox="0 0 20 12" fill="none">
    <path
      d="M1 6.4 4.1 9.6 10.6 2.4M8.4 6.4l3.1 3.2L18 2.4"
      stroke={ZAP.visto}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Uma bolha da conversa, no padrão do WhatsApp.
 *
 * **A tela é a do cliente, e por isso os lados são estes.** No WhatsApp,
 * o verde à direita é sempre de quem segura o telefone. Quem segura aqui
 * é o cliente -- o vídeo mostra ao dono como o cliente dele vai ser
 * atendido. Então o cliente fica verde à direita e a Lia branca à
 * esquerda. Inverter isso faria a cena parecer a caixa de entrada do
 * dono, que é outra história.
 */
export const Bolha: React.FC<{
  de: "cliente" | "lia";
  children: React.ReactNode;
  atrasa: number;
  hora?: string;
  /** some depois deste segundo, para a próxima cena entrar limpa */
  sai?: number;
}> = ({ de, children, atrasa, hora = "19:58", sai }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;
  const doCliente = de === "cliente";

  const entrada = interpolate(frame, [d, d + 0.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: SUAVE,
  });
  const saida = sai
    ? interpolate(frame, [sai * fps, sai * fps + 0.35 * fps], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: doCliente ? "flex-end" : "flex-start",
        opacity: entrada * saida,
        translate: `0px ${(1 - entrada) * 26}px`,
        scale: String(0.96 + entrada * 0.04),
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "20px 26px 14px",
          borderRadius: 22,
          borderTopRightRadius: doCliente ? 6 : 22,
          borderTopLeftRadius: doCliente ? 22 : 6,
          background: doCliente ? ZAP.enviada : ZAP.recebida,
          color: ZAP.tinta,
          fontFamily: FONTE,
          fontSize: 40,
          fontWeight: 600,
          lineHeight: 1.3,
          boxShadow: "0 2px 3px rgba(11,20,26,0.13)",
        }}
      >
        {children}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 4,
            fontSize: 24,
            fontWeight: 600,
            color: ZAP.hora,
          }}
        >
          {hora}
          {doCliente && <Visto />}
        </div>
      </div>
    </div>
  );
};

/** os três pontinhos de "digitando", do lado da Lia (a esquerda) */
export const Digitando: React.FC<{ atrasa: number; some: number }> = ({ atrasa, some }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vivo = frame >= atrasa * fps && frame < some * fps;
  if (!vivo) return null;
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "28px 32px",
          borderRadius: 22,
          borderTopLeftRadius: 6,
          background: ZAP.recebida,
          boxShadow: "0 2px 3px rgba(11,20,26,0.13)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "rgba(17,27,33,0.35)",
              // cada ponto sobe na sua vez: o ciclo inteiro em meio segundo
              translate: `0px ${-9 * Math.max(0, Math.sin((frame / fps) * 7 - i * 0.7))}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

/** A frase da narração, grande, no alto ou no pé da tela. */
export const Fala: React.FC<{
  children: React.ReactNode;
  atrasa: number;
  sai?: number;
  tamanho?: number;
  cor?: string;
}> = ({ children, atrasa, sai, tamanho = 62, cor = COR.ink }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;
  const entra = interpolate(frame, [d, d + 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: SUAVE,
  });
  const saida = sai
    ? interpolate(frame, [sai * fps, sai * fps + 0.35 * fps], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  return (
    <div
      style={{
        fontFamily: FONTE,
        fontSize: tamanho,
        fontWeight: 900,
        lineHeight: 1.16,
        letterSpacing: "-0.02em",
        color: cor,
        opacity: entra * saida,
        translate: `0px ${(1 - entra) * 26}px`,
      }}
    >
      {children}
    </div>
  );
};

/** o laranja da marca dentro de uma frase */
export const Forte: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ color: COR.brand }}>{children}</span>
);

/**
 * O selo de novidade da abertura.
 *
 * Entra estourando um tiquinho e volta ao tamanho. É o que diz "isto é
 * lançamento" antes de qualquer outra coisa -- sem ele o vídeo parece
 * propaganda do produto inteiro, e não do que acabou de chegar nele.
 */
export const Selo: React.FC<{ children: React.ReactNode; atrasa?: number }> = ({
  children,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;
  const entra = interpolate(frame, [d, d + 0.4 * fps, d + 0.62 * fps], [0, 1.12, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: SUAVE,
  });
  return (
    <div
      style={{
        alignSelf: "center",
        padding: "20px 44px",
        borderRadius: 999,
        background: COR.brand,
        color: "#fff",
        fontFamily: FONTE,
        fontSize: 38,
        fontWeight: 900,
        letterSpacing: "0.16em",
        boxShadow: "0 22px 50px -24px rgba(249,104,11,0.9)",
        opacity: Math.min(1, entra),
        scale: String(entra),
      }}
    >
      {children}
    </div>
  );
};

/**
 * A notificação que chega e ninguém atende.
 *
 * Vai empilhando na cena de abertura. O cinza e o silêncio são o ponto:
 * é o antes, e precisa parecer o antes.
 */
export const Aviso: React.FC<{ texto: string; hora: string; atrasa: number; sai?: number }> = ({
  texto,
  hora,
  atrasa,
  sai,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;
  const entra = interpolate(frame, [d, d + 0.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: SUAVE,
  });
  const saida = sai
    ? interpolate(frame, [sai * fps, sai * fps + 0.4 * fps], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "30px 36px",
        borderRadius: 34,
        background: "rgba(255,255,255,0.09)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(14px)",
        opacity: entra * saida,
        translate: `0px ${(1 - entra) * 34}px`,
      }}
    >
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: 20,
          background: "#25D366",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <svg width="46" height="46" viewBox="0 0 24 24" fill="#fff">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.2 14.8l-.4-.2-2.6.7.7-2.5-.3-.4A8 8 0 0 1 12 4z" />
          <path d="M8.6 7.6c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.5.3.1.5 0 .6-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.4 0 .2 0 .9-.3 1.3-.3.4-1 .8-1.5.8-1.3.1-2.6-.4-4.6-1.8-2.3-1.7-3.6-4-3.9-4.6-.3-.6-.6-1.4-.6-2.2 0-.6.3-1 .5-1.3z" />
        </svg>
      </div>
      <div style={{ fontFamily: FONTE, minWidth: 0 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: "rgba(255,255,255,0.55)" }}>
          WhatsApp · {hora}
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "rgba(255,255,255,0.93)",
            marginTop: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {texto}
        </div>
      </div>
    </div>
  );
};

/**
 * A Lia inteira, sem o recorte redondo.
 *
 * O arquivo tem 256 pixels de lado, então ela não passa de uns 560 na
 * tela: acima disso o desenho começa a borrar e o rosto perde a cara de
 * ilustração. O brilho atrás existe para o quadrado branco da imagem não
 * encostar seco no branco do fundo -- sem ele dá para ver a quina.
 */
export const LiaInteira: React.FC<{ tamanho?: number; atrasa?: number }> = ({
  tamanho = 520,
  atrasa = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = atrasa * fps;
  const entra = interpolate(frame, [d, d + 0.5 * fps, d + 0.8 * fps], [0, 1.04, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: SUAVE,
  });
  // respira: sobe e desce um fio, para ela não parecer um adesivo parado
  const respira = Math.sin((frame / fps) * 1.1) * 6;
  return (
    <div
      style={{
        position: "relative",
        width: tamanho,
        height: tamanho,
        flexShrink: 0,
        opacity: Math.min(1, entra),
        scale: String(entra),
        translate: `0px ${respira}px`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -tamanho * 0.18,
          borderRadius: 999,
          background: `radial-gradient(circle, ${COR.brandTint}, transparent 68%)`,
        }}
      />
      <Img
        src={staticFile("lia.webp")}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 48,
          objectFit: "cover",
        }}
      />
    </div>
  );
};
