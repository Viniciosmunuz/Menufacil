"use client";

import { Bell, BellOff, Check, ChevronDown, Download, Printer, ReceiptText, Smartphone, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/cn";

import { StepButton, type StatusNotice } from "./step-button";

// Impressão automática dos pedidos novos, para quem deixa o painel aberto:
// - "pc": abre a via num quadro invisível e manda imprimir. Com o Chrome
//   aberto em modo de impressão direta (--kiosk-printing), sai na impressora
//   padrão sem janela nenhuma.
// - "celular": entrega o texto ao RawBT, o app que fala com a térmica por
//   Bluetooth ou rede.
// O navegador não conta se o papel saiu, então cada pedido novo também
// aparece num aviso na tela, com o botão de aceitar (que abre o WhatsApp
// do cliente com o aviso) e o de imprimir de novo.
// Nada disso depende do WhatsApp: o pedido já está no sistema quando o
// cliente confirma.

type Mode = "off" | "pc" | "celular";

type Order = {
  id: string;
  number: number;
  createdAt: string;
  status: string;
  /** o próximo passo, quando ele é aceitar o pedido */
  accept: { to: string; label: string } | null;
  /** aviso pronto para o cliente, aberto junto com o aceite */
  notify: StatusNotice | null;
};

const MODE_KEY = "mf_impressao";
const SOUND_KEY = "mf_som_pedido";
const CHOICE_KEY = "mf_som_escolha";
const PRINTED_KEY = "mf_pedidos_impressos";
const SEEN_KEY = "mf_pedidos_vistos";
const SINCE_KEY = "mf_impressao_desde";
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

export function PrintSettings({
  base,
  panelUrl,
  restaurantId,
  orders,
  acceptAction,
}: {
  base: string;
  panelUrl: string;
  restaurantId: string;
  orders: Order[];
  acceptAction: (formData: FormData) => Promise<void>;
}) {
  const savedMode = useStored(MODE_KEY);
  const savedSound = useStored(SOUND_KEY);
  const savedChoice = useStored(CHOICE_KEY);
  const savedSeen = useStored(SEEN_KEY);
  const savedSince = useStored(SINCE_KEY);
  const frames = useRef<HTMLDivElement>(null);
  const soundBox = useRef<HTMLDivElement>(null);
  const [pickingSound, setPickingSound] = useState(false);

  const mode: Mode = savedMode === "pc" || savedMode === "celular" ? savedMode : "off";
  const sound = savedSound === "1";
  const soundName: SoundName = isSound(savedChoice) ? savedChoice : "sino";
  const since = Number(savedSince ?? 0);
  const fresh = orders.filter((o) => new Date(o.createdAt).getTime() >= since);
  // chegaram com o painel aberto e ainda esperam o restaurante aceitar
  const seen = idList(savedSeen);
  const pending = fresh.filter((o) => o.accept && !seen.includes(o.id));

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
    remember(
      PRINTED_KEY,
      novos.map((o) => o.id),
      read(PRINTED_KEY),
    );
    // sendToPrinter acompanha o modo e o endereço, que já estão nas dependências
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh, mode, sound, soundName, base]);

  // com a impressão ligada, segura a tela acesa: aba congelada não imprime
  useEffect(() => {
    if (mode === "off" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const hold = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // bateria fraca ou aba escondida: o navegador recusa, e tudo bem
      }
    };
    void hold();
    const onVisible = () => {
      if (document.visibilityState === "visible") void hold();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, [mode]);

  // gaveta do som: some ao escolher e ao tocar em qualquer outro lugar
  useEffect(() => {
    if (!pickingSound) return;
    const outside = (event: PointerEvent) => {
      if (!soundBox.current?.contains(event.target as Node)) setPickingSound(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [pickingSound]);

  /** tocar de novo no que está ligado desliga: sem nenhum marcado, não imprime */
  const option = (value: "pc" | "celular", label: string, Icon: typeof Printer) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => {
        write(MODE_KEY, mode === value ? "off" : value);
        startNow();
        remember(
          SEEN_KEY,
          orders.map((o) => o.id),
          read(SEEN_KEY),
        );
        remember(
          PRINTED_KEY,
          orders.map((o) => o.id),
          read(PRINTED_KEY),
        );
      }}
      aria-pressed={mode === value}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full border",
        mode === value ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );

  const shortcut = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app=${panelUrl}`;

  return (
    <>
      {/* avisos sobrepostos, no canto: não empurram a tela para baixo */}
      {pending.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96"
        >
          {pending.slice(0, 3).map((order) => (
            <div key={order.id} className="flex flex-col gap-2 rounded-card border border-brand/60 bg-surface p-4 shadow-2xl shadow-black/50">
              <p className="flex items-center gap-2 font-extrabold text-brand">
                <ReceiptText className="size-5 shrink-0" aria-hidden="true" />
                Pedido #{order.number} chegou agora
              </p>
              <p className="text-sm text-ink/90">
                {mode === "off"
                  ? "Confira o pedido e aceite: o WhatsApp abre com o aviso para o cliente."
                  : "A via foi enviada para a impressora. Ao aceitar, o WhatsApp abre com o aviso para o cliente."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <form action={acceptAction}>
                  <input type="hidden" name="restaurantId" value={restaurantId} />
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="from" value={order.status} />
                  <input type="hidden" name="to" value={order.accept?.to ?? ""} />
                  <StepButton label={order.accept?.label ?? "Aceitar pedido"} notify={order.notify} size="sm" />
                </form>
                {mode !== "off" && (
                  <Button size="sm" variant="secondary" onClick={() => sendToPrinter(order.id)}>
                    <Printer className="size-4" aria-hidden="true" />
                    Imprimir de novo
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remember(SEEN_KEY, [order.id], read(SEEN_KEY))}>
                  Depois
                </Button>
              </div>
            </div>
          ))}
          {pending.length > 3 && (
            <p className="rounded-card border border-line bg-surface px-4 py-2 text-center text-sm font-bold text-muted shadow-xl">
              e mais {pending.length - 3} {pending.length - 3 === 1 ? "pedido esperando" : "pedidos esperando"}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <p className="mr-1 text-sm font-extrabold">Imprimir:</p>
          {option("pc", "Imprimir neste computador", Printer)}
          {option("celular", "Imprimir neste celular (RawBT)", Smartphone)}

          <div ref={soundBox} className="relative ml-auto flex items-center">
            <button
              type="button"
              title={sound ? "Desligar o som de pedido novo" : "Ligar o som de pedido novo"}
              aria-label={sound ? "Desligar o som de pedido novo" : "Ligar o som de pedido novo"}
              onClick={() => {
                const next = !sound;
                write(SOUND_KEY, next ? "1" : "0");
                // o toque no botão é o que libera o som no navegador
                if (next) void playSound(soundName).catch(() => {});
              }}
              aria-pressed={sound}
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-l-full border border-r-0",
                sound ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
              )}
            >
              {sound ? <Bell className="size-5" aria-hidden="true" /> : <BellOff className="size-5" aria-hidden="true" />}
            </button>
            <button
              type="button"
              title="Escolher o som"
              aria-label="Escolher o som"
              aria-expanded={pickingSound}
              onClick={() => setPickingSound((open) => !open)}
              className={cn(
                "grid h-10 w-8 shrink-0 place-items-center rounded-r-full border",
                sound ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
              )}
            >
              <ChevronDown className={cn("size-4 transition-transform duration-200", pickingSound && "rotate-180")} aria-hidden="true" />
            </button>

            {pickingSound && (
              <div className="absolute top-full right-0 z-20 mt-2 w-48 overflow-hidden rounded-control border border-line bg-surface shadow-2xl shadow-black/50">
                {(Object.keys(SOUNDS) as SoundName[]).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      write(CHOICE_KEY, name);
                      if (!sound) write(SOUND_KEY, "1");
                      void playSound(name).catch(() => {});
                      setPickingSound(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold hover:bg-surface-2",
                      soundName === name ? "text-brand" : "text-ink",
                    )}
                  >
                    <Volume2 className="size-4 shrink-0" aria-hidden="true" />
                    {SOUNDS[name].label}
                    {soundName === name && <Check className="ml-auto size-4" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
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
              <li>
              Deixe esta tela de pedidos aberta. Ela pode ficar atrás de outras janelas, mas minimizada o navegador segura as consultas e o pedido
              demora mais a sair.
            </li>
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
              ? "Deixe esta página aberta, com o RawBT instalado e a impressora pareada. Enquanto ela estiver na tela, o celular não apaga sozinho; se você trocar de app, os pedidos que chegarem saem assim que voltar."
              : "Toque na impressora ou no celular para o pedido novo sair sozinho no papel."}
          </p>
        )}

        <div ref={frames} aria-hidden="true" />
      </div>
    </>
  );
}
