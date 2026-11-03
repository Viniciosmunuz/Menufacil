"use client";

import { Check, ChevronDown, Circle, Moon, PauseCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { DisponibilidadeEntregador } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";

import { mudarDisponibilidade } from "./actions";

// A chave de disponibilidade, no topo de todas as telas dele.
//
// Fica à vista de propósito: é a única coisa que o entregador precisa
// lembrar de mexer, e esquecer ligada é receber pedido no meio do almoço.
//
// Três estados, e não um liga-desliga: "em pausa" é diferente de
// "indisponível" para quem está no balcão olhando -- um volta daqui a
// pouco, o outro foi embora.

const ESTADOS = [
  { chave: "DISPONIVEL", nome: "Disponível", resumo: "Você está recebendo pedidos.", icone: Circle, cor: "text-success" },
  { chave: "PAUSA", nome: "Em pausa", resumo: "Uma parada rápida. O balcão vê que você volta.", icone: PauseCircle, cor: "text-warning" },
  { chave: "INDISPONIVEL", nome: "Indisponível", resumo: "Fora do ar. Não recebe pedido.", icone: Moon, cor: "text-muted" },
] as const satisfies readonly { chave: DisponibilidadeEntregador; nome: string; resumo: string; icone: typeof Circle; cor: string }[];

export function ChaveDeDisponibilidade({ atual }: { atual: DisponibilidadeEntregador }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const escolhido = ESTADOS.find((e) => e.chave === atual) ?? ESTADOS[2];
  const Icone = escolhido.icone;

  // tocar fora fecha: é um menuzinho, não uma tela
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  return (
    <div ref={caixa} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className={cn(
          "flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-extrabold",
          atual === "DISPONIVEL" ? "border-success/40 bg-success/10 text-success" : "border-line text-muted",
        )}
      >
        <Icone className={cn("size-3.5", atual === "DISPONIVEL" && "fill-current")} aria-hidden="true" />
        {escolhido.nome}
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-card border border-line bg-surface shadow-2xl shadow-black/20">
          {ESTADOS.map((e) => {
            const EIcone = e.icone;
            const aceso = e.chave === atual;
            return (
              <form key={e.chave} action={mudarDisponibilidade} onSubmit={() => setAberto(false)}>
                <input type="hidden" name="disponibilidade" value={e.chave} />
                <button
                  type="submit"
                  className="flex w-full items-start gap-3 border-b border-line/70 px-4 py-3 text-left last:border-0 hover:bg-surface-2/60"
                >
                  <EIcone className={cn("mt-0.5 size-5 shrink-0", e.cor)} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{e.nome}</span>
                    <span className="block text-sm text-muted">{e.resumo}</span>
                  </span>
                  {aceso && <Check className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />}
                </button>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}
