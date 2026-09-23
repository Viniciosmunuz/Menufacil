"use client";

import { Bell, BellOff, Download, Printer, PrinterCheck, Smartphone, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/cn";

// Impressão automática dos pedidos novos, para quem deixa o painel aberto:
// - "pc": abre a via num quadro invisível e manda imprimir. Com o Chrome
//   aberto em modo de impressão direta (--kiosk-printing), sai na impressora
//   padrão sem janela nenhuma.
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
const SOUND_FILE = "/som-pedido.wav";

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

/** o que está salvo no aparelho, sem quebrar a primeira pintura no servidor */
const noop = () => () => {};

/** vale a partir de agora: os pedidos que já estão na tela não saem na impressora */
function startNow(ids: string[]) {
  write(SINCE_KEY, String(Date.now()));
  write(PRINTED_KEY, JSON.stringify(ids.slice(0, 200)));
}

export function PrintSettings({ base, panelUrl, orders }: { base: string; panelUrl: string; orders: { id: string; createdAt: string }[] }) {
  const savedMode = useSyncExternalStore(noop, () => read(MODE_KEY), () => null);
  const savedSound = useSyncExternalStore(noop, () => read(SOUND_KEY), () => null);
  // a escolha do momento vale na hora; o aparelho lembra dela na próxima visita
  const [chosenMode, setChosenMode] = useState<Mode | null>(null);
  const [chosenSound, setChosenSound] = useState<boolean | null>(null);
  const [blocked, setBlocked] = useState(false);
  const frames = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLAudioElement | null>(null);

  const mode: Mode = chosenMode ?? (savedMode === "pc" || savedMode === "celular" ? savedMode : "off");
  const sound = chosenSound ?? savedSound === "1";

  // o navegador só deixa tocar som depois de um toque na página: o botão do
  // som é esse toque, e o mesmo player serve para os avisos seguintes
  function ring() {
    const audio = (player.current ??= new Audio(SOUND_FILE));
    audio.currentTime = 0;
    audio.volume = 1;
    audio
      .play()
      .then(() => setBlocked(false))
      .catch(() => setBlocked(true));
  }

  useEffect(() => {
    const since = Number(read(SINCE_KEY) ?? 0);
    const done = printedIds();
    // só o que chegou depois de ligar: a fila antiga não sai toda de uma vez
    const novos = orders.filter((o) => !done.includes(o.id) && new Date(o.createdAt).getTime() >= since);
    if (novos.length === 0) return;

    if (sound) ring();

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
    if (next) ring(); // o toque no botão é o que libera o som no navegador
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

  const shortcut = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app=${panelUrl}`;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 text-sm font-extrabold">Imprimir pedido novo:</p>
        {option("off", "Não imprimir", PrinterCheck)}
        {option("pc", "Neste computador", Printer)}
        {option("celular", "Neste celular (RawBT)", Smartphone)}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold",
              sound ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:text-ink",
            )}
          >
            {sound ? <Bell className="size-4" aria-hidden="true" /> : <BellOff className="size-4" aria-hidden="true" />}
            {sound ? "Som ligado" : "Som desligado"}
          </button>
          {sound && (
            <Button size="sm" variant="ghost" onClick={ring}>
              <Volume2 className="size-4" aria-hidden="true" />
              Testar som
            </Button>
          )}
        </div>
      </div>

      {blocked && (
        <p className="text-sm font-bold text-warning">
          O navegador bloqueou o som. Toque em “Testar som” uma vez para liberar, e deixe esta aba aberta.
        </p>
      )}

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
