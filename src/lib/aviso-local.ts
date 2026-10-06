"use client";

import { useSyncExternalStore } from "react";

// O som do balcão e a memória do aparelho, usados pelos avisos que sobem
// no canto da tela de Pedidos.
//
// Isto morava dentro do componente de impressão, de onde nasceu. Saiu de lá
// quando a conversa do cliente passou a avisar também: os dois avisos tocam
// o mesmo sino de propósito -- quem está no balcão aprendeu que aquele som
// quer dizer "olha a tela", e um segundo som só ensinaria a ignorar os dois.

const EVENT = "mf-impressao";

export const SOUND_KEY = "mf_som_pedido";
export const CHOICE_KEY = "mf_som_escolha";

export const SOUNDS = {
  sino: { label: "Sino", file: "/som-sino.wav" },
  campainha: { label: "Campainha", file: "/som-campainha.wav" },
  alerta: { label: "Alerta", file: "/som-alerta.wav" },
} as const;

export type SoundName = keyof typeof SOUNDS;
export const isSound = (v: unknown): v is SoundName => typeof v === "string" && v in SOUNDS;

export const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // sem armazenamento: vale só nesta visita
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback); // outra aba do painel
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** o que está salvo neste aparelho, sem quebrar a primeira pintura no servidor */
export function useStored(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
}

export const idList = (raw: string | null): string[] => {
  try {
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const remember = (key: string, ids: string[], raw: string | null) =>
  write(key, JSON.stringify([...ids, ...idList(raw)].slice(0, 200)));

// um tocador só: trocar de som troca o arquivo dele
let player: HTMLAudioElement | null = null;

/**
 * Bipe de emergência, feito na hora pelo próprio navegador.
 *
 * O arquivo de som falha em mais situação do que parece: aparelho no
 * silencioso, arquivo que não carregou, navegador que ainda não deixou
 * tocar. Quando isso acontece, três apitos curtos avisam do mesmo jeito --
 * é melhor um som feio do que pedido passando batido no balcão.
 */
function bipeDeEmergencia() {
  try {
    const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return;
    const ctx = new Contexto();
    const agora = ctx.currentTime;
    for (const [i, quando] of [0, 0.22, 0.44].entries()) {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 2 ? 1320 : 880;
      vol.gain.setValueAtTime(0.0001, agora + quando);
      vol.gain.exponentialRampToValueAtTime(0.35, agora + quando + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, agora + quando + 0.18);
      osc.connect(vol).connect(ctx.destination);
      osc.start(agora + quando);
      osc.stop(agora + quando + 0.2);
    }
    setTimeout(() => void ctx.close().catch(() => {}), 1200);
  } catch {
    // sem áudio neste aparelho: resta o aviso na tela
  }
}

export function playSound(name: SoundName) {
  const file = SOUNDS[name].file;
  if (!player || !player.src.endsWith(file)) player = new Audio(file);
  player.currentTime = 0;
  player.volume = 1;
  return player.play().catch((erro) => {
    bipeDeEmergencia();
    throw erro;
  });
}

/** o som que este aparelho escolheu, já com o padrão */
export const somEscolhido = (salvo: string | null): SoundName => (isSound(salvo) ? salvo : "sino");
