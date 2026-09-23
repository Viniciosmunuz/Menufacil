"use client";

import { Bell, BellOff, Download, Printer, PrinterCheck, Smartphone, TriangleAlert, Volume2 } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/cn";

// Impressão automática dos pedidos novos, para quem deixa o painel aberto:
// - "pc": abre a via num quadro invisível e manda imprimir. Com o Chrome
//   aberto em modo de impressão direta (--kiosk-printing), sai na impressora
//   padrão sem janela nenhuma.
// - "celular": entrega o texto ao RawBT, o app que fala com a térmica por
//   Bluetooth ou rede.
// O navegador não diz se o papel saiu, mas avisa quando termina de
// imprimir. Se esse aviso não chega no prazo — impressora desligada, sem
// papel, janela de impressão parada —, o pedido aparece em vermelho na
// tela, com "Imprimir de novo".
// Nada disso depende do WhatsApp: o pedido já está no sistema quando o
// cliente confirma.

type Mode = "off" | "pc" | "celular";
type Order = { id: string; number: number; createdAt: string };

const MODE_KEY = "mf_impressao";
const SOUND_KEY = "mf_som_pedido";
const CHOICE_KEY = "mf_som_escolha";
const PRINTED_KEY = "mf_pedidos_impressos";
const SEEN_KEY = "mf_pedidos_vistos";
const SINCE_KEY = "mf_impressao_desde";
/** pedidos que o Chrome confirmou ter terminado de imprimir */
const OK_KEY = "mf_impressao_ok";
/** quando cada via foi mandada para a impressora */
const ATTEMPT_KEY = "mf_impressao_tentativa";
/** vias que o navegador não confirmou dentro do prazo */
const FAILED_KEY = "mf_impressao_falhou";
/** quanto esperar pela confirmação antes de achar que deu errado */
const CONFIRM_MS = 12_000;
const EVENT = "mf-impressao";
const RAWBT = "#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;";

const SOUNDS = {
  sino: { label: "Sino", file: "/som-sino.wav" },
  campainha: { label: "Campainha", file: "/som-campainha.wav" },
  alerta: { label: "Alerta", file: "/som-alerta.wav" },
} as const;
type SoundName = keyof typeof SOUNDS;
const isSound = (v: unknown): v is SoundName => typeof v === "string" && v in SOUNDS;

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

function write(key: string, value: string) {
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
function useStored(key: string) {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
}

const idList = (raw: string | null): string[] => {
  try {
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const remember = (key: string, ids: string[], raw: string | null) => write(key, JSON.stringify([...ids, ...idList(raw)].slice(0, 200)));

/** quando cada via foi mandada para a impressora */
const attempts = (raw: string | null): Record<string, number> => {
  try {
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

function markAttempt(id: string) {
  const map = attempts(read(ATTEMPT_KEY));
  map[id] = Date.now();
  write(ATTEMPT_KEY, JSON.stringify(Object.fromEntries(Object.entries(map).slice(-100))));
  // mandou de novo: sai da lista de falhas até o prazo vencer outra vez
  const still = idList(read(FAILED_KEY)).filter((failedId) => failedId !== id);
  write(FAILED_KEY, JSON.stringify(still));
}

/** vias que passaram do prazo sem o "terminei de imprimir" do navegador */
function sweepFailures() {
  const tried = attempts(read(ATTEMPT_KEY));
  const ok = idList(read(OK_KEY));
  const known = idList(read(FAILED_KEY));
  const now = Date.now();
  const late = Object.entries(tried)
    .filter(([id, at]) => !ok.includes(id) && !known.includes(id) && now - at > CONFIRM_MS)
    .map(([id]) => id);
  if (late.length > 0) remember(FAILED_KEY, late, read(FAILED_KEY));
}

// um tocador só: trocar de som troca o arquivo dele
let player: HTMLAudioElement | null = null;
function playSound(name: SoundName) {
  const file = SOUNDS[name].file;
  if (!player || !player.src.endsWith(file)) player = new Audio(file);
  player.currentTime = 0;
  return player.play();
}

/** vale a partir de agora: os pedidos que já estão na tela não saem na impressora */
function startNow() {
  write(SINCE_KEY, String(Date.now()));
}

export function PrintSettings({ base, panelUrl, orders }: { base: string; panelUrl: string; orders: Order[] }) {
  const savedMode = useStored(MODE_KEY);
  const savedSound = useStored(SOUND_KEY);
  const savedChoice = useStored(CHOICE_KEY);
  const savedSeen = useStored(SEEN_KEY);
  const savedSince = useStored(SINCE_KEY);
  const savedOk = useStored(OK_KEY);
  const savedFailed = useStored(FAILED_KEY);
  const frames = useRef<HTMLDivElement>(null);

  const mode: Mode = savedMode === "pc" || savedMode === "celular" ? savedMode : "off";
  const sound = savedSound === "1";
  const soundName: SoundName = isSound(savedChoice) ? savedChoice : "sino";
  const since = Number(savedSince ?? 0);
  const fresh = orders.filter((o) => new Date(o.createdAt).getTime() >= since);

  // O Chrome avisa a página quando termina de imprimir. Sem esse aviso, ou a
  // impressora não está aí, ou a janela de impressão ficou aberta: é o único
  // jeito que o navegador dá de desconfiar que o papel não saiu.
  const confirmed = idList(savedOk);
  const seen = idList(savedSeen);
  const late = idList(savedFailed);
  const failed = fresh.filter((o) => late.includes(o.id) && !confirmed.includes(o.id) && !seen.includes(o.id));

  function sendToPrinter(id: string) {
    const url = `${base}/${id}/via`;
    if (mode === "celular") {
      void fetch(`${url}?formato=texto`)
        .then((r) => (r.ok ? r.text() : null))
        .then((text) => {
          if (text) window.location.href = `intent:${encodeURI(text)}${RAWBT}`;
        })
        .catch(() => {});
      return;
    }
    markAttempt(id);
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0";
    frame.src = url;
    frames.current?.appendChild(frame);
    // a própria via manda imprimir ao carregar; depois o quadro sai
    setTimeout(() => frame.remove(), 60_000);
  }

  useEffect(() => {
    const done = idList(read(PRINTED_KEY));
    const novos = fresh.filter((o) => !done.includes(o.id));
    if (novos.length === 0) return;

    if (sound) void playSound(soundName).catch(() => {});
    if (mode !== "off") for (const order of novos) sendToPrinter(order.id);
    remember(PRINTED_KEY, novos.map((o) => o.id), read(PRINTED_KEY));
    // sendToPrinter acompanha o modo e o endereço, que já estão nas dependências
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, mode, sound, soundName, base]);

  // a via avisa daqui a pouco que imprimiu; este é o ouvido dela
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { mf?: string; id?: string } | null;
      if (data?.mf === "impresso" && typeof data.id === "string") remember(OK_KEY, [data.id], read(OK_KEY));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // de tempos em tempos, confere quais vias ficaram sem confirmação
  useEffect(() => {
    sweepFailures();
    const timer = setInterval(sweepFailures, 4000);
    return () => clearInterval(timer);
  }, []);

  const option = (value: Mode, label: string, Icon: typeof Printer) => (
    <button
      type="button"
      onClick={() => {
        write(MODE_KEY, value);
        startNow();
        remember(SEEN_KEY, orders.map((o) => o.id), read(SEEN_KEY));
        remember(PRINTED_KEY, orders.map((o) => o.id), read(PRINTED_KEY));
      }}
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

  const shortcut = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app=${panelUrl}`;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      {failed.length > 0 && (
        <div className="flex flex-col gap-2 rounded-control border border-danger/40 bg-danger/10 p-4">
          <p className="flex items-center gap-2 font-extrabold text-danger">
            <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
            {failed.length === 1 ? `Pedido #${failed[0].number} pode não ter sido impresso` : `${failed.length} pedidos podem não ter sido impressos`}
          </p>
          <p className="text-sm text-ink/90">
            A impressora não confirmou a impressão. Confira se ela está ligada, conectada e com papel, e mande imprimir de novo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => failed.forEach((o) => sendToPrinter(o.id))}>
              <Printer className="size-4" aria-hidden="true" />
              Imprimir de novo
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => remember(SEEN_KEY, failed.map((o) => o.id), read(SEEN_KEY))}
            >
              Já vi, pode tirar
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 text-sm font-extrabold">Imprimir pedido novo:</p>
        {option("off", "Não imprimir", PrinterCheck)}
        {option("pc", "Neste computador", Printer)}
        {option("celular", "Neste celular (RawBT)", Smartphone)}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !sound;
              write(SOUND_KEY, next ? "1" : "0");
              // o toque no botão é o que libera o som no navegador
              if (next) void playSound(soundName).catch(() => {});
            }}
            aria-pressed={sound}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold",
              sound ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
            )}
          >
            {sound ? <Bell className="size-4" aria-hidden="true" /> : <BellOff className="size-4" aria-hidden="true" />}
            {sound ? "Som ligado" : "Som desligado"}
          </button>
          {sound &&
            (Object.keys(SOUNDS) as SoundName[]).map((name) => (
              <button
                key={name}
                type="button"
                title="Tocar para ouvir"
                onClick={() => {
                  write(CHOICE_KEY, name);
                  void playSound(name).catch(() => {});
                }}
                aria-pressed={soundName === name}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-bold",
                  soundName === name ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
                )}
              >
                <Volume2 className="size-4" aria-hidden="true" />
                {SOUNDS[name].label}
              </button>
            ))}
        </div>
      </div>

      {mode === "pc" ? (
        <div className="flex flex-col gap-2 rounded-control border border-line bg-surface-2 p-4 text-sm">
          <p className="font-bold">Para o papel sair sozinho, sem a janela de impressão:</p>
          <ol className="flex list-inside list-decimal flex-col gap-1 text-muted">
            <li>Deixe a impressora térmica como impressora padrão do Windows.</li>
            <li>Crie um atalho na área de trabalho com o comando abaixo e abra o painel por ele.</li>
            <li>
              Para o atalho ficar com a logo do MenuFácil no lugar da do Chrome: baixe o ícone, clique com o botão direito no atalho, vá em
              Propriedades, Alterar ícone, Procurar, e escolha o arquivo baixado.
            </li>
            <li>Deixe esta tela de pedidos aberta enquanto o restaurante estiver funcionando.</li>
          </ol>
          <code className="overflow-x-auto rounded bg-bg px-3 py-2 font-mono text-xs break-all whitespace-pre-wrap">{shortcut}</code>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={shortcut} label="Copiar o comando" copiedLabel="Comando copiado!" variant="secondary" size="sm" />
            <a href="/menufacil.ico" download className={buttonClasses("ghost", "sm")}>
              <Download className="size-4" aria-hidden="true" />
              Baixar o ícone
            </a>
          </div>
          <p className="text-muted">Sem esse atalho, o Chrome abre a janela de confirmação a cada pedido, como acontece em qualquer site.</p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          {mode === "celular"
            ? "Deixe esta página aberta e o app RawBT instalado, com a impressora pareada."
            : "Com o painel aberto, o pedido novo pode sair sozinho na impressora térmica."}
        </p>
      )}

      <div ref={frames} aria-hidden="true" />
    </div>
  );
}
