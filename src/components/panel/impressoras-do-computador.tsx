"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";

import { desligarImpressoraExtra, ligarImpressoraExtra, verImpressorasExtras } from "@/app/painel/[restaurantId]/impressora-do-app";
import { SwitchButton } from "@/components/ui/switch-button";

import { IMPRESSORAS_MUDARAM } from "./impressao-do-salao";

// As impressoras deste computador, para o salão.
//
// A do caixa é a escolhida nos ajustes do Menu Fácil PC e já está ligada.
// As outras aparecem aqui com uma chave: ligada, ela vira mais uma
// impressora na lista de baixo, e o dono escolhe que seção sai nela (a
// bebida no bar, o prato na cozinha).
//
// Só existe dentro do programa do Windows -- no navegador não há como
// saber que impressoras o computador tem.

/** a versão do programa que sabe mandar cada via para uma impressora */
const VERSAO_COM_DUAS = [1, 4, 0];

function sabeDuas(versao: string) {
  const v = versao.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((v[i] ?? 0) !== VERSAO_COM_DUAS[i]) return (v[i] ?? 0) > VERSAO_COM_DUAS[i];
  }
  return true;
}

type Leitura = {
  computador: string;
  doCaixa: string | null;
  versao: string;
  outras: string[];
  ligadas: { id: string; printerName: string | null }[];
};

export function ImpressorasDoComputador({ restaurantId }: { restaurantId: string }) {
  const [lido, setLido] = useState<Leitura | null>(null);
  const [vez, setVez] = useState(0);

  useEffect(() => {
    const app = window.menuFacilApp;
    if (!app) return;
    let vivo = true;
    void (async () => {
      const [estado, lista] = await Promise.all([app.estado(), app.impressoras()]);
      const ligadas = await verImpressorasExtras(restaurantId, estado.computador);
      if (!vivo) return;
      setLido({
        computador: estado.computador,
        doCaixa: estado.impressora,
        versao: estado.versao,
        outras: (lista.lista ?? []).map((i) => i.nome).filter((n) => n !== estado.impressora),
        ligadas,
      });
    })();
    return () => {
      vivo = false;
    };
  }, [restaurantId, vez]);

  if (!lido) return null;

  const novo = sabeDuas(lido.versao);

  return (
    <div className="flex flex-col gap-3 rounded-control border border-line p-4">
      <p className="font-bold">Impressoras deste computador</p>

      <p className="flex items-center gap-2 text-sm">
        <Printer className="size-4 shrink-0 text-brand" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-semibold">{lido.doCaixa ?? "Padrão do Windows"}</span>
        <span className="shrink-0 text-xs font-bold text-success">Caixa · ligada</span>
      </p>

      {lido.outras.length === 0 ? (
        <p className="text-sm text-muted">O Windows não mostra outra impressora instalada neste computador.</p>
      ) : !novo ? (
        <p className="rounded-control bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
          Para usar mais de uma impressora, o Menu Fácil PC precisa da versão nova (1.4.0). Ela baixa sozinha: feche o programa pela bandeja
          do Windows e abra de novo.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {lido.outras.map((nome) => {
            const ligada = lido.ligadas.find((l) => l.printerName === nome);
            return (
              <li key={nome} className="flex items-center gap-3 py-1.5">
                <Printer className="size-4 shrink-0 text-faint" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm">{nome}</span>
                <form
                  action={async () => {
                    if (ligada) await desligarImpressoraExtra(restaurantId, lido.computador, ligada.id);
                    else await ligarImpressoraExtra(restaurantId, lido.computador, nome);
                    window.dispatchEvent(new Event(IMPRESSORAS_MUDARAM));
                    setVez((v) => v + 1);
                  }}
                >
                  <SwitchButton checked={Boolean(ligada)} label={ligada ? "No salão" : "Desligada"} />
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
