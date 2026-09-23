"use client";

import { Bell, BellOff, Printer, PrinterCheck, Smartphone } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";

// Impressão automática dos pedidos novos, para quem deixa o painel aberto:
// - "pc": abre a via num quadro invisível e manda imprimir. Com o Chrome
//   aberto em modo de impressão direta (--kiosk-printing), sai na impressora
//   sem janela nenhuma.
// - "celular": entrega o texto ao RawBT, o app que fala com a térmica por
//   Bluetooth ou rede.
// Nada disso depende do WhatsApp: o pedido já está no sistema quando o
// cliente confirma.

type Mode = "off" | "pc" | "celular";

const MODE_KEY = "mf_impressao";
const SOUND_KEY = "mf_som_pedido";
const PRINTED_KEY = "mf_pedidos_impressos";
const SINCE_KEY = "mf_impressao_desde";
const RAWBT = "#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;";

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // sem armazenamento: vale só nesta visita
  }
};

const printedIds = (): string[] => {
  try {
    const raw = read(PRINTED_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** apito curto de pedido novo, sem precisar de arquivo de som */
function beep() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const audio = new Ctor();
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.type = "square";
    tone.frequency.value = 880;
    gain.gain.value = 0.15;
    tone.connect(gain).connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + 0.18);
    tone.onended = () => void audio.close();
  } catch {
    // navegador sem som liberado: o aviso na tela continua valendo
  }
}

/** o que está salvo no aparelho, sem quebrar a primeira pintura no servidor */
const noop = () => () => {};

/** vale a partir de agora: os pedidos que já estão na tela não saem na impressora */
function startNow(ids: string[]) {
  write(SINCE_KEY, String(Date.now()));
  write(PRINTED_KEY, JSON.stringify(ids.slice(0, 200)));
}

export function PrintSettings({ base, orders }: { base: string; orders: { id: string; createdAt: string }[] }) {
  const savedMode = useSyncExternalStore(noop, () => read(MODE_KEY), () => null);
  const savedSound = useSyncExternalStore(noop, () => read(SOUND_KEY), () => null);
  // a escolha do momento vale na hora; o aparelho lembra dela na próxima visita
  const [chosenMode, setChosenMode] = useState<Mode | null>(null);
  const [chosenSound, setChosenSound] = useState<boolean | null>(null);
  const frames = useRef<HTMLDivElement>(null);

  const mode: Mode = chosenMode ?? (savedMode === "pc" || savedMode === "celular" ? savedMode : "off");
  const sound = chosenSound ?? savedSound === "1";

  useEffect(() => {
    const since = Number(read(SINCE_KEY) ?? 0);
    const done = printedIds();
    // só o que chegou depois de ligar: a fila antiga não sai toda de uma vez
    const novos = orders.filter((o) => !done.includes(o.id) && new Date(o.createdAt).getTime() >= since);
    if (novos.length === 0) return;

    if (sound) beep();

    if (mode !== "off") {
      for (const order of novos) {
        const url = `${base}/${order.id}/via`;
        if (mode === "pc") {
          const frame = document.createElement("iframe");
          frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0";
          frame.src = url;
          frames.current?.appendChild(frame);
          // a própria via manda imprimir ao carregar; depois o quadro sai
          setTimeout(() => frame.remove(), 60_000);
        } else {
          void fetch(`${url}?formato=texto`)
            .then((r) => (r.ok ? r.text() : null))
            .then((text) => {
              if (text) window.location.href = `intent:${encodeURI(text)}${RAWBT}`;
            })
            .catch(() => {});
        }
      }
    }

    write(PRINTED_KEY, JSON.stringify([...novos.map((o) => o.id), ...done].slice(0, 200)));
  }, [orders, mode, sound, base]);

  function chooseMode(next: Mode) {
    setChosenMode(next);
    write(MODE_KEY, next);
    startNow([...orders.map((o) => o.id), ...printedIds()]);
  }

  function toggleSound() {
    const next = !sound;
    setChosenSound(next);
    write(SOUND_KEY, next ? "1" : "0");
    if (next) beep(); // o toque no botão é o que libera o som no navegador
  }

  const option = (value: Mode, label: string, Icon: typeof Printer) => (
    <button
      type="button"
      onClick={() => chooseMode(value)}
      aria-pressed={mode === value}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold",
        mode === value ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 text-sm font-extrabold">Imprimir pedido novo:</p>
        {option("off", "Não imprimir", PrinterCheck)}
        {option("pc", "Neste computador", Printer)}
        {option("celular", "Neste celular (RawBT)", Smartphone)}
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          className={cn(
            "ml-auto inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold",
            sound ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
          )}
        >
          {sound ? <Bell className="size-4" aria-hidden="true" /> : <BellOff className="size-4" aria-hidden="true" />}
          {sound ? "Som ligado" : "Som desligado"}
        </button>
      </div>
      <p className="text-sm text-muted">
        {mode === "pc"
          ? "Deixe esta página aberta. Para sair direto na impressora, sem a janela de confirmação, abra o Chrome com a opção de impressão direta."
          : mode === "celular"
            ? "Deixe esta página aberta e o app RawBT instalado, com a impressora pareada."
            : "Com o painel aberto, o pedido novo pode sair sozinho na impressora térmica."}
      </p>
      <div ref={frames} aria-hidden="true" />
    </div>
  );
}
