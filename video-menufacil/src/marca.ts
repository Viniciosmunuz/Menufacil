/**
 * A paleta do MenuFácil, copiada de src/app/globals.css do sistema.
 *
 * Nada de cor nova aqui dentro: o vídeo explica o sistema, então ele
 * precisa parecer o sistema. Se a paleta mudar lá, muda aqui também --
 * e os dois arquivos andam juntos.
 */
export const COR = {
  // papel e camadas
  bg: "#ffffff",
  surface: "#f6f1ea",
  surface2: "#efe7db",
  surface3: "#e6dbca",
  line: "#e2d8c8",
  lineForte: "#cbbda8",

  // tinta
  ink: "#1d2026",
  muted: "#5b6168",
  faint: "#8a8f96",

  // a marca
  brand: "#f9680b",
  brandHover: "#e85d05",
  brandPress: "#c94f08",
  brandInk: "#1a0d03",
  brandTint: "#fce4d4",
  brandLine: "#ec9a65",

  // estados
  success: "#16a34a",
  successSoft: "#d8f8e4",
  successInk: "#107937",
  warning: "#b7791f",
  warningSoft: "#f7ebd9",
  danger: "#dc2626",
  info: "#2563eb",
  infoSoft: "#d6e1fa",
  infoInk: "#0c2f7e",

  // o preto da marca, usado no app do entregador
  night: "#0c0e12",
  nightSurface: "#161a21",
} as const;

/** A fonte do sistema é a Nunito; o vídeo usa a mesma. */
export const FONTE =
  '"Nunito", "Segoe UI", system-ui, -apple-system, sans-serif';

/** 30 quadros por segundo em tudo: o vídeo sai para Reels e story. */
export const FPS = 30;

/** Converte segundos em quadros, para os tempos do roteiro ficarem legíveis. */
export const seg = (s: number) => Math.round(s * FPS);
