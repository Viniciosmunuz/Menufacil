"use client";

import { Printer } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/cn";

// O painel aberto dentro do aplicativo do Menu Fácil (Windows). O
// aplicativo põe um objeto na janela; encontrando ele, o painel passa a
// imprimir direto na impressora escolhida, sem janela de confirmação, e
// ganha os ajustes que só existem no computador.
//
// No navegador nada disso aparece: o objeto não existe e o painel se
// comporta como sempre.

export type ViaParaImprimir = { texto: string; dados?: unknown; papel?: number; numero?: number };

type EstadoDoApp = {
  versao: string;
  computador: string;
  impressora: string | null;
  escpos: boolean;
  papel: number;
  manterAcordado: boolean;
  comWindows: boolean;
};

type PonteDoApp = {
  desktop: true;
  estado: () => Promise<EstadoDoApp>;
  impressoras: () => Promise<{ lista: { nome: string }[]; padrao?: string | null; erro?: string }>;
  definirImpressora: (nome: string) => Promise<{ ok?: boolean; erro?: string }>;
  definirEscpos: (ligado: boolean) => Promise<{ ok?: boolean; erro?: string }>;
  definirAcordado: (ligado: boolean) => Promise<{ ok?: boolean }>;
  abrirComWindows: (ligado: boolean) => Promise<{ ok?: boolean }>;
  imprimir: (via: ViaParaImprimir) => Promise<{ ok?: boolean; erro?: string; impressora?: string }>;
  imprimirTeste: () => Promise<{ ok?: boolean; erro?: string }>;
  abrirLogs: () => Promise<unknown>;
};

declare global {
  interface Window {
    menuFacilApp?: PonteDoApp;
  }
}

// O que o aplicativo respondeu por último. Fica fora do React porque não
// muda por conta própria: só quando alguém mexe num ajuste ou abre a gaveta.
type Cache = { estado: EstadoDoApp | null; impressoras: { nome: string }[]; padrao: string | null };
let cache: Cache = { estado: null, impressoras: [], padrao: null };
const ouvintes = new Set<() => void>();

function assinar(callback: () => void) {
  ouvintes.add(callback);
  return () => ouvintes.delete(callback);
}

const ponte = () => (typeof window === "undefined" ? null : (window.menuFacilApp ?? null));

/** pergunta ao aplicativo como estão as coisas (impressora, ajustes) */
export async function carregarDoApp() {
  const app = ponte();
  if (!app) return;
  const [estado, impressoras] = await Promise.all([app.estado(), app.impressoras()]);
  cache = { estado, impressoras: impressoras.lista ?? [], padrao: impressoras.padrao ?? null };
  for (const avisa of ouvintes) avisa();
}

/**
 * A ponte com o aplicativo. Devolve null no navegador — e no servidor,
 * para a primeira pintura da página não brigar com a do navegador.
 */
export function useDesktopApp() {
  const app = useSyncExternalStore(assinar, ponte, () => null);
  const dados = useSyncExternalStore(
    assinar,
    () => cache,
    () => cache,
  );
  return { app, estado: dados.estado, impressoras: dados.impressoras, padrao: dados.padrao, recarregar: carregarDoApp };
}

export function DesktopPrinterSettings({
  app,
  estado,
  impressoras,
  padrao,
}: {
  app: PonteDoApp;
  estado: EstadoDoApp | null;
  impressoras: { nome: string }[];
  padrao: string | null;
}) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [testando, setTestando] = useState(false);

  async function testar() {
    setTestando(true);
    const r = await app.imprimirTeste();
    setTestando(false);
    setAviso(r.erro ?? "Via de teste enviada para a impressora.");
  }

  return (
    <div className="flex flex-col gap-4 rounded-control border border-line bg-surface-2 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">Impressão neste computador</p>
        {estado && <span className="text-xs text-muted">Menu Fácil {estado.versao}</span>}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="font-bold">Impressora</span>
        <select
          value={estado?.impressora ?? ""}
          onChange={async (e) => {
            await app.definirImpressora(e.target.value);
            await carregarDoApp();
          }}
          className="h-11 rounded-control border border-line bg-surface px-3 text-base text-ink focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
        >
          <option value="">Padrão do Windows{padrao ? ` (${padrao})` : ""}</option>
          {impressoras.map((i) => (
            <option key={i.nome} value={i.nome}>
              {i.nome}
            </option>
          ))}
        </select>
        <span className="text-muted">O pedido novo sai nela sozinho, sem janela de confirmação.</span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => void testar()} disabled={testando}>
          <Printer className="size-4" aria-hidden="true" />
          {testando ? "Enviando..." : "Imprimir teste"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void app.abrirLogs()}>
          Ver registros
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Checkbox
          checked={!!estado?.escpos}
          onChange={async (e) => {
            const r = await app.definirEscpos(e.target.checked);
            if (r.erro) setAviso(r.erro);
            await carregarDoApp();
          }}
          label="Modo térmica (ESC/POS)"
          hint="Número do pedido maior, total em negrito e corte automático."
        />
        <Checkbox
          checked={!!estado?.manterAcordado}
          onChange={async (e) => {
            await app.definirAcordado(e.target.checked);
            await carregarDoApp();
          }}
          label="Não deixar o computador dormir"
          hint="Enquanto o Menu Fácil estiver aberto."
        />
        <Checkbox
          checked={!!estado?.comWindows}
          onChange={async (e) => {
            await app.abrirComWindows(e.target.checked);
            await carregarDoApp();
          }}
          label="Abrir junto com o Windows"
          hint="Volta sozinho depois de reiniciar."
        />
      </div>

      {aviso && <p className={cn("font-bold", aviso.includes("enviada") ? "text-success" : "text-danger")}>{aviso}</p>}
    </div>
  );
}
